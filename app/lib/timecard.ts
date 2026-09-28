// Display + workflow helpers for the timecard validation API.
import type {
  DateApproval,
  DateApprovalStatus,
  TimecardJob,
  TimecardJobStatus,
  TimecardRow,
  UploadDocType,
  UploadedDocument,
} from '@/types/timecard'

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'primary'

/* ── Dates (the API stores @db.Date values → always read them as UTC) ── */

/** `2026-07-05T00:00:00.000Z` → `2026-07-05`. */
export const dateKey = (iso: string) => iso.slice(0, 10)

/** Every `YYYY-MM-DD` from periodStart to periodEnd inclusive (capped for safety). */
export function periodDates(job: Pick<TimecardJob, 'periodStart' | 'periodEnd'>, max = 62): string[] {
  const out: string[] = []
  const end = Date.parse(dateKey(job.periodEnd))
  for (let t = Date.parse(dateKey(job.periodStart)); t <= end && out.length < max; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10))
  }
  return out
}

const fmtDay = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
const fmtDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const fmtDateTime = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** `2026-07-05` → `Sun, Jul 5`. */
export const formatDay = (key: string) => fmtDay.format(new Date(`${key}T00:00:00Z`))
/** Calendar date from an ISO @db.Date value → `Jul 5, 2026`. */
export const formatDate = (iso: string) => fmtDate.format(new Date(`${dateKey(iso)}T00:00:00Z`))
/** Timestamp in the viewer's timezone → `Jul 5, 3:04 PM`. */
export const formatDateTime = (iso: string) => fmtDateTime.format(new Date(iso))

export const periodLabel = (job: Pick<TimecardJob, 'periodStart' | 'periodEnd'>) => {
  const a = dateKey(job.periodStart)
  const b = dateKey(job.periodEnd)
  return a === b ? formatDate(a) : `${formatDate(a)} – ${formatDate(b)}`
}

/* ── Job status ── */

