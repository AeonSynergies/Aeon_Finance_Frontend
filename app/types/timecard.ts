// DTOs returned by the NestJS timecard API (dates arrive as ISO strings).

export type TimecardJobStatus = 'DRAFT_INPROGRESS' | 'SENT_FOR_APPROVAL' | 'APPROVED' | 'LOCKED'
export type TimecardFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY'

export interface TimecardJob {
  id: string
  jobId: string
  module: 'TIMECARD'
  frequency: TimecardFrequency
  periodStart: string
  periodEnd: string
  processDate: string
  createdById: string
  lockedAt: string | null
  createdAt: string
  updatedAt: string
  status: TimecardJobStatus
}

export interface CreateTimecardJobInput {
  frequency: TimecardFrequency
  periodStart: string
  periodEnd: string
  processDate: string
}

export type UploadDocType =
  | 'PAYROLL_TIMECARD'
  | 'AMAZON_ACTIVITY'
  | 'AMAZON_BREAK'
  | 'EMPLOYEE_MASTER'
  | 'PHYSICAL_TIMESHEET'
  | 'WAVE_SCHEDULE'

export interface UploadedDocument {
  id: string
  jobId: string
  docType: UploadDocType
  fileName: string
  checksum: string
  version: number
  date: string | null
  /** Parsed record count; null for doc types the backend stores without parsing. */
  rowCount: number | null
  uploadedById: string
  uploadedAt: string
  status: 'UPLOADED' | 'PENDING' | 'MISSING'
}

export type TimecardValidationStatus =
  | 'GOOD_NO_ERROR'
  | 'NEED_MANUAL_VALIDATION'
  | 'PENDING_DRIVER_CORRECTION'
  | 'PENDING_MANAGER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'MISSING_PAYROLL_LOGIN'
  | 'LOGIN_TIME_DIFFERENCE'
  | 'WAVE_LOGIN_DIFFERENCE'
  | 'EMPLOYEE_NOT_MATCHED'
  | 'MISSING_PAYROLL_LOGOUT'
  | 'LOGOUT_TIME_DIFFERENCE'
  | 'AMAZON_AUTO_LOGOUT_ESTIMATED'
  | 'MISSING_MEAL_BREAK'
  | 'BREAK_TIME_DIFFERENCE'
  | 'BREAK_DURATION_DIFFERENCE'
  | 'DUPLICATE_BREAK'
  | 'MEAL_WAIVER_EXEMPT'
  | 'DELIVERY_DURING_BREAK'
  | 'DUPLICATE_PUNCH'
  | 'MISSING_PUNCH'
  | 'PTO'
  | 'BONUS'
  | 'TRAINING'
  | 'COMPARISON_DATA_MISSING'
  | 'EARN_CODE_MISCONFIGURED'
  | 'UNREADABLE_TIME_VALUE'
  | 'VTO'

export interface BreakSegment {
  breakOut: string
  breakIn: string
}

export interface TriggeredRule {
  rule: number
  outcome: { triggered: boolean; status?: string; detail?: string }
}

export interface TimecardRow {
  id: string
  jobId: string
  date: string
  employeeId: string | null
  rawPayrollName: string
  rawAmazonName: string | null
  phone: string | null
  position: string | null
  earnCode: string | null
  payLogin: string | null
  payLogout: string | null
  payBreakOut: string | null
  payBreakIn: string | null
  payLogins: string[]
  payLogouts: string[]
  payBreaks: BreakSegment[]
  appLogin: string | null
  appLogout: string | null
  physicalLogin: string | null
  lastStop: string | null
  amazonBreaks: BreakSegment[]
  /** Usually a TimecardValidationStatus; overrides may set any string. */
  validationStatus: string
  triggeredRule: number | null
  additionalTriggeredRules: TriggeredRule[]
  detail: string | null
  overrideNote: string | null
  overriddenById: string | null
  overriddenAt: string | null
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  approverNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface OverrideRowInput {
  newStatus: string
  reason: string
  note?: string
}

export type DateApprovalStatus = 'IN_PROGRESS' | 'SENT_FOR_APPROVAL' | 'APPROVED' | 'REJECTED'

export interface DateApproval {
  id: string
  jobId: string
  date: string
  status: DateApprovalStatus
  submittedById: string | null
  submittedAt: string | null
  decidedById: string | null
  decidedAt: string | null
  rejectionComments: string | null
}

export interface TimecardAuditEntry {
  id: string
  jobId: string | null
  timecardRowId: string | null
  userId: string
  action: string
  detail: string
  createdAt: string
}

/** Extra fields on the 409 returned when a date can't be submitted yet. */
export interface SubmitBlockedDetails {
  blockingRows: { id: string; validationStatus: string }[]
}
