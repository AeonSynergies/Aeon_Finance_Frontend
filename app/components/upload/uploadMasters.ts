/**
 * Aeon Finance — Upload master catalogue.
 *
 * Each master describes an importable Excel sheet: which validation module it
 * feeds, the expected file type, and the required / optional columns used for
 * column detection and auto-mapping on the Upload page.
 */

export type UploadModule =
  | "TIMECARD"
  | "ROUTE_REVENUE"
  | "ROUTE_INVOICE"
  | "RFS_AFS"
  | "FLEET_REVENUE"
  | "RENTAL"
  | "REPAIR_MAINTENANCE"
  | "INSURANCE";

export type UploadDomain = "Payroll & Compliance" | "Routes" | "Fleet";

export interface UploadMaster {
  id: string;
  label: string;
  module: UploadModule;
  group: UploadDomain;
  fileType: string;
  requiredColumns: string[];
  optionalColumns: string[];
  description: string;
  sampleFileName: string;
  /** Document.docType this master feeds when marking uploads. */
  docType?: string;
  /** Prompt for a report date in Step 1 (files with no per-row date column). */
  requiresDateInput?: boolean;
  /** File has metadata rows before the real header (e.g. Amazon Break CSV). */
  hasMetadataHeader?: boolean;
  /** First-cell label of the metadata row that carries the report date. */
  metadataDateField?: string;
  /** First-cell label of the row that begins the real data table. */
  actualHeaderRow?: string;
  /** Row filters applied on ingest (e.g. Break Report). */
  filterRules?: { reportSource?: string; minBreakDuration?: number };
  /** Optional per-field alias lists for required-column matching. */
  columnAliases?: Record<string, string[]>;
}

