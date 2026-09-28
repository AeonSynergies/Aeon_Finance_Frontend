export type UserRole = 'ADMIN' | 'MANAGER' | 'TEAM_LEAD' | 'EXECUTIVE' // legacy mock data only
export type UserModule = 'PAYROLL' | 'ROUTES' | 'FLEET' | 'ALL'
export type JobStatus = 'DRAFT' | 'INPROGRESS' | 'VALIDATED' | 'SENT_FOR_APPROVAL' | 'APPROVED' | 'LOCKED'
export type ValidationStatus =
  | 'VALIDATED'
  | 'NEED_MANUAL_VALIDATION'
  | 'NEED_DISPUTE'
  | 'PENDING_VALIDATION'
  | 'SENT_FOR_APPROVAL'
  | 'LOCKED'
export type DocStatus = 'UPLOADED' | 'PENDING' | 'MISSING'

/** The signed-in user, as returned by POST /auth/login and GET /auth/me. */
export interface SessionUser {
  id: string
  email: string
  name: string
  /** Role name, for display. */
  role: string
  roleId: string
  /** System roles (the org's Admin) have every permission and can't be edited. */
  isSystemRole: boolean
  org: { id: string; name: string; slug: string }
  permissions: import('./team').PermissionMap
  /** Legacy mock-module scoping; always null for backend users. */
  module: UserModule | null
}

// ── API DTOs (shapes returned by the mock API; dates arrive as ISO strings) ──
export type JobModule =
  | 'TIMECARD' | 'ROUTE_REVENUE' | 'ROUTE_INVOICE' | 'RFS_AFS'
  | 'FLEET_REVENUE' | 'RENTAL' | 'REPAIR_MAINTENANCE' | 'INSURANCE'

export interface Job {
  id: string
  jobId: string
  module: JobModule
  frequency: string
  periodStart: string
  periodEnd: string
  processDate: string
  status: JobStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  user?: { id: string; name: string; email: string }
  _count?: { documents: number; validationRows: number }
}

export interface JobDocument {
  id: string
  jobId: string
  docType: string
  date: string | null
  status: DocStatus
  fileName: string | null
  fileSize: number | null
  version: number
  uploadedBy: string | null
  uploadedAt: string | null
  createdAt: string
}

export interface ValidationRow {
  id: string
  jobId: string
  rowType: string
  externalId: string | null
  date: string | null
  validationStatus: ValidationStatus
  validationNotes: string | null
  overrideNotes: string | null
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  approverNotes: string | null
  disputeRequired: boolean
  disputeNotes: string | null
  disputeStatus: string
  vendorDisputeStatus: string
  disputeValue: number | null
  acceptedValue: number | null
  rejectedValue: number | null
  /** JSON-encoded row payload. */
  data: string
  createdAt: string
  updatedAt: string
  submittedBy?: string | null
  submittedAt?: string | null
  approvedAt?: string | null
}

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  module: UserModule | null
  status: string
  createdAt: string
}

export interface RateCard {
  id: string
  module: string
  code: string
  name: string
  baseRate: number
  surgeRate: number | null
  unit: string
  effectiveDate: string
  version: string
  isActive: boolean
}

export interface AppSettings {
  loginBuffer: number
  logoutBuffer: number
  breakBuffer: number
  dailyOtThreshold: number
  weeklyOtThreshold: number
  maxConsecutiveDays: number
  minRestPeriod: number
  wstDisputeWindow: number
  invoiceDisputeWindow: number
  supportMaxHours: number
  stationName: string
  dspName: string
}
