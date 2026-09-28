import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  FileSpreadsheet,
  FileWarning,
  Lock,
  Map,
  Receipt,
  Repeat,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Wrench,
  XCircle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CreateJobDialog } from "@/components/validation/CreateJobDialog";
import type { JobDraft, ValidationModule } from "@/components/validation/shared";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { JobModule } from "@/types";
import { useCreateJob, useJobDocuments, useJobRows, useJobs } from "@/hooks/useJobs";
import {
  computeDateStatus,
  computeJobOverallStatus,
  DATE_STATUS_STYLES,
  JOB_STATUS_STYLES,
  type DateStatus,
  type DateStatusInfo,
  type JobOverallStatus,
} from "@/lib/timecardStatus";

type Frequency = "Daily" | "Weekly" | "Monthly";
type DocStatus = "Uploaded" | "Missing" | "Pending";
type JobValidationStatus =
  | "Validated"
  | "Inprogress"
  | "Approved"
  | "Locked & Processed";
type DateValidationStatus =
  | "Need Manual Validation"
  | "Validated"
  | "Sent for Approval"
  | "Approved"
  | "ReValidate"
  | "Locked";

interface DayMatrixRow {
  date: string; // e.g. "Apr 20"
  /** keyed by document name -> status */
  docs: Record<string, DocStatus>;
  validation: DateValidationStatus;
}

interface JobRow {
  jobId: string;
  frequency: Frequency;
  period: string;
  status: JobValidationStatus;
  /** DB id — present for real-API cards (used to fetch documents) */
  dbId?: string;
  /** ISO period bounds (real-API cards) — used to build the per-date matrix */
  periodStart?: string;
  periodEnd?: string;
  /** Raw DB job status (real-API cards) — feeds computeJobOverallStatus */
  dbStatus?: string;
  /** Only used by Timecard (matrix-mode) card */
  documents?: string[];
  days?: DayMatrixRow[];
}

/* Real-API shapes (Timecard card) */
interface ApiJob {
  id: string;
  jobId: string;
  status: string;
  frequency?: string;
  periodStart: string;
  periodEnd: string;
}
interface ApiDocument {
  id: string;
  docType: string;
  date: string | null;
  status: "UPLOADED" | "PENDING" | "MISSING";
}

