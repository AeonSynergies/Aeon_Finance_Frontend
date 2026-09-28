/**
 * Shared types for the unified validation architecture.
 * All validation modules (Timecard, Route, Fleet, Rental, R&M, Insurance)
 * extend these primitives for column structure, override, approval, dispute.
 */

export type ValidationStatus =
  | "Validated"
  | "Need Manual Validation"
  | "Need Dispute"
  | "Pending Validation"
  | "Sent for Approval"
  | "Locked";

export type ApprovalStatus = "Pending" | "Approved" | "Rejected";

export type ValidationDisputeStatus = "Need Dispute" | "No Dispute" | "Pending Validation";

export type VendorDisputeStatus =
  | "Yet to Dispute"
  | "Submitted"
  | "Under Review"
  | "Accepted"
  | "Partially Accepted"
  | "Rejected";

export type ValidationModule =
  | "payroll"
  | "route"
  | "fleet";

export interface AuditEntry {
  id: string;
  who: string;
  action: string;
  detail: string;
  at: string; // ISO
}

export interface OverrideMeta {
  notes: string;
  by: string;
  at: string;
  previous?: Record<string, unknown>;
}

export interface ApprovalMeta {
  status: ApprovalStatus;
  approverNotes?: string;
  by?: string;
  at?: string;
}

export interface ValidationRowBase {
  id: string;
  validationStatus: ValidationStatus;
  validationNotes?: string;
  overrideNotes?: string;
  override?: OverrideMeta;
  approval?: ApprovalMeta;
  audit?: AuditEntry[];
}

export interface DisputeRow {
  id: string;
  disputeId: string;
  disputeType: string;
  validationDisputeStatus: ValidationDisputeStatus;
  vendorDisputeStatus: VendorDisputeStatus;
  disputeValue: number;
  acceptedValue: number;
  rejectedValue: number;
  disputeNotes?: string;
  resolutionNotes?: string;
  job?: "current" | "previous";
}

export interface JobDraft {
  jobId: string;
  frequency: "Daily" | "Weekly" | "Bi-Weekly" | "Monthly";
  periodStart: string;
  periodEnd: string;
  processDate: string;
  validationType: string;
  // Module-specific (optional)
  payrollCycle?: "Weekly" | "Bi-Weekly";
  payrollProcessDate?: string;
  payDate?: string;
  weekNumber?: string;
  invoiceExpectedDate?: string;
  fleetBillingMonth?: string;
  reconciliationMonth?: string;
}

export function newAudit(action: string, detail: string, who = "Executive"): AuditEntry {
  return {
    id: `AU-${Math.random().toString(36).slice(2, 8)}`,
    who,
    action,
    detail,
    at: new Date().toISOString(),
  };
}
