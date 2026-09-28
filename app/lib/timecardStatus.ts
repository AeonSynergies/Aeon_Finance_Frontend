export type DateStatus =
  | "Pending"
  | "Awaiting Payroll"
  | "Awaiting Amazon"
  | "Ready"
  | "In Review"
  | "Validated"
  | "Approved"

export type JobOverallStatus =
  | "Pending Upload"
  | "Partial Upload"
  | "Needs Attention"
  | "In Progress"
  | "Validated"
  | "Submitted"
  | "Approved"
  | "Locked"

export interface DateStatusInfo {
  isoDate: string
  dateLabel: string
  status: DateStatus
  payrollUploaded: boolean
  amazonUploaded: boolean
  hasErrors: boolean
  allApproved: boolean
  rowCount: number
}

export function computeDateStatus(info: {
  payrollUploaded: boolean
  amazonUploaded: boolean
  hasValidationRows: boolean
  hasErrors: boolean
  allApproved: boolean
}): DateStatus {
  const { payrollUploaded, amazonUploaded, hasValidationRows, hasErrors, allApproved } = info

  if (allApproved && hasValidationRows) return "Approved"
  if (hasValidationRows && !hasErrors) return "Validated"
  if (hasValidationRows && hasErrors) return "In Review"
  if (payrollUploaded && amazonUploaded) return "Ready"
  if (payrollUploaded && !amazonUploaded) return "Awaiting Amazon"
  if (!payrollUploaded && amazonUploaded) return "Awaiting Payroll"
  return "Pending"
}

export function computeJobOverallStatus(
  dateStatuses: DateStatus[],
  jobDbStatus: string
): JobOverallStatus {
  if (jobDbStatus === "LOCKED") return "Locked"
  if (jobDbStatus === "SENT_FOR_APPROVAL") return "Submitted"
  if (jobDbStatus === "APPROVED") return "Approved"

  if (dateStatuses.length === 0) return "Pending Upload"
  if (dateStatuses.every((s) => s === "Pending")) return "Pending Upload"
  if (dateStatuses.every((s) => s === "Approved")) return "Approved"
  if (dateStatuses.every((s) => s === "Validated" || s === "Approved")) return "Validated"
  if (dateStatuses.some((s) => s === "In Review")) return "Needs Attention"
  if (dateStatuses.some((s) => s === "Validated" || s === "Approved")) return "In Progress"
  if (dateStatuses.some((s) => s === "Ready")) return "In Progress"
  if (dateStatuses.some((s) => s === "Awaiting Amazon" || s === "Awaiting Payroll")) return "Partial Upload"
  return "Pending Upload"
}

export const DATE_STATUS_STYLES: Record<DateStatus, string> = {
  "Pending": "bg-muted text-muted-foreground border-border",
  "Awaiting Payroll": "bg-warning/10 text-warning border-warning/30",
  "Awaiting Amazon": "bg-warning/10 text-warning border-warning/30",
  "Ready": "bg-info/10 text-info border-info/25",
  "In Review": "bg-destructive/10 text-destructive border-destructive/25",
  "Validated": "bg-success/10 text-success border-success/25",
  "Approved": "bg-primary/10 text-primary border-primary/25",
}

export const JOB_STATUS_STYLES: Record<JobOverallStatus, string> = {
  "Pending Upload": "bg-muted text-muted-foreground border-border",
  "Partial Upload": "bg-warning/10 text-warning border-warning/30",
  "Needs Attention": "bg-destructive/10 text-destructive border-destructive/25",
  "In Progress": "bg-secondary/10 text-secondary border-secondary/25",
  "Validated": "bg-success/10 text-success border-success/25",
  "Submitted": "bg-info/10 text-info border-info/25",
  "Approved": "bg-primary/10 text-primary border-primary/25",
  "Locked": "bg-muted text-muted-foreground border-border",
}