interface ApiRow {
  date: string | null;
  validationStatus?: string;
  approvalStatus?: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Build one entry per calendar date in the job's period (inclusive). */
function getJobDates(job: JobRow): { isoDate: string; dateLabel: string }[] {
  if (!job.periodStart || !job.periodEnd) return [];
  const start = new Date(`${job.periodStart.slice(0, 10)}T00:00:00Z`);
  const end = new Date(`${job.periodEnd.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
  const out: { isoDate: string; dateLabel: string }[] = [];
  const d = new Date(start);
  // Safety bound: never build more than a year of rows.
  for (let i = 0; d <= end && i < 366; i++, d.setUTCDate(d.getUTCDate() + 1)) {
    out.push({
      isoDate: d.toISOString().slice(0, 10),
      dateLabel: `${WEEKDAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`,
    });
  }
  return out;
}

const apiDocStatus = (s: string): DocStatus =>
  s === "UPLOADED" ? "Uploaded" : s === "PENDING" ? "Pending" : "Missing";

const apiJobStatus = (s: string): JobValidationStatus =>
  s === "VALIDATED"
    ? "Validated"
    : s === "APPROVED"
    ? "Approved"
    : s === "LOCKED"
    ? "Locked & Processed"
    : "Inprogress";

const apiFrequency = (s: string | undefined): Frequency =>
  s === "Daily" || s === "Monthly" ? s : "Weekly";

/** Map raw API jobs into the page's JobRow shape (shared by the load effect + create flow). */
function mapApiJobs(data: ApiJob[]): JobRow[] {
  return data.map((j) => ({
    jobId: j.jobId,
    dbId: j.id,
    frequency: apiFrequency(j.frequency),
    period: `${j.periodStart?.slice(0, 10)} → ${j.periodEnd?.slice(0, 10)}`,
    status: apiJobStatus(j.status),
    periodStart: j.periodStart,
    periodEnd: j.periodEnd,
    dbStatus: j.status,
  }));
}

/* ---------- Per-card live-API wiring ---------- */
type CardLayout = "date" | "file";
interface CardApiConfig {
  /** JobModule enum value */
  module: string;
  /** ValidationRow rowType */
  rowType: string;
  layout: CardLayout;
  /** Fallback required docTypes when no documents have loaded yet. */
  requiredDocs: string[];
}

const CARD_API_CONFIG: Record<string, CardApiConfig> = {
  timecard: {
    module: "TIMECARD",
    rowType: "timecard",
    layout: "date",
    requiredDocs: ["Payroll Export", "Amazon Itinerary", "Amazon Break Report"],
  },
  "route-revenue": {
    module: "ROUTE_REVENUE",
    rowType: "route_revenue",
    layout: "file",
    requiredDocs: ["Weekly WST Report", "Training Weekly Report", "UPD Report", "Service Details Report"],
  },
  "route-invoice": {
    module: "ROUTE_INVOICE",
    rowType: "route_invoice",
    layout: "file",
    requiredDocs: ["Amazon Invoice PDF", "Invoice Extracted Excel", "Expected Revenue Data", "Package Report"],
  },
  "fleet-rfs-afs": {
    module: "RFS_AFS",
    rowType: "rfs_afs",
    layout: "file",
    requiredDocs: ["Vehicle Roster", "AFS Eligibility Report", "Operational Status Log", "Dispute Pack"],
  },
  "fleet-revenue": {
    module: "FLEET_REVENUE",
    rowType: "fleet_revenue",
    layout: "file",
    requiredDocs: ["Rate Card", "Vehicle Revenue Export", "Amazon Fleet Invoice PDF", "Dispute Allocations"],
  },
  rental: {
    module: "RENTAL",
    rowType: "rental",
    layout: "file",
    requiredDocs: ["Rental Vendor Invoice", "Fleet Roster", "Day-Usage Report"],
  },
  repair: {
    module: "REPAIR_MAINTENANCE",
    rowType: "repair",
    layout: "file",
    requiredDocs: ["Shop Invoice", "Work Orders", "Parts Receipts"],
  },
  insurance: {
    module: "INSURANCE",
    rowType: "insurance",
    layout: "file",
    requiredDocs: ["Carrier Statement", "Vehicle Schedule", "Claims Log"],
  },
};

interface FileListRow {
  docType: string;
  dateRange: string;
  uploaded: boolean;
}

/** Format "Jun 14" from an ISO date. */
function fmtDay(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Format a detected date-range string ("YYYY-MM-DD..YYYY-MM-DD" or single) for display. */
function formatDateRange(v: string | null): string {
  if (!v) return "—";
  const parts = v.split("..");
  if (parts.length === 2) {
    const [a, b] = parts;
    return a === b ? fmtDay(a) : `${fmtDay(a)} – ${fmtDay(b)}`;
  }
  return fmtDay(v);
}

/** Overall status for file-list cards — mirrors computeJobOverallStatus semantics. */
function computeFileListOverallStatus(
  docs: FileListRow[],
  rows: ApiRow[],
  dbStatus: string
): JobOverallStatus {
  if (dbStatus === "LOCKED") return "Locked";
  if (dbStatus === "SENT_FOR_APPROVAL") return "Submitted";
  if (dbStatus === "APPROVED") return "Approved";

  const total = docs.length;
  const uploaded = docs.filter((d) => d.uploaded).length;
  if (uploaded === 0) return "Pending Upload";
  if (uploaded < total) return "Partial Upload";

  // All required docs uploaded.
  const hasErrors = rows.some(
    (r) =>
      r.validationStatus === "NEED_MANUAL_VALIDATION" ||
      r.validationStatus === "NEED_DISPUTE"
  );
  if (hasErrors) return "Needs Attention";
  if (rows.length > 0 && rows.every((r) => r.approvalStatus === "APPROVED")) return "Approved";
  if (rows.length > 0) return "Validated";
  return "In Progress";
}

interface DocRow {
  date?: string;
  docType: string;
  status: DocStatus;
}

interface ValidationCardData {
  key: string;
  name: string;
  icon: typeof FileSpreadsheet;
  progress: number;
  jobs: JobRow[];
  documents: DocRow[];
  daily?: boolean;
  /** Show date×document matrix driven by selected job */
  matrixMode?: boolean;
  href: string;
}

interface TabData {
  key: string;
  label: string;
  cards: ValidationCardData[];
}

const docMeta: Record<DocStatus, { chip: string; dot: string; icon: typeof CheckCircle2 }> = {
  Uploaded: { chip: "bg-success/10 text-success border-success/25", dot: "bg-success", icon: CheckCircle2 },
  Missing: { chip: "bg-destructive/10 text-destructive border-destructive/25", dot: "bg-destructive", icon: FileWarning },
  Pending: { chip: "bg-warning/10 text-warning border-warning/30", dot: "bg-warning", icon: Circle },
};

const jobStatusMeta: Record<JobValidationStatus, string> = {
  Validated: "bg-success/10 text-success border-success/25",
  Inprogress: "bg-warning/10 text-warning border-warning/30",
  Approved: "bg-primary/10 text-primary border-primary/25",
  "Locked & Processed": "bg-muted text-muted-foreground border-border",
};

const dateStatusMeta: Record<DateValidationStatus, { chip: string; icon: typeof CheckCircle2 }> = {
  "Need Manual Validation": { chip: "bg-destructive/10 text-destructive border-destructive/25", icon: FileWarning },
  Validated: { chip: "bg-success/10 text-success border-success/25", icon: CheckCircle2 },
  "Sent for Approval": { chip: "bg-warning/10 text-warning border-warning/30", icon: Clock },
  Approved: { chip: "bg-primary/10 text-primary border-primary/25", icon: ShieldCheck },
  ReValidate: { chip: "bg-destructive/10 text-destructive border-destructive/25", icon: Repeat },
  Locked: { chip: "bg-muted text-muted-foreground border-border", icon: Lock },
};

// Card metadata only — all job / document / matrix data is fetched live per card
// (see CARD_API_CONFIG + ValidationCard's realApi effects). No mock data.
const TABS: TabData[] = [
  {
    key: "payroll",
    label: "Payroll & Compliance",
    cards: [
      { key: "timecard", name: "Timecard Validation", icon: Clock, progress: 0, href: "/validation/timecard", matrixMode: true, jobs: [], documents: [] },
    ],
  },
  {
    key: "routes",
    label: "Routes",
    cards: [
      { key: "route-revenue", name: "Route Revenue Validation", icon: Map, progress: 0, href: "/validation/routes", matrixMode: true, jobs: [], documents: [] },
      { key: "route-invoice", name: "Route Invoice Validation", icon: Receipt, progress: 0, href: "/validation/routes/invoice", matrixMode: true, jobs: [], documents: [] },
    ],
  },
  {
    key: "fleet",
    label: "Fleets",
    cards: [
      { key: "fleet-rfs-afs", name: "RFS vs AFS Validation", icon: ShieldCheck, progress: 0, href: "/validation/fleet/rfs-afs", matrixMode: true, jobs: [], documents: [] },
      { key: "fleet-revenue", name: "Fleet Revenue Validation", icon: BadgeDollarSign, progress: 0, href: "/validation/fleet/revenue", matrixMode: true, jobs: [], documents: [] },
      { key: "rental", name: "Rental Validation", icon: Truck, progress: 0, href: "/validation/fleet/rental", matrixMode: true, jobs: [], documents: [] },
      { key: "repair", name: "Repair & Maintenance Validation", icon: Wrench, progress: 0, href: "/validation/fleet/repair", matrixMode: true, jobs: [], documents: [] },
      { key: "insurance", name: "Insurance Validation", icon: ShieldAlert, progress: 0, href: "/validation/fleet/insurance", matrixMode: true, jobs: [], documents: [] },
    ],
  },
];

function progressColor(progress: number) {
  if (progress >= 100) return "bg-success";
  if (progress === 0) return "bg-muted-foreground/40";
  if (progress < 50) return "bg-destructive";
  if (progress < 85) return "bg-warning";
  return "bg-success";
}

/** Timecard (real-API) progress-bar colour thresholds. */
function timecardBarColor(progress: number) {
  if (progress >= 80) return "bg-success";
  if (progress >= 50) return "bg-warning";
  if (progress > 0) return "bg-destructive";
  return "bg-muted";
}

function DocChip({ status }: { status: DocStatus }) {
  const m = docMeta[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase", m.chip)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {status}
    </span>
  );
}

function JobStatusChip({ status }: { status: JobValidationStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase", jobStatusMeta[status])}>
      {status}
    </span>
  );
}

function DateStatusChip({ status }: { status: DateValidationStatus }) {
  const m = dateStatusMeta[status];
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap", m.chip)}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

function FileStatusChip({ uploaded }: { uploaded: boolean }) {
  return uploaded ? (
    <span className="inline-flex items-center gap-1 rounded-md border border-success/25 bg-success/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-success">
      <CheckCircle2 className="h-3 w-3" />
      Uploaded
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
      <Clock className="h-3 w-3" />
      Pending
    </span>
  );
}

function DateStatusMatrixChip({ status }: { status: DateStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap",
        DATE_STATUS_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}

function DocCell({ status }: { status: DocStatus }) {
  if (status === "Uploaded")
    return (
      <span className="inline-flex items-center justify-center rounded-md bg-success/10 px-2 py-1 text-success">
        <CheckCircle2 className="h-3.5 w-3.5" />
      </span>
    );
  if (status === "Missing")
    return (
      <span className="inline-flex items-center justify-center rounded-md bg-destructive/10 px-2 py-1 text-destructive">
        <XCircle className="h-3.5 w-3.5" />
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center rounded-md bg-warning/10 px-2 py-1 text-warning">
      <Circle className="h-3.5 w-3.5" />
    </span>
  );
}

function ValidationCard({
  card,
  module,
  realApi = false,
}: {
  card: ValidationCardData;
  module: ValidationModule;
  realApi?: boolean;
}) {
  const navigate = useNavigate();
  const Icon = card.icon;
  const cfg = CARD_API_CONFIG[card.key];
  const layout: CardLayout = cfg?.layout ?? "date";

  /** Selection keys on the DB uuid (dbId) so it survives API reloads. */
  const [selectedDbId, setSelectedDbId] = useState<string | undefined>(card.jobs[0]?.dbId);
  const [createOpen, setCreateOpen] = useState(false);
  /** Local-only jobs for non-API cards. */
  const [localJobs, setLocalJobs] = useState<JobRow[]>(card.jobs);
  const createJob = useCreateJob();

  /* Real jobs for this card's module. */
  const jobsQuery = useJobs({ module: cfg?.module }, realApi && !!cfg);
  const jobs = useMemo(
    () => (realApi ? mapApiJobs(jobsQuery.data ?? []) : localJobs),
    [realApi, jobsQuery.data, localJobs]
  );

  /* Effective selection: the chosen job if it still exists, else the first
     non-LOCKED job (fallback: first job). */
  const effSelectedDbId =
    selectedDbId && jobs.some((j) => j.dbId === selectedDbId)
      ? selectedDbId
      : (jobs.find((j) => j.dbStatus !== "LOCKED") ?? jobs[0])?.dbId;
  const selectedJob = card.matrixMode
    ? jobs.find((j) => j.dbId === effSelectedDbId) ?? jobs[0] ?? null
    : undefined;

  /* Real documents + ValidationRows for the selected job: null = not yet loaded. */
  const apiDbId = realApi ? selectedJob?.dbId : undefined;
  const docsQuery = useJobDocuments(apiDbId);
  const rowsQuery = useJobRows(apiDbId, cfg?.rowType ?? "timecard");
  const apiDocs: ApiDocument[] | null = docsQuery.isError ? [] : docsQuery.data ?? null;
  const apiRows: ApiRow[] | null = rowsQuery.isError ? [] : rowsQuery.data ?? null;

  /* Real timecard progress (selected job) computed from ValidationRows. */
  const tcProgress = (() => {
    const total = apiRows?.length ?? 0;
    if (!apiRows || total === 0) return 0;
    const progressed = apiRows.filter(
      (r) =>
        r.validationStatus === "VALIDATED" ||
        r.approvalStatus === "SENT_FOR_APPROVAL" ||
        r.approvalStatus === "APPROVED"
    ).length;
    return Math.round((progressed / total) * 100);
  })();

  /* ---- File-list matrix (layout === "file") ---- */
  const fileListDocTypes =
    realApi && layout === "file"
      ? apiDocs && apiDocs.length > 0
        ? Array.from(new Set(apiDocs.map((d) => d.docType)))
        : cfg?.requiredDocs ?? []
      : [];
  const fileRows: FileListRow[] = fileListDocTypes.map((dt) => {
    const doc = (apiDocs ?? []).find((d) => d.docType === dt);
    return {
      docType: dt,
      dateRange: formatDateRange(doc?.date ?? null),
      uploaded: doc?.status === "UPLOADED",
    };
  });
  const fileOverallStatus =
    realApi && layout === "file" && selectedJob
      ? computeFileListOverallStatus(fileRows, apiRows ?? [], selectedJob.dbStatus ?? "")
      : null;
  const fileProgress =
    apiRows && apiRows.length > 0
      ? Math.round(
          (apiRows.filter((r) => r.validationStatus === "VALIDATED").length / apiRows.length) * 100
        )
      : fileRows.length > 0
      ? Math.round((fileRows.filter((r) => r.uploaded).length / fileRows.length) * 100)
      : 0;

  const effProgress = realApi ? (layout === "file" ? fileProgress : tcProgress) : card.progress;
  const barColor = realApi ? timecardBarColor(effProgress) : progressColor(effProgress);

  /* Build matrix (columns = distinct docTypes, rows = dates present). */
  const realDocTypes = realApi
    ? Array.from(new Set((apiDocs ?? []).map((d) => d.docType)))
    : [];
  const realDates = realApi
    ? Array.from(new Set((apiDocs ?? []).map((d) => d.date).filter((d): d is string => !!d)))
    : [];
  const realDays: DayMatrixRow[] = realApi
    ? realDates.map((date) => {
        const docs = realDocTypes.reduce<Record<string, DocStatus>>((acc, dt) => {
          const found = (apiDocs ?? []).find((d) => d.date === date && d.docType === dt);
          acc[dt] = found ? apiDocStatus(found.status) : "Pending";
          return acc;
        }, {});
        const allUp = Object.values(docs).every((s) => s === "Uploaded");
        return { date, docs, validation: allUp ? "Validated" : "Need Manual Validation" };
      })
    : [];

  /* Per-date document matrix (Timecard real-API card only). */
  const dateInfos: (DateStatusInfo & { breakUploaded: boolean })[] = realApi && selectedJob
    ? getJobDates(selectedJob).map(({ isoDate, dateLabel }) => {
        const matchesDate = (v: string | null) => v === dateLabel || v === isoDate;
        const docsForDate = (apiDocs ?? []).filter((d) => matchesDate(d.date));
        const payrollUploaded = docsForDate.some(
          (d) => d.docType === "Payroll Export" && d.status === "UPLOADED"
        );
        const amazonUploaded = docsForDate.some(
          (d) => d.docType === "Amazon Itinerary" && d.status === "UPLOADED"
        );
        const breakUploaded = docsForDate.some(
          (d) => d.docType === "Amazon Break Report" && d.status === "UPLOADED"
        );
        const dateRows = (apiRows ?? []).filter(
          (r) => r.date === isoDate || r.date === dateLabel
        );
        const hasValidationRows = dateRows.length > 0;
        const hasErrors = dateRows.some(
          (r) => r.validationStatus === "NEED_MANUAL_VALIDATION"
        );
        const allApproved =
          hasValidationRows && dateRows.every((r) => r.approvalStatus === "APPROVED");
        const status = computeDateStatus({
          payrollUploaded,
          amazonUploaded,
          hasValidationRows,
          hasErrors,
          allApproved,
        });
        return {
          isoDate,
          dateLabel,
          status,
          payrollUploaded,
          amazonUploaded,
          breakUploaded,
          hasErrors,
          allApproved,
          rowCount: dateRows.length,
        };
      })
    : [];

  const jobOverallStatus =
    realApi && selectedJob
      ? computeJobOverallStatus(
          dateInfos.map((d) => d.status),
          selectedJob.dbStatus ?? ""
        )
      : null;

  const jobIdPrefix = (() => {
    const first = card.jobs[0]?.jobId ?? "JOB";
    const parts = first.split("-");
    return parts.length > 2 ? parts.slice(0, -2).join("-") : parts[0];
  })();

  const handleCreate = async (draft: JobDraft) => {
    if (!realApi || !cfg) {
      // Non-API cards: keep local-only behaviour.
      const periodLabel =
        draft.periodStart && draft.periodEnd
          ? `${draft.periodStart} → ${draft.periodEnd}`
          : draft.periodStart || draft.periodEnd || "—";
      setLocalJobs((prev) => [
        {
          jobId: draft.jobId,
          frequency: (draft.frequency === "Bi-Weekly" ? "Weekly" : draft.frequency) as Frequency,
          period: periodLabel,
          status: "Inprogress",
          documents: card.jobs[0]?.documents,
          days: [],
        },
        ...prev,
      ]);
      toast.success("Job created", { description: `${draft.jobId} · ${card.name}` });
      return;
    }

    try {
      const created = await createJob.mutateAsync({
        module: cfg.module as JobModule,
        frequency: String(draft.frequency ?? "WEEKLY")
          .toUpperCase()
          .replace(/[-\s]/g, "_"),
        periodStart: draft.periodStart,
        periodEnd: draft.periodEnd,
        processDate: draft.processDate ?? draft.periodEnd,
      });
      toast.success("Job created", {
        description: `${created?.jobId ?? draft.jobId} · ${card.name}`,
      });

      // Mutation success invalidates the module's jobs; select the new job by its DB uuid.
      if (created?.id) setSelectedDbId(created.id);
    } catch {
      toast.error("Failed to create job", { description: `${card.name}` });
    }
  };

  /* Effective matrix data: real API for the Timecard card, mock otherwise. */
  const effDays = realApi ? realDays : selectedJob?.days ?? [];
  const effDocTypes = realApi ? realDocTypes : selectedJob?.documents ?? [];

  const missing =
    realApi && layout === "file"
      ? 0
      : card.matrixMode
      ? effDays.reduce(
          (acc, day) =>
            acc + Object.values(day.docs).filter((s) => s === "Missing").length,
          0
        )
      : card.documents.filter((d) => d.status === "Missing").length;
  const pending =
    realApi && layout === "file"
      ? fileRows.filter((r) => !r.uploaded).length
      : card.matrixMode
      ? effDays.reduce(
          (acc, day) =>
            acc + Object.values(day.docs).filter((s) => s === "Pending").length,
          0
        )
      : card.documents.filter((d) => d.status === "Pending").length;

  return (
    <div
      className={cn(
        "aeon-card group flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-glow",
        card.matrixMode && "md:col-span-2 xl:col-span-3"
      )}
    >
      {/* TOP */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex min-w-0 flex-col">
            <h3 className="truncate text-base font-extrabold leading-tight tracking-tight">{card.name}</h3>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {realApi && layout === "file"
                ? `${fileListDocTypes.length} document${fileListDocTypes.length === 1 ? "" : "s"} tracked`
                : realApi
                ? `${dateInfos.length} day${dateInfos.length === 1 ? "" : "s"} · 3 documents tracked`
                : card.matrixMode
                ? `${effDays.length} day${effDays.length > 1 ? "s" : ""} · ${effDocTypes.length} documents tracked`
                : `${card.documents.length} document${card.documents.length > 1 ? "s" : ""} tracked`}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCreateOpen(true)}
            className="h-8 gap-1.5 rounded-lg text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Job
          </Button>
        </div>
      </div>

      {/* JOBS */}
      <div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-card/60">
        <div
          className={cn(
            "grid gap-2 border-b bg-muted/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
            card.matrixMode
              ? "grid-cols-[1fr_0.7fr_1.4fr_1fr_auto]"
              : "grid-cols-[1fr_0.8fr_1.4fr]"
          )}
        >
          <span>Job ID</span>
          <span>Frequency</span>
          <span>Period</span>
          {card.matrixMode && <span>Validation Status</span>}
          {card.matrixMode && <span>Actions</span>}
        </div>
        <ul className="divide-y divide-border/60">
          {jobs.map((j) => {
            const isSelected = card.matrixMode && j.dbId === effSelectedDbId;
            return (
              <li
                key={j.dbId ?? j.jobId}
                onClick={() => card.matrixMode && setSelectedDbId(j.dbId)}
                className={cn(
                  "grid items-center gap-2 px-3 py-2 text-xs",
                  card.matrixMode
                    ? "grid-cols-[1fr_0.7fr_1.4fr_1fr_auto] cursor-pointer hover:bg-muted/30"
                    : "grid-cols-[1fr_0.8fr_1.4fr]",
                  isSelected && "bg-primary/5"
                )}
              >
                <span className="flex items-center gap-2 truncate font-bold">
                  {card.matrixMode && (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isSelected ? "bg-primary" : "bg-transparent border border-border"
                      )}
                    />
                  )}
                  <span className="truncate">{j.jobId}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Repeat className="h-3 w-3" /> {j.frequency}
                </span>
                <span className="inline-flex items-center gap-1.5 truncate text-muted-foreground">
                  <CalendarDays className="h-3 w-3 shrink-0" />
                  <span className="truncate">{j.period}</span>
                </span>
                {card.matrixMode && <JobStatusChip status={j.status} />}
                {card.matrixMode && (
                  <span onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`${card.href}?job=${j.dbId ?? ""}`)}
                      className="h-7 gap-1 rounded-lg px-2 text-[11px] font-semibold"
                    >
                      View
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", barColor)} style={{ width: `${effProgress}%` }} />
        </div>
        <div className="text-xs font-extrabold text-primary tabular-nums">{effProgress}%</div>
        {jobOverallStatus && (
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase",
              JOB_STATUS_STYLES[jobOverallStatus]
            )}
          >
            {jobOverallStatus}
          </span>
        )}
      </div>

      {/* REQUIRED DOCS */}
      <div className="mt-3 overflow-hidden rounded-xl border border-border/70">
        <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {card.matrixMode
              ? `Required Documents · ${selectedJob?.jobId}`
              : card.daily
              ? "Daily Upload Status"
              : "Required Documents"}
          </span>
          <div className="flex items-center gap-2 text-[10px] font-semibold">
            {missing > 0 && <span className="text-destructive">{missing} missing</span>}
            {pending > 0 && <span className="text-warning">{pending} pending</span>}
          </div>
        </div>

        {realApi && layout === "file" ? (
          !selectedJob ? (
            <div className="px-3 py-10 text-center text-xs text-muted-foreground">
              Select a job to view document status
            </div>
          ) : apiDocs === null || apiRows === null ? (
            <div className="px-3 py-10 text-center text-xs text-muted-foreground">
              Loading document status…
            </div>
          ) : fileRows.length === 0 ? (
            <div className="px-3 py-10 text-center text-xs text-muted-foreground">
              No required documents for this job
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
                  <tr className="bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="sticky left-0 z-10 bg-muted/20 px-3 py-2 text-left">Document</th>
                    <th className="px-3 py-2 text-left">Date Range</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {fileRows.map((row) => (
                    <tr key={row.docType} className="hover:bg-muted/20">
                      <td className="sticky left-0 z-10 bg-card px-3 py-2 font-bold">
                        {row.docType}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {row.dateRange}
                      </td>
                      <td className="px-3 py-2">
                        <FileStatusChip uploaded={row.uploaded} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {fileOverallStatus && (
                <div className="flex items-center gap-2 border-t bg-muted/20 px-3 py-2 text-[11px]">
                  <span className="font-bold uppercase tracking-wider text-muted-foreground">
                    Overall status
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap",
                      JOB_STATUS_STYLES[fileOverallStatus]
                    )}
                  >
                    {fileOverallStatus}
                  </span>
                </div>
              )}
            </div>
          )
        ) : realApi ? (
          !selectedJob ? (
            <div className="px-3 py-10 text-center text-xs text-muted-foreground">
              Select a job to view document status
            </div>
          ) : apiDocs === null || apiRows === null ? (
            <div className="px-3 py-10 text-center text-xs text-muted-foreground">
              Loading document status…
            </div>
          ) : dateInfos.length === 0 ? (
            <div className="px-3 py-10 text-center text-xs text-muted-foreground">
              No dates in this job&apos;s period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
                  <tr className="bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="sticky left-0 z-10 bg-muted/20 px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-center">Payroll Export</th>
                    <th className="px-3 py-2 text-center">Amazon Itinerary</th>
                    <th className="px-3 py-2 text-center">Amazon Break Report</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Rows</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {dateInfos.map((info) => (
                    <tr
                      key={info.isoDate}
                      className={cn("border", DATE_STATUS_STYLES[info.status])}
                    >
                      <td className="sticky left-0 z-10 bg-card px-3 py-2 font-bold whitespace-nowrap">
                        {info.dateLabel}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <FileStatusChip uploaded={info.payrollUploaded} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <FileStatusChip uploaded={info.amazonUploaded} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <FileStatusChip uploaded={info.breakUploaded} />
                      </td>
                      <td className="px-3 py-2">
                        <DateStatusMatrixChip status={info.status} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {info.rowCount > 0 ? `${info.rowCount} drivers` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {jobOverallStatus && (
                <div className="flex items-center gap-2 border-t bg-muted/20 px-3 py-2 text-[11px]">
                  <span className="font-bold uppercase tracking-wider text-muted-foreground">
                    Overall status
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap",
                      JOB_STATUS_STYLES[jobOverallStatus]
                    )}
                  >
                    {jobOverallStatus}
                  </span>
                </div>
              )}
            </div>
          )
        ) : card.matrixMode && selectedJob ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
                <tr className="bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="sticky left-0 z-10 bg-muted/20 px-3 py-2 text-left">Date</th>
                  {effDocTypes.map((doc) => (
                    <th key={doc} className="px-3 py-2 text-center">
                      {doc}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left">Validation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {effDays.map((day) => (
                  <tr key={day.date} className="hover:bg-muted/20">
                    <td className="sticky left-0 z-10 bg-card px-3 py-2 font-bold whitespace-nowrap">
                      {day.date}
                    </td>
                    {effDocTypes.map((doc) => (
                      <td key={doc} className="px-3 py-2 text-center">
                        <DocCell status={day.docs[doc]} />
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <DateStatusChip status={day.validation} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ul className="max-h-44 divide-y divide-border/60 overflow-auto">
            {card.documents.map((d, i) => (
              <li
                key={i}
                className={cn(
                  "grid items-center gap-2 px-3 py-1.5 text-xs",
                  card.daily ? "grid-cols-[0.6fr_1.4fr_auto]" : "grid-cols-[1fr_auto]"
                )}
              >
                {card.daily && <span className="font-bold text-foreground">{d.date}</span>}
                <span className="truncate text-foreground">{d.docType}</span>
                <DocChip status={d.status} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateJobDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        module={module}
        validationType={card.name}
        jobIdPrefix={jobIdPrefix}
        onCreate={handleCreate}
      />
    </div>
  );
}

const ValidationHome = () => {
  const [active, setActive] = useState<string>(TABS[0].key);
  const activeTab = TABS.find((t) => t.key === active) ?? TABS[0];

  return (
    <AppLayout title="Validation" subtitle="Select a module to begin validating records">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Validation</h1>
          <p className="text-sm text-muted-foreground">Operational validation workflows by domain</p>
        </div>

        <div className="aeon-soft overflow-hidden">
          <nav className="flex items-center gap-1 overflow-x-auto px-2" role="tablist">
            {TABS.map((tab) => {
              const isActive = tab.key === active;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(tab.key)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    {tab.cards.length}
                  </span>
                  <span className={cn("absolute inset-x-2 -bottom-px h-[3px] rounded-full transition-all", isActive ? "bg-primary opacity-100" : "opacity-0")} />
                </button>
              );
            })}
          </nav>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {activeTab.cards.map((card) => (
            <ValidationCard
              key={card.key}
              card={card}
              realApi={CARD_API_CONFIG[card.key] !== undefined}
              module={(activeTab.key === "routes" ? "route" : activeTab.key === "fleet" ? "fleet" : "payroll") as ValidationModule}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default ValidationHome;
