import { api, unwrap } from './client'
import type {
  CreateTimecardJobInput,
  DateApproval,
  OverrideRowInput,
  TimecardAuditEntry,
  TimecardJob,
  TimecardRow,
  UploadDocType,
  UploadedDocument,
} from '@/types/timecard'

// NestJS timecard API (backend/src/{jobs,uploads,rows,approvals,audit}).
// Dates in paths/queries are plain `YYYY-MM-DD`.
const enc = encodeURIComponent

export const timecardService = {
  /* ── Jobs ── */
  listJobs: () => unwrap(api.get<TimecardJob[]>('/jobs')),
  getJob: (id: string) => unwrap(api.get<TimecardJob>(`/jobs/${enc(id)}`)),
  createJob: (body: CreateTimecardJobInput) => unwrap(api.post<TimecardJob>('/jobs', body)),
  /** MANAGER only; 409 unless every date in the period is approved. */
  lockJob: (id: string) => unwrap(api.post<TimecardJob>(`/jobs/${enc(id)}/lock`)),

  /* ── Uploads ── */
  listUploads: (jobId: string) => unwrap(api.get<UploadedDocument[]>(`/jobs/${enc(jobId)}/uploads`)),
  /** EXECUTIVE only. `date` is required for AMAZON_ACTIVITY; re-uploading an identical file is a no-op. */
  upload: (jobId: string, input: { file: File; docType: UploadDocType; date?: string }) => {
    const form = new FormData()
    form.append('file', input.file)
    form.append('docType', input.docType)
    if (input.date) form.append('date', input.date)
    return unwrap(api.post<UploadedDocument>(`/jobs/${enc(jobId)}/uploads`, form))
  },

  /* ── Validation rows ── */
  /** EXECUTIVE only. Runs the engine over the latest uploads and upserts every row. */
  validate: (jobId: string) => unwrap(api.post<TimecardRow[]>(`/jobs/${enc(jobId)}/validate`)),
  listRows: (jobId: string, params: { date?: string; status?: string } = {}) =>
    unwrap(api.get<TimecardRow[]>(`/jobs/${enc(jobId)}/rows`, { params })),
  /** EXECUTIVE only. A reason is mandatory; the row stops blocking its date's submission. */
  overrideRow: (jobId: string, rowId: string, body: OverrideRowInput) =>
    unwrap(api.patch<TimecardRow>(`/jobs/${enc(jobId)}/rows/${enc(rowId)}/override`, body)),

  /* ── Per-date approvals ── */
  /** Only dates submitted at least once are returned. */
  listDates: (jobId: string) => unwrap(api.get<DateApproval[]>(`/jobs/${enc(jobId)}/dates`)),
  /** EXECUTIVE only; 409 with `blockingRows` if the date still has unresolved rows. */
  submitDate: (jobId: string, date: string) =>
    unwrap(api.post<DateApproval>(`/jobs/${enc(jobId)}/dates/${enc(date)}/submit`)),
  /** MANAGER only. */
  approveDate: (jobId: string, date: string) =>
    unwrap(api.post<DateApproval>(`/jobs/${enc(jobId)}/dates/${enc(date)}/approve`)),
  /** MANAGER only; sends the date back to the executive. */
  rejectDate: (jobId: string, date: string, rejectionComments: string) =>
    unwrap(api.post<DateApproval>(`/jobs/${enc(jobId)}/dates/${enc(date)}/reject`, { rejectionComments })),

  /* ── Audit ── */
  listAudit: (jobId: string) => unwrap(api.get<TimecardAuditEntry[]>(`/jobs/${enc(jobId)}/audit`)),
}
