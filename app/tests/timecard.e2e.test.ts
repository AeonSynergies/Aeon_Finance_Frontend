// @vitest-environment node
// End-to-end check of the timecard services against a running NestJS backend.
// Opt-in: TIMECARD_E2E_URL=http://localhost:3000 npx vitest run app/tests/timecard.e2e.test.ts
// Needs the backend's dev seed users (executive@ / manager@aeon.dev, password123). Creates data.
import { describe, it, expect, beforeAll } from 'vitest'
import * as XLSX from 'xlsx'
import { api, apiError, apiErrorBody, apiStatus } from '@/services/client'
import { authService } from '@/services/auth.service'
import { timecardService as tc } from '@/services/timecard.service'
import { useAuthStore } from '@/stores/auth'
import { isRowResolved } from '@/lib/timecard'

const URL = process.env.TIMECARD_E2E_URL

const xlsxFile = (name: string, rows: unknown[][]) => {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], name)
}

async function signIn(email: string) {
  const { token, user } = await authService.login({ email, password: 'password123' })
  useAuthStore.getState().login(token, user)
  return user
}

describe.skipIf(!URL)('timecard API (live backend)', () => {
  // A random far-future day so re-runs don't collide on the generated jobId.
  const day = new Date(Date.UTC(2040 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)))
    .toISOString()
    .slice(0, 10)
  let jobId = ''

  beforeAll(() => {
    api.defaults.baseURL = URL
    api.defaults.adapter = 'http' // node: no browser CORS
  })

  it('auth: rejects bad credentials; login returns the role and its permissions', async () => {
    const bad = await authService.login({ email: 'executive@aeon.dev', password: 'wrong' }).catch((e) => e)
    expect(apiStatus(bad)).toBe(401)
    expect(apiError(bad)).toBe('Invalid email or password')
    const user = await signIn('executive@aeon.dev')
    expect(user.role).toBe('Executive')
    expect(user.permissions.APPROVALS).toEqual({ read: true, write: true, edit: false })
  })

  it('jobs: create, duplicate → 409, list includes it', async () => {
    const job = await tc.createJob({ frequency: 'DAILY', periodStart: day, periodEnd: day, processDate: day })
    jobId = job.id
    expect(job.status).toBe('DRAFT_INPROGRESS')
    const dup = await tc.createJob({ frequency: 'DAILY', periodStart: day, periodEnd: day, processDate: day }).catch((e) => e)
    expect(apiStatus(dup)).toBe(409)
    expect((await tc.listJobs()).some((j) => j.id === jobId)).toBe(true)
  })

  it('validate before uploads → 400 with a clear message', async () => {
    const e = await tc.validate(jobId).catch((x) => x)
    expect(apiStatus(e)).toBe(400)
    expect(apiError(e)).toMatch(/Payroll Export/)
  })

  it('uploads: itinerary needs a date; payroll + itinerary parse; identical re-upload is a no-op', async () => {
    const payroll = xlsxFile('payroll.xlsx', [
      ['Payroll Name', 'Pay Date', 'Time In', 'Time Out', 'Earnings Code'],
      ['Alice Driver', day, '7:00 AM', '11:30 AM', 'REG'],
      ['Alice Driver', day, '12:00 PM', '5:30 PM', 'REG'],
      ['Bob Driver', day, '9:00 AM', '6:00 PM', 'REG'],
    ])
    const doc = await tc.upload(jobId, { file: payroll, docType: 'PAYROLL_TIMECARD' })
    expect(doc.rowCount).toBe(2)
    expect((await tc.upload(jobId, { file: payroll, docType: 'PAYROLL_TIMECARD' })).id).toBe(doc.id)

    const itinerary = xlsxFile('itinerary.xlsx', [
      ['Driver name', 'App sign in', 'App sign out', 'Last stop execution time'],
      ['Alice Driver', '7:02 AM', '5:25 PM', '5:10 PM'],
      ['Bob Driver', '7:30 AM', '6:05 PM', '5:50 PM'],
    ])
    const noDate = await tc.upload(jobId, { file: itinerary, docType: 'AMAZON_ACTIVITY' }).catch((e) => e)
    expect(apiStatus(noDate)).toBe(400)
    await tc.upload(jobId, { file: itinerary, docType: 'AMAZON_ACTIVITY', date: day })
    expect((await tc.listUploads(jobId)).length).toBe(2)
  })

  it('validate → rows; submit is blocked (409 + blockingRows) until rows are overridden', async () => {
    const rows = await tc.validate(jobId)
    expect(rows.length).toBe(2)
    const listed = await tc.listRows(jobId, { date: day })
    expect(listed.length).toBe(2)

    const open = listed.filter((r) => !isRowResolved(r))
    if (open.length) {
      const blocked = await tc.submitDate(jobId, day).catch((e) => e)
      expect(apiStatus(blocked)).toBe(409)
      expect((apiErrorBody(blocked)?.blockingRows as unknown[]).length).toBe(open.length)
      for (const r of open) {
        const o = await tc.overrideRow(jobId, r.id, { newStatus: 'GOOD_NO_ERROR', reason: 'Verified with dispatch' })
        expect(o.overriddenAt).toBeTruthy()
      }
    }
    const missingReason = await tc.overrideRow(jobId, listed[0].id, { newStatus: 'GOOD_NO_ERROR', reason: '' }).catch((e) => e)
    expect(apiStatus(missingReason)).toBe(400)

    const submitted = await tc.submitDate(jobId, day)
    expect(submitted.status).toBe('SENT_FOR_APPROVAL')
    expect((await tc.getJob(jobId)).status).toBe('SENT_FOR_APPROVAL')
  })

  it('roles: executive cannot approve (403); manager rejects, executive resubmits, manager approves + locks', async () => {
    expect(apiStatus(await tc.approveDate(jobId, day).catch((e) => e))).toBe(403)

    await signIn('manager@aeon.dev')
    const rejected = await tc.rejectDate(jobId, day, 'Check Bob’s login')
    expect(rejected).toMatchObject({ status: 'IN_PROGRESS', rejectionComments: 'Check Bob’s login' })
    expect(apiStatus(await tc.lockJob(jobId).catch((e) => e))).toBe(409) // not approved yet

    await signIn('executive@aeon.dev')
    await tc.submitDate(jobId, day)

    await signIn('manager@aeon.dev')
    expect((await tc.approveDate(jobId, day)).status).toBe('APPROVED')
    expect((await tc.getJob(jobId)).status).toBe('APPROVED')
    expect((await tc.listRows(jobId)).every((r) => r.approvalStatus === 'APPROVED')).toBe(true)
    expect((await tc.lockJob(jobId)).status).toBe('LOCKED')
    expect(apiStatus(await tc.lockJob(jobId).catch((e) => e))).toBe(409)

    const actions = (await tc.listAudit(jobId)).map((a) => a.action)
    expect(actions).toEqual(expect.arrayContaining(['UPLOAD', 'SUBMIT', 'REJECT', 'APPROVE', 'LOCK']))
  })
})