export const JOB_STATUS: Record<TimecardJobStatus, { label: string; tone: Tone }> = {
  DRAFT_INPROGRESS: { label: 'In progress', tone: 'info' },
  SENT_FOR_APPROVAL: { label: 'Sent for approval', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  LOCKED: { label: 'Locked', tone: 'muted' },
}

/* ── Per-date approval status (no DateApproval row = never submitted) ── */

export type DateState = DateApprovalStatus | 'NOT_SUBMITTED'

export const DATE_STATUS: Record<DateState, { label: string; tone: Tone }> = {
  NOT_SUBMITTED: { label: 'Not submitted', tone: 'muted' },
  IN_PROGRESS: { label: 'Returned', tone: 'danger' },
  SENT_FOR_APPROVAL: { label: 'Awaiting approval', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
}

/** IN_PROGRESS only exists after a manager rejected the date (it's reset to IN_PROGRESS). */
export const dateState = (approval: DateApproval | undefined): DateState =>
  !approval ? 'NOT_SUBMITTED' : approval.status === 'IN_PROGRESS' && !approval.rejectionComments ? 'NOT_SUBMITTED' : approval.status

/* ── Row validation status ── */

const STATUS_LABELS: Record<string, string> = {
  GOOD_NO_ERROR: 'Good – no error',
  NEED_MANUAL_VALIDATION: 'Needs manual validation',
  PENDING_DRIVER_CORRECTION: 'Pending driver correction',
  PENDING_MANAGER_REVIEW: 'Pending manager review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  MISSING_PAYROLL_LOGIN: 'Missing payroll login',
  LOGIN_TIME_DIFFERENCE: 'Login time difference',
  WAVE_LOGIN_DIFFERENCE: 'Wave login difference',
  EMPLOYEE_NOT_MATCHED: 'Employee not matched',
  MISSING_PAYROLL_LOGOUT: 'Missing payroll logout',
  LOGOUT_TIME_DIFFERENCE: 'Logout time difference',
  AMAZON_AUTO_LOGOUT_ESTIMATED: 'Amazon auto-logout (estimated)',
  MISSING_MEAL_BREAK: 'Missing meal break',
  BREAK_TIME_DIFFERENCE: 'Break time difference',
  BREAK_DURATION_DIFFERENCE: 'Break duration difference',
  DUPLICATE_BREAK: 'Duplicate break',
  MEAL_WAIVER_EXEMPT: 'Meal waiver exempt',
  DELIVERY_DURING_BREAK: 'Delivery during break',
  DUPLICATE_PUNCH: 'Duplicate punch',
  MISSING_PUNCH: 'Missing punch',
  PTO: 'PTO',
  BONUS: 'Bonus',
  TRAINING: 'Training',
  COMPARISON_DATA_MISSING: 'Comparison data missing',
  EARN_CODE_MISCONFIGURED: 'Earn code misconfigured',
  UNREADABLE_TIME_VALUE: 'Unreadable time value',
  VTO: 'VTO',
}

/** Statuses an executive can override a row to (GOOD_NO_ERROR first). */
export const OVERRIDE_STATUSES = Object.keys(STATUS_LABELS)

/** Informational outcomes (not errors): earn-code short-circuits and waivers. */
const INFO_STATUSES = new Set(['PTO', 'BONUS', 'TRAINING', 'VTO', 'MEAL_WAIVER_EXEMPT'])

export const statusLabel = (s: string) =>
  STATUS_LABELS[s] ?? s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

export const statusTone = (s: string): Tone =>
  s === 'GOOD_NO_ERROR' || s === 'APPROVED' ? 'success' : INFO_STATUSES.has(s) ? 'info' : s === 'REJECTED' ? 'danger' : 'warning'

/** A row blocks its date's submission unless it's GOOD_NO_ERROR or was overridden (backend rule). */
export const isRowResolved = (r: Pick<TimecardRow, 'validationStatus' | 'overriddenAt'>) =>
  r.validationStatus === 'GOOD_NO_ERROR' || !!r.overriddenAt

/* ── Rules ── */

export const RULE_NAMES: Record<number, string> = {
  1: 'Employee matching',
  2: 'Wave login',
  3: 'Login vs Amazon',
  4: 'Physical timesheet',
  5: 'Meal break',
  6: 'Logout',
  7: 'Missing login',
  8: 'Missing logout',
  9: 'Missing break',
  10: 'Duplicate break',
  11: 'Duplicate punch',
  12: 'PTO',
  13: 'Bonus',
  14: 'Training',
  15: 'Earn code config',
  16: 'Unreadable time',
  17: 'VTO',
}

export const ruleLabel = (n: number | null) => (n == null ? '—' : `R${n} · ${RULE_NAMES[n] ?? 'Rule'}`)

/* ── Uploads ── */

export const DOC_TYPES: Record<
  UploadDocType,
  { label: string; accept: string; perDate: boolean; requiresDate: boolean; required: boolean; hint: string }
> = {
  PAYROLL_TIMECARD: {
    label: 'Payroll export', accept: '.xlsx', perDate: false, requiresDate: false, required: true,
    hint: 'Columns: Payroll Name, Pay Date, Time In, Time Out, Earnings Code. One file covers the whole period.',
  },
  AMAZON_ACTIVITY: {
    label: 'Amazon itinerary', accept: '.xlsx', perDate: true, requiresDate: true, required: true,
    hint: 'Columns: Driver name, App sign in, App sign out, Last stop execution time. The file has no date — pick it below.',
  },
  AMAZON_BREAK: {
    label: 'Amazon break report', accept: '.csv', perDate: true, requiresDate: false, required: false,
    hint: 'CSV with a "Date:" line and columns DA Name, Break Start Time, Break End Time, Report Source.',
  },
  EMPLOYEE_MASTER: { label: 'Employee master', accept: '.xlsx,.csv', perDate: false, requiresDate: false, required: false, hint: 'Stored for reference.' },
  PHYSICAL_TIMESHEET: { label: 'Physical timesheet', accept: '.xlsx,.csv,.pdf', perDate: false, requiresDate: false, required: false, hint: 'Stored for reference.' },
  WAVE_SCHEDULE: { label: 'Wave schedule', accept: '.xlsx,.csv', perDate: false, requiresDate: false, required: false, hint: 'Stored for reference.' },
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // backend multer limit

/** Newest version per (docType, date) — what the engine actually validates against. */
export function latestUploads(docs: UploadedDocument[]): UploadedDocument[] {
  const best = new Map<string, UploadedDocument>()
  for (const d of docs) {
    const key = `${d.docType}|${d.date ? dateKey(d.date) : ''}`
    const cur = best.get(key)
    if (!cur || d.version > cur.version) best.set(key, d)
  }
  return [...best.values()]
}

/** Why validation can't run yet, or null when the required files are in. */
export function validationBlocker(docs: UploadedDocument[]): string | null {
  if (!docs.some((d) => d.docType === 'PAYROLL_TIMECARD')) return 'Upload the payroll export first.'
  if (!docs.some((d) => d.docType === 'AMAZON_ACTIVITY')) return 'Upload at least one Amazon itinerary.'
  return null
}
