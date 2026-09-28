import { describe, it, expect } from 'vitest'
import { AxiosError } from 'axios'
import { decodeJwt, isJwtExpired } from '@/lib/jwt'
import { apiError, apiErrorBody } from '@/services/client'
import { dateState, isRowResolved, latestUploads, periodDates, validationBlocker } from '@/lib/timecard'
import { createTimecardJobSchema, uploadDocumentSchema } from '@/schemas/timecard'
import type { UploadedDocument } from '@/types/timecard'

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const jwt = (claims: object) => `x.${b64(claims)}.sig`

const axiosErr = (status: number, data: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status, statusText: '', data, headers: {}, config: {} as never,
  })

describe('jwt', () => {
  it('decodes the backend claims and detects expiry', () => {
    const future = Math.floor(Date.now() / 1000) + 3600
    const claims = decodeJwt(jwt({ sub: 'u1', orgId: 'o1', exp: future }))
    expect(claims).toMatchObject({ sub: 'u1', orgId: 'o1' })
    expect(isJwtExpired(claims)).toBe(false)
    expect(isJwtExpired(decodeJwt(jwt({ sub: 'u1', orgId: 'o1', exp: 1 })))).toBe(true)
  })
  it('rejects garbage', () => {
    expect(decodeJwt('nope')).toBeNull()
    expect(decodeJwt(jwt({ foo: 1 }))).toBeNull()
    expect(isJwtExpired(null)).toBe(true)
  })
})

describe('apiError', () => {
  it('reads the NestJS error envelope, including validation fields', () => {
    const e = axiosErr(400, { error: { code: 'BAD_REQUEST', message: 'Validation failed', fields: ['email must be an email'] } })
    expect(apiError(e)).toBe('Validation failed: email must be an email')
  })
  it('exposes extra fields like blockingRows', () => {
    const e = axiosErr(409, { error: { code: 'CONFLICT', message: 'Cannot submit: 1 row(s) are unresolved', blockingRows: [{ id: 'r1', validationStatus: 'X' }] } })
    expect(apiError(e)).toBe('Cannot submit: 1 row(s) are unresolved')
    expect(apiErrorBody(e)?.blockingRows).toHaveLength(1)
  })
  it('still reads the mock `{ error: string }` shape and falls back sensibly', () => {
    expect(apiError(axiosErr(404, { error: 'Job not found' }))).toBe('Job not found')
    expect(apiError(axiosErr(403, {}))).toMatch(/permission/)
    expect(apiError(axiosErr(502, 'Bad gateway'))).toMatch(/server/)
    expect(apiError(new AxiosError('Network Error', 'ERR_NETWORK'))).toMatch(/reach the server/)
  })
})

describe('timecard helpers', () => {
  it('lists every date of the period (UTC, inclusive)', () => {
    expect(periodDates({ periodStart: '2026-07-05T00:00:00.000Z', periodEnd: '2026-07-07T00:00:00.000Z' })).toEqual([
      '2026-07-05', '2026-07-06', '2026-07-07',
    ])
  })
  it('treats a row as resolved when good or overridden (backend submit rule)', () => {
    expect(isRowResolved({ validationStatus: 'GOOD_NO_ERROR', overriddenAt: null })).toBe(true)
    expect(isRowResolved({ validationStatus: 'LOGIN_TIME_DIFFERENCE', overriddenAt: '2026-07-01' })).toBe(true)
    expect(isRowResolved({ validationStatus: 'LOGIN_TIME_DIFFERENCE', overriddenAt: null })).toBe(false)
  })
  it('maps date approvals, including a rejected date (reset to IN_PROGRESS with comments)', () => {
    const base = { id: 'a', jobId: 'j', date: '2026-07-05', submittedById: null, submittedAt: null, decidedById: null, decidedAt: null }
    expect(dateState(undefined)).toBe('NOT_SUBMITTED')
    expect(dateState({ ...base, status: 'SENT_FOR_APPROVAL', rejectionComments: null })).toBe('SENT_FOR_APPROVAL')
    expect(dateState({ ...base, status: 'IN_PROGRESS', rejectionComments: 'fix breaks' })).toBe('IN_PROGRESS')
  })
  it('keeps only the newest upload per type+date and explains what blocks validation', () => {
    const doc = (docType: UploadedDocument['docType'], version: number, date: string | null = null) =>
      ({ id: `${docType}${version}${date}`, docType, version, date }) as UploadedDocument
    const docs = [doc('PAYROLL_TIMECARD', 1), doc('PAYROLL_TIMECARD', 2), doc('AMAZON_ACTIVITY', 1, '2026-07-05T00:00:00.000Z')]
    expect(latestUploads(docs).map((d) => d.version).sort()).toEqual([1, 2])
    expect(validationBlocker([])).toMatch(/payroll/)
    expect(validationBlocker([doc('PAYROLL_TIMECARD', 1)])).toMatch(/itinerary/)
    expect(validationBlocker(docs)).toBeNull()
  })
})

describe('schemas', () => {
  it('enforces the backend date ordering for new jobs', () => {
    const ok = { frequency: 'WEEKLY', periodStart: '2026-07-05', periodEnd: '2026-07-11', processDate: '2026-07-14' } as const
    expect(createTimecardJobSchema.safeParse(ok).success).toBe(true)
    const bad = createTimecardJobSchema.safeParse({ ...ok, processDate: '2026-07-10' })
    expect(bad.success).toBe(false)
    expect(bad.error?.issues[0].path).toEqual(['processDate'])
  })
  it('requires a date for Amazon itinerary uploads and checks the file type', () => {
    const xlsx = new File(['x'], 'itin.xlsx')
    expect(uploadDocumentSchema.safeParse({ docType: 'AMAZON_ACTIVITY', file: xlsx }).success).toBe(false)
    expect(uploadDocumentSchema.safeParse({ docType: 'AMAZON_ACTIVITY', file: xlsx, date: '2026-07-05' }).success).toBe(true)
    expect(uploadDocumentSchema.safeParse({ docType: 'AMAZON_BREAK', file: xlsx }).success).toBe(false) // must be .csv
  })
})