export const UPLOAD_MASTERS: UploadMaster[] = [
  // ── Payroll & Compliance ──
  {
    id: "payroll-export",
    label: "Timecard — Payroll Export",
    module: "TIMECARD",
    group: "Payroll & Compliance",
    fileType: ".xlsx",
    docType: "Payroll Export",
    requiredColumns: ["Payroll Name", "Pay Date", "Time In", "Time Out", "Hours"],
    optionalColumns: ["Company Code", "File Number", "Earnings Code", "Worked Department", "Position"],
    columnAliases: {
      "Payroll Name": ["Payroll Name", "Employee Name", "Name", "Driver Name", "Full Name"],
      "Pay Date": ["Pay Date", "Work Date", "Date", "Shift Date", "Clock Date"],
      "Time In": ["Time In", "Clock In", "Login Time", "Start Time", "In Time"],
      "Time Out": ["Time Out", "Clock Out", "Logout Time", "End Time", "Out Time"],
      "Hours": ["Hours", "Total Hours", "Worked Hours", "Duration", "Hrs"],
      "Earnings Code": ["Earnings Code", "Earn Code", "Pay Code", "Code", "Type", "Pay Type"],
      "File Number": ["File Number", "Employee ID", "Emp ID", "ID", "Worker ID", "Badge Number"],
      "Worked Department": ["Worked Department", "Department", "Dept", "Work Dept"],
    },
    description:
      "Payroll timecard punches (payroll-app agnostic — ADP, Paycom, Gusto, etc.) used for timecard reconciliation and break analysis.",
    sampleFileName: "payroll-export-sample.xlsx",
  },
  {
    id: "amazon-itinerary",
    label: "Amazon Itinerary Report",
    module: "TIMECARD",
    group: "Payroll & Compliance",
    fileType: ".xlsx",
    docType: "Amazon Itinerary",
    requiresDateInput: true,
    requiredColumns: ["Driver name", "App sign in:", "App sign out:"],
    optionalColumns: [
      "Total break time used",
      "Delivery Service Type",
      "Route code",
      "Progress Status",
      "Actual departure",
      "Last stop execution time",
      "cortex_vin_number",
      "Phone number",
      "Total breaks",
      "Projected Return to Station",
      "DA activity",
      "Stops complete",
      "All stops",
    ],
    columnAliases: {
      "Driver name": ["Driver name", "Driver Name", "Name"],
      "App sign in:": ["App sign in:", "App sign in", "App Sign In", "Sign In"],
      "App sign out:": ["App sign out:", "App sign out", "App Sign Out", "Sign Out"],
    },
    description:
      "Daily driver activity export from the Amazon DSP portal. REQUIRES a report date (no per-row date column).",
    sampleFileName: "amazon-itinerary-sample.xlsx",
  },
  {
    id: "amazon-break",
    label: "Amazon Break Utilization Report",
    module: "TIMECARD",
    group: "Payroll & Compliance",
    fileType: ".csv",
    docType: "Amazon Break Report",
    requiresDateInput: false,
    hasMetadataHeader: true,
    metadataDateField: "Date:",
    actualHeaderRow: "DA Transporter ID:",
    filterRules: { reportSource: "Delivery App", minBreakDuration: 25 },
    requiredColumns: [
      "DA Transporter ID:",
      "DA Name:",
      "Break Start Time",
      "Break End Time",
      "Break Duration in Minutes",
      "Report Source",
    ],
    optionalColumns: ["Break Type"],
    columnAliases: {
      "DA Transporter ID:": ["DA Transporter ID:", "DA Transporter ID", "Transporter ID"],
      "DA Name:": ["DA Name:", "DA Name", "Name", "Driver Name"],
      "Break Start Time": ["Break Start Time", "Start Time", "Break Start"],
      "Break End Time": ["Break End Time", "End Time", "Break End"],
      "Break Duration in Minutes": ["Break Duration in Minutes", "Duration", "Break Duration"],
      "Report Source": ["Report Source", "Source"],
    },
    description:
      "Daily DA Break Utilization CSV from the Amazon DSP portal. Date auto-detected from file metadata. Only Delivery App breaks ≥ 25 min are imported.",
    sampleFileName: "amazon-break-sample.csv",
  },

  // ── Routes ──
  {
    id: "wst-weekly-report",
    label: "WST Weekly Report",
    module: "ROUTE_REVENUE",
    group: "Routes",
    fileType: ".xlsx",
    requiredColumns: ["Service Type", "Route Type", "WST Qty", "Ops Qty"],
    optionalColumns: ["Week", "Station", "Notes"],
    description: "Weekly route revenue quantities from the WST system.",
    sampleFileName: "wst-weekly-report-sample.xlsx",
  },
  {
    id: "amazon-invoice",
    label: "Amazon Invoice",
    module: "ROUTE_INVOICE",
    group: "Routes",
    fileType: ".xlsx",
    requiredColumns: [
      "Week",
      "Service Type",
      "Expected Qty",
      "Paid Qty",
      "Rate",
    ],
    optionalColumns: ["Invoice No", "Amount", "Notes"],
    description: "Amazon route invoice used to reconcile paid vs expected quantities.",
    sampleFileName: "amazon-invoice-sample.xlsx",
  },

  // ── Fleet ──
  {
    id: "afs-eligibility",
    label: "AFS Eligibility Report",
    module: "RFS_AFS",
    group: "Fleet",
    fileType: ".xlsx",
    requiredColumns: ["VIN", "Op Status", "AFS Status"],
    optionalColumns: ["Vehicle Type", "Notes"],
    description: "Fleet RFS/AFS eligibility statuses per vehicle.",
    sampleFileName: "afs-eligibility-sample.xlsx",
  },
  {
    id: "vehicle-revenue",
    label: "Vehicle Revenue Export",
    module: "FLEET_REVENUE",
    group: "Fleet",
    fileType: ".xlsx",
    requiredColumns: ["Vehicle Type", "Eligible Qty", "Rate"],
    optionalColumns: ["Week", "Amount", "Notes"],
    description: "Fleet revenue eligibility and rates per vehicle type.",
    sampleFileName: "vehicle-revenue-sample.xlsx",
  },
  {
    id: "rental-invoice",
    label: "Rental Vendor Invoice",
    module: "RENTAL",
    group: "Fleet",
    fileType: ".xlsx",
    requiredColumns: ["VIN", "Days Billed", "Days Used", "Rate"],
    optionalColumns: ["Vendor", "Invoice No", "Amount"],
    description: "Rental vendor invoice reconciled against days used.",
    sampleFileName: "rental-invoice-sample.xlsx",
  },
  {
    id: "shop-invoice",
    label: "Shop Invoice",
    module: "REPAIR_MAINTENANCE",
    group: "Fleet",
    fileType: ".xlsx",
    requiredColumns: ["Invoice No", "VIN", "Work Order", "Total Invoiced"],
    optionalColumns: ["Vendor", "Date", "Notes"],
    description: "Repair and maintenance shop invoices per work order.",
    sampleFileName: "shop-invoice-sample.xlsx",
  },
  {
    id: "carrier-statement",
    label: "Carrier Statement",
    module: "INSURANCE",
    group: "Fleet",
    fileType: ".xlsx",
    requiredColumns: ["VIN", "Premium Billed", "Premium Expected"],
    optionalColumns: ["Policy No", "Period", "Notes"],
    description: "Insurance carrier statement reconciled against expected premiums.",
    sampleFileName: "carrier-statement-sample.xlsx",
  },
];

/**
 * Auto-map detected spreadsheet columns to a master's required fields.
 * Strategy: exact (case-insensitive) match, then substring ("contains")
 * match, otherwise null.
 */
export function autoMapColumns(
  detectedColumns: string[],
  requiredFields: string[]
): Record<string, string | null> {
  const mapping: Record<string, string | null> = {};
  for (const field of requiredFields) {
    const target = field.toLowerCase().trim();

    // 1) exact match (case-insensitive)
    let match = detectedColumns.find(
      (c) => c.toLowerCase().trim() === target
    );

    // 2) contains match (either direction)
    if (!match) {
      match = detectedColumns.find((c) => {
        const col = c.toLowerCase().trim();
        return col.includes(target) || target.includes(col);
      });
    }

    mapping[field] = match ?? null;
  }
  return mapping;
}
