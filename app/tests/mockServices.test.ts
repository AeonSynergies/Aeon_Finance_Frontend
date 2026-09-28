import { describe, it, expect } from 'vitest'
import { jobsService } from '@/services/jobs.service'
import { analyticsService } from '@/services/analytics.service'
import { reportsService } from '@/services/reports.service'

describe('mock services', () => {
  it('serves jobs, rows and analytics from mock data', async () => {
    const tc = await jobsService.list({ module: 'TIMECARD' })
    expect(tc.length).toBeGreaterThan(0)
    const rows = await jobsService.rows(tc[0].id, 'timecard')
    expect(rows.length).toBeGreaterThan(0)
    expect(() => JSON.parse(rows[0].data)).not.toThrow()
    expect(await analyticsService.payroll()).toBeTruthy()
    expect((await reportsService.download('payroll-summary')).blob.size).toBeGreaterThan(0)
  })

  it('create → row edit → delete round-trips in memory', async () => {
    const job = await jobsService.create({ module: 'RENTAL', frequency: 'weekly', periodStart: '2026-10-05', periodEnd: '2026-10-11', processDate: '2026-10-13' })
    expect(job.jobId).toMatch(/^RN-2026-W\d\d$/)
    const row = await jobsService.createRow(job.id, { rowType: 'rental', data: { VIN: 'X' } })
    const edited = await jobsService.updateRow(job.id, row.id, { data: { Rate: 10 }, approvalStatus: 'APPROVED' })
    expect(JSON.parse(edited.data)).toEqual({ VIN: 'X', Rate: 10 })
    await jobsService.lock(job.id)
    await expect(jobsService.remove(job.id)).rejects.toBeTruthy() // locked jobs can't be deleted
  })
})
