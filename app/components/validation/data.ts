export type ValidationStatus = "valid" | "error" | "warning" | "overridden" | "missing";
export type ApprovalStage = "draft" | "submitted" | "approved" | "rejected";

/** Status used by Override modal. */
export type OverrideValidationStatus =
  | "No Error"
  | "Missing"
  | "Exception"
  | "Missing and Exception";

export interface OverrideRecord {
  validationStatus: OverrideValidationStatus;
  notes: string;
  by: string;
  at: string;
  /** Legacy fields (still tolerated but no longer required by the UI). */
  reason?: "Driver confirmed correct" | "Dispatcher approved" | "System mismatch" | "Other";
  markedNoError?: boolean;
}

export type ApproverStatus = "Approved" | "Rejected";

export interface TimecardRow {
  approverStatus?: ApproverStatus;
  approverNotes?: string;
  id: string;
  date: string;
  name: string;
  phone: string;
  position: string;
  entryType: "Regular" | "PTO" | "Bonus";
  payLogin: string;
  appLogin: string;
  loginDiff: string;
  payBreakOut: string;
  payBreakIn: string;
  appBreakOut: string;
  appBreakIn: string;
  breakDiff: string;
  payLogout: string;
  appLogout: string;
  logoutDiff: string;
  appDeparture: string;
  appReturn: string;
  onRoadDuration: string;
  totalHours: string;
  status: ValidationStatus;
  cap: boolean;
  ot: boolean;
  delivery: "Valid" | "Missing" | "Violation";
  comment: string;
  attempts: number;
  priority: "High" | "Normal";
  override?: OverrideRecord;
  executiveNotes?: string;
  payRate?: number;
  weeklyTotalHours?: string;
  weeklyOt?: boolean;
}

