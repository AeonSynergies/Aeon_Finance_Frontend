import { api, mock, mockFail, unwrap, USE_MOCKS } from './client'
import { db, newId, now } from '@/mocks/store'
import { useAuthStore } from '@/stores/auth'
import type { Job, JobDocument, JobModule, JobStatus, ValidationRow } from '@/types'

export interface CreateJobInput {
  module: JobModule
  frequency: string
  periodStart: string
  periodEnd: string
  processDate: string
}

const PREFIX: Record<JobModule, string> = {
  TIMECARD: 'TC', ROUTE_REVENUE: 'RR', ROUTE_INVOICE: 'RI', RFS_AFS: 'FA',
  FLEET_REVENUE: 'FR', RENTAL: 'RN', REPAIR_MAINTENANCE: 'RM', INSURANCE: 'IN',
}

// ponytail: rough week number for mock job ids; the real API owns id generation.
const mockJobId = (module: JobModule, start: string) => {
  const d = new Date(start)
  const week = Math.ceil(((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7)
  const base = `${PREFIX[module]}-${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
  let id = base
  for (let n = 2; db.jobs.some((j) => j.jobId === id); n++) id = `${base}-${n}`
  return id
}

const findJob = (id: string) => db.jobs.find((j) => j.id === id)
const jobRows = (id: string, rowIds?: string[]) =>
  db.rows.filter((r) => r.jobId === id && (!rowIds?.length || rowIds.includes(r.id)))
const setJob = (id: string, status: JobStatus) => {
  const job = findJob(id)
  if (!job) return mockFail(404, 'Job not found')
  Object.assign(job, { status, updatedAt: now() })
  return mock(job)
}

export const jobsService = {
  list: (params: { module?: string; status?: string } = {}): Promise<Job[]> =>
    USE_MOCKS
      ? mock(db.jobs.filter((j) => (!params.module || j.module === params.module) && (!params.status || j.status === params.status)))
      : unwrap(api.get('/jobs', { params })),

  get: (id: string): Promise<Job> => {
    if (!USE_MOCKS) return unwrap(api.get(`/jobs/${id}`))
    const job = findJob(id)
    if (!job) return mockFail(404, 'Job not found')
    const _count = { documents: db.documents.filter((d) => d.jobId === id).length, validationRows: jobRows(id).length }
    return mock({ ...job, _count })
  },

  create: (body: CreateJobInput): Promise<Job> => {
    if (!USE_MOCKS) return unwrap(api.post('/jobs', body))
    const me = useAuthStore.getState().user
    const job: Job = {
      id: newId(), jobId: mockJobId(body.module, body.periodStart), module: body.module,
      frequency: body.frequency.toUpperCase(), periodStart: body.periodStart, periodEnd: body.periodEnd,
      processDate: body.processDate, status: 'DRAFT', createdBy: me?.id ?? '', createdAt: now(), updatedAt: now(),
      user: me ? { id: me.id, name: me.name, email: me.email } : undefined,
    }
    db.jobs.unshift(job)
    return mock(job)
  },

  update: (id: string, body: { status?: JobStatus }): Promise<Job> =>
    USE_MOCKS ? (body.status ? setJob(id, body.status) : mock(findJob(id)!)) : unwrap(api.patch(`/jobs/${id}`, body)),

  remove: (id: string): Promise<{ success: true }> => {
    if (!USE_MOCKS) return unwrap(api.delete(`/jobs/${id}`))
    if (findJob(id)?.status === 'LOCKED') return mockFail(400, 'Cannot delete a locked job. Locked jobs are permanent.')
    db.jobs = db.jobs.filter((j) => j.id !== id)
    db.rows = db.rows.filter((r) => r.jobId !== id)
    db.documents = db.documents.filter((d) => d.jobId !== id)
    return mock({ success: true as const })
  },

  submit: (id: string, body: { rowIds?: string[] } = {}) => {
    if (!USE_MOCKS) return unwrap(api.post(`/jobs/${id}/submit`, body))
    jobRows(id, body.rowIds).forEach((r) => Object.assign(r, { validationStatus: 'SENT_FOR_APPROVAL', submittedAt: now() }))
    return setJob(id, 'SENT_FOR_APPROVAL')
  },

  approve: (id: string, body: { notes?: string } = {}) => {
    if (!USE_MOCKS) return unwrap(api.post(`/jobs/${id}/approve`, body))
    jobRows(id).forEach((r) => Object.assign(r, { approvalStatus: 'APPROVED', approvedAt: now() }))
    return setJob(id, 'APPROVED')
  },

  reject: (id: string, body: { notes: string }) => {
    if (!USE_MOCKS) return unwrap(api.post(`/jobs/${id}/reject`, body))
    if (!body.notes) return mockFail(400, 'notes is required for rejection')
    jobRows(id).forEach((r) => Object.assign(r, { approvalStatus: 'REJECTED', approverNotes: body.notes }))
    return setJob(id, 'INPROGRESS')
  },

  lock: (id: string) => {
    if (!USE_MOCKS) return unwrap(api.post(`/jobs/${id}/lock`, {}))
    const pending = jobRows(id).filter((r) => r.approvalStatus !== 'APPROVED').length
    if (pending) return mockFail(400, `Cannot lock: ${pending} row(s) not yet approved.`)
    return setJob(id, 'LOCKED')
  },

  audit: (id: string) =>
    USE_MOCKS ? mock(db.auditEntries.filter((a) => a.jobId === id)) : unwrap(api.get(`/jobs/${id}/audit`)),

  disputes: (id: string): Promise<ValidationRow[]> =>
    USE_MOCKS
      ? mock(jobRows(id).filter((r) => r.disputeRequired || r.disputeStatus === 'NEED_DISPUTE'))
      : unwrap(api.get(`/jobs/${id}/disputes`)),

  payrollSummary: <T = unknown,>(id: string): Promise<T> => {
    if (!USE_MOCKS) return unwrap(api.get(`/jobs/${id}/payroll-summary`))
    const s = db.payrollSummaries[id]
    return s ? mock(s as T) : mockFail(404, 'Job not found')
  },

  documents: (id: string): Promise<JobDocument[]> =>
    USE_MOCKS ? mock(db.documents.filter((d) => d.jobId === id)) : unwrap(api.get(`/jobs/${id}/documents`)),

  createDocument: (id: string, body: Partial<JobDocument> & { docType: string }): Promise<JobDocument> => {
    if (!USE_MOCKS) return unwrap(api.post(`/jobs/${id}/documents`, body))
    const doc: JobDocument = {
      id: newId(), jobId: id, date: null, status: 'PENDING', fileName: null, fileSize: null, version: 1,
      uploadedBy: null, uploadedAt: null, createdAt: now(), ...body,
    }
    db.documents.push(doc)
    return mock(doc)
  },

  updateDocument: (id: string, docId: string, body: Partial<JobDocument>): Promise<JobDocument> => {
    if (!USE_MOCKS) return unwrap(api.patch(`/jobs/${id}/documents/${docId}`, body))
    const doc = db.documents.find((d) => d.id === docId && d.jobId === id)
    if (!doc) return mockFail(404, 'Document not found')
    Object.assign(doc, body, body.status === 'UPLOADED' ? { uploadedAt: now() } : {})
    return mock(doc)
  },

  rows: (id: string, rowType?: string): Promise<ValidationRow[]> =>
    USE_MOCKS
      ? mock(jobRows(id).filter((r) => !rowType || r.rowType === rowType))
      : unwrap(api.get(`/jobs/${id}/rows`, { params: { rowType } })),

  createRow: (id: string, body: { rowType: string; externalId?: string; date?: string; data: Record<string, unknown> }): Promise<ValidationRow> => {
    if (!USE_MOCKS) return unwrap(api.post(`/jobs/${id}/rows`, body))
    const row = {
      id: newId(), jobId: id, rowType: body.rowType, externalId: body.externalId ?? null, date: body.date ?? null,
      validationStatus: 'PENDING_VALIDATION', validationNotes: null, overrideNotes: null, approvalStatus: 'PENDING',
      approverNotes: null, disputeRequired: false, disputeNotes: null, disputeStatus: 'NO_DISPUTE',
      vendorDisputeStatus: 'YET_TO_DISPUTE', disputeValue: null, acceptedValue: null, rejectedValue: null,
      data: JSON.stringify(body.data), createdAt: now(), updatedAt: now(),
    } satisfies ValidationRow
    db.rows.push(row)
    return mock(row)
  },

  updateRow: (id: string, rowId: string, body: Partial<Omit<ValidationRow, 'data'>> & { data?: Record<string, unknown> }): Promise<ValidationRow> => {
    if (!USE_MOCKS) return unwrap(api.patch(`/jobs/${id}/rows/${rowId}`, body))
    const row = db.rows.find((r) => r.id === rowId && r.jobId === id)
    if (!row) return mockFail(404, 'Validation row not found')
    const { data, ...fields } = body
    Object.assign(row, fields, { updatedAt: now() })
    if (data) row.data = JSON.stringify({ ...JSON.parse(row.data), ...data })
    return mock(row)
  },

  overrideRow: (id: string, rowId: string, body: { notes: string; newStatus: string }) =>
    USE_MOCKS
      ? jobsService.updateRow(id, rowId, { validationStatus: body.newStatus as ValidationRow['validationStatus'], overrideNotes: body.notes })
      : unwrap(api.post(`/jobs/${id}/rows/${rowId}/override`, body)),

  bulkOverride: (id: string, body: { rowIds: string[]; notes: string; newStatus: string }) => {
    if (!USE_MOCKS) return unwrap(api.post(`/jobs/${id}/rows/bulk-override`, body))
    const rows = jobRows(id, body.rowIds)
    rows.forEach((r) => Object.assign(r, { validationStatus: body.newStatus, overrideNotes: body.notes, updatedAt: now() }))
    return mock({ success: true, count: rows.length })
  },

  uploadTimecard: (id: string, form: FormData) => {
    if (!USE_MOCKS) return unwrap(api.post(`/jobs/${id}/upload/timecard`, form))
    const tc = jobRows(id).filter((r) => r.rowType === 'timecard')
    const needReview = tc.filter((r) => r.validationStatus === 'NEED_MANUAL_VALIDATION').length
    return mock({
      summary: { total: tc.length, matched: tc.length - needReview, deliveryWorkers: tc.length, supportWorkers: 0, salaried: 0, exceptions: needReview, missingPayroll: 0 },
    })
  },
}