const isMissing = (v: string) => !v || v === "—";
const mins = (d: string) => {
  if (!d || d === "—") return 0;
  const n = parseInt(d.replace(/[^\d]/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
};

/** Per-row issues (CAP/OT excluded — those show only in side panel). */
export function deriveIssues(r: TimecardRow): string[] {
  if (r.entryType === "PTO" || r.entryType === "Bonus") return [];
  const issues: string[] = [];
  if (isMissing(r.appLogin) && !isMissing(r.payLogin)) issues.push("Missing App Signin");
  if (isMissing(r.payLogin) && !isMissing(r.appLogin)) issues.push("Missing Pay Login");
  if (isMissing(r.appLogout) && !isMissing(r.payLogout)) issues.push("Missing App Signout");
  if (isMissing(r.payLogout) && !isMissing(r.appLogout)) issues.push("Missing Pay Logout");
  if (mins(r.loginDiff) >= 10) issues.push(`Login mismatch by ${mins(r.loginDiff)} mins`);
  if (mins(r.logoutDiff) >= 10) issues.push(`Logout mismatch by ${mins(r.logoutDiff)} mins`);
  if (mins(r.breakDiff) >= 10) issues.push(`Break mismatch by ${mins(r.breakDiff)} mins`);
  return issues;
}

/** Effective validation status after honoring overrides + earn-code rules. */
export function effectiveValidationStatus(r: TimecardRow): OverrideValidationStatus {
  if (r.override?.validationStatus) return r.override.validationStatus;
  if (r.entryType === "PTO" || r.entryType === "Bonus") return "No Error";
  const issues = deriveIssues(r);
  if (issues.length === 0) return "No Error";
  const hasMissing = issues.some((i) => i.startsWith("Missing"));
  const hasException = issues.some((i) => !i.startsWith("Missing"));
  if (hasMissing && hasException) return "Missing and Exception";
  if (hasMissing) return "Missing";
  return "Exception";
}

/** Legacy single-line message — kept for the side panel only. */
export function deriveValidationMessage(r: TimecardRow): string {
  if (r.override?.validationStatus) return `Overridden — ${r.override.validationStatus}`;
  if (r.entryType === "PTO" || r.entryType === "Bonus") return "No Error";
  const issues = deriveIssues(r);
  if (r.cap) issues.push("CAP threshold exceeded");
  if (issues.length === 0) return "No Error";
  return issues.join(" · ");
}

const base = (overrides: Partial<TimecardRow>): TimecardRow => ({
  id: "", date: "", name: "", phone: "", position: "DA", entryType: "Regular",
  payLogin: "—", appLogin: "—", loginDiff: "—",
  payBreakOut: "—", payBreakIn: "—", appBreakOut: "—", appBreakIn: "—", breakDiff: "—",
  payLogout: "—", appLogout: "—", logoutDiff: "—",
  appDeparture: "—", appReturn: "—", onRoadDuration: "—",
  totalHours: "—", status: "valid", cap: false, ot: false,
  delivery: "Valid", comment: "", attempts: 0, priority: "Normal",
  ...overrides,
});

export const TIMECARDS: TimecardRow[] = [
  base({ id: "TC-1001", date: "Apr 22", name: "Marcus Johnson", phone: "(206) 555-0143",
    payLogin: "08:02", appLogin: "08:14", loginDiff: "+12m",
    payBreakOut: "12:30", payBreakIn: "13:00", appBreakOut: "12:42", appBreakIn: "13:18", breakDiff: "+18m",
    payLogout: "18:00", appLogout: "18:42", logoutDiff: "+42m",
    appDeparture: "08:30", appReturn: "18:30", onRoadDuration: "10h 00m",
    totalHours: "10.7", status: "error", cap: true, ot: true, priority: "High", attempts: 2,
    comment: "App logout exceeds CAP — needs verification",
    approverStatus: "Rejected", approverNotes: "CAP breach — re-check Amazon punch.",
  }),
  base({ id: "TC-1002", date: "Apr 22", name: "Sofia Patel", phone: "(206) 555-0192",
    payLogin: "09:00", appLogin: "09:01", loginDiff: "+1m",
    payBreakOut: "13:00", payBreakIn: "13:30", appBreakOut: "13:01", appBreakIn: "13:31", breakDiff: "+1m",
    payLogout: "18:00", appLogout: "18:03", logoutDiff: "+3m",
    appDeparture: "09:15", appReturn: "17:55", onRoadDuration: "8h 40m",
    totalHours: "8.5", status: "valid",
  }),
  base({ id: "TC-1003", date: "Apr 23", name: "Diego Rivera", phone: "(206) 555-0167",
    payLogin: "07:55", payBreakOut: "12:00", payBreakIn: "12:30", payLogout: "17:30",
    totalHours: "9.0", status: "missing", delivery: "Missing", priority: "High", attempts: 1,
    comment: "No app data received",
  }),
  base({ id: "TC-1004", date: "Apr 23", name: "Aisha Brown", phone: "(206) 555-0118", position: "DA Lead",
    payLogin: "08:00", appLogin: "08:08", loginDiff: "+8m",
    payBreakOut: "12:30", payBreakIn: "13:00", appBreakOut: "12:36", appBreakIn: "13:06", breakDiff: "+6m",
    payLogout: "18:30", appLogout: "18:55", logoutDiff: "+25m",
    appDeparture: "08:30", appReturn: "18:45", onRoadDuration: "10h 15m",
    totalHours: "10.0", status: "warning", ot: true, comment: "OT > 2h vs scheduled",
  }),
  base({ id: "TC-1005", date: "Apr 24", name: "Liam O'Connor", phone: "(206) 555-0102", entryType: "PTO",
    totalHours: "8.0", comment: "Approved PTO",
  }),
  base({ id: "TC-1006", date: "Apr 24", name: "Hannah Kim", phone: "(206) 555-0149",
    payLogin: "08:10", appLogin: "08:11", loginDiff: "+1m",
    payBreakOut: "12:45", payBreakIn: "13:15", appBreakOut: "12:46", appBreakIn: "13:14", breakDiff: "−1m",
    payLogout: "17:45", appLogout: "17:50", logoutDiff: "+5m",
    appDeparture: "08:25", appReturn: "17:40", onRoadDuration: "9h 15m",
    totalHours: "9.0", status: "valid",
  }),
  base({ id: "TC-1007", date: "Apr 25", name: "Carlos Mendoza", phone: "(206) 555-0130",
    payLogin: "08:00", appLogin: "08:35", loginDiff: "+35m",
    payBreakOut: "12:30", payBreakIn: "13:00", appBreakOut: "12:55", appBreakIn: "13:40", breakDiff: "+45m",
    payLogout: "18:00", appLogout: "18:50", logoutDiff: "+50m",
    appDeparture: "08:50", appReturn: "18:40", onRoadDuration: "9h 50m",
    totalHours: "10.5", status: "error", cap: true, ot: true, delivery: "Violation",
    priority: "High", attempts: 3, comment: "Multiple violations",
  }),
  base({ id: "TC-1008", date: "Apr 25", name: "Emma Schultz", phone: "(206) 555-0177", entryType: "Bonus",
    status: "overridden", comment: "Performance bonus approved",
  }),
];
