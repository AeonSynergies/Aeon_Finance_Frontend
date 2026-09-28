
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import * as XLSX from "xlsx";
import {
  Check,
  X,
  Download,
  FileSpreadsheet,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  ChevronDown,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { apiError } from "@/services/client";
import { useUpload, useUploadProcess } from "@/hooks/useUpload";
import { useFetchJobs } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fmt, convertExcelDate } from "@/lib/formatters";
import {
  UPLOAD_MASTERS,
  autoMapColumns,
  type UploadMaster,
  type UploadModule,
} from "./uploadMasters";

/* ─────────────────────────  Domains  ───────────────────────── */

const ANALYTICS_DOMAIN = "Analytics";

/* ─────────────────────────  Issue parsing / cell helpers  ───────────────────────── */

interface ParsedIssue {
  row: number | null;
  field: string | null;
  message: string;
  severity: "error" | "warning";
}

function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseIssue(raw: string, severity: "error" | "warning"): ParsedIssue {
  const rowMatch = raw.match(/^Row (\d+):\s*(.*)$/);
  if (rowMatch) {
    const rest = rowMatch[2];
    const fieldMatch = rest.match(/"([^"]+)"/);
    return {
      row: Number(rowMatch[1]),
      field: fieldMatch ? fieldMatch[1] : null,
      message: rest,
      severity,
    };
  }
  return { row: null, field: null, message: raw, severity };
}

function isExcelSerial(v: unknown): boolean {
  return typeof v === "number" && v > 40000 && v < 50000;
}

/** Render a preview cell value with hours / Excel-date formatting. */
function formatCell(col: string, val: unknown): string {
  if (val === undefined || val === null || val === "") return "—";
  const lower = col.toLowerCase();
  if (lower.includes("hours")) {
    return fmt.hours(val as number | string);
  }
  if (lower.includes("date") || isExcelSerial(val)) {
    return convertExcelDate(val);
  }
  return String(val);
}

/* ─────────────────────────  Types  ───────────────────────── */

interface ProcessResponse {
  success: boolean;
  rowCount: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  detectedColumns: string[];
  sampleRows: Record<string, unknown>[];
  errors: string[];
  warnings: string[];
  processedRowsByDate?: Record<string, Record<string, unknown>[]>;
  detectedDateRange?: { start: string; end: string };
}

interface PerDateResult {
  date: string;
  total: number;
  validated: number;
  needsReview: number;
  reconciled: boolean;
}

interface SubmitResponse {
  success: boolean;
  rowsProcessed: number;
  rowsImported: number;
  rowsSkipped: number;
  module: string;
  jobId: string | null;
  issues?: string[];
  summary?: PerDateResult[];
  message?: string;
  reconciliation?: { total: number; validated: number; needsReview: number };
  dateRange?: { start: string; end: string };
}

interface JobRow {
  id: string;
  periodStart: string;
  periodEnd: string;
}

/** Human date label "Mon Feb 15" from an ISO "YYYY-MM-DD" string. */
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
function isoToLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (isNaN(d.getTime())) return iso;
  return `${WEEKDAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

type Step = 1 | 2 | 3 | 4;

const MODULE_PATH: Record<UploadModule, string> = {
  TIMECARD: "/validation/timecard",
  ROUTE_REVENUE: "/validation/routes",
  ROUTE_INVOICE: "/validation/routes/invoice",
  RFS_AFS: "/validation/fleet/rfs-afs",
  FLEET_REVENUE: "/validation/fleet/revenue",
  RENTAL: "/validation/fleet/rental",
  REPAIR_MAINTENANCE: "/validation/fleet/repair",
  INSURANCE: "/validation/fleet/insurance",
};

const MAX_SIZE = 2 * 1024 * 1024; // 2MB

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/* ─────────────────────────  Step indicator  ───────────────────────── */

const STEP_LABELS: Record<Step, string> = {
  1: "File Upload",
  2: "Column Mapping",
  3: "Data Preview",
  4: "Finish",
};

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = [1, 2, 3, 4];
  return (
    <div className="flex items-center">
      {steps.map((s, i) => {
        const completed = s < current;
        const isCurrent = s === current;
        return (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  completed && "bg-primary text-primary-foreground",
                  isCurrent && "border-2 border-primary text-primary",
                  !completed && !isCurrent && "border-2 border-border text-muted-foreground"
                )}
              >
                {completed ? <Check className="h-5 w-5" /> : s}
              </div>
              <span
                className={cn(
                  "text-xs",
                  isCurrent ? "font-semibold text-primary" : "text-muted-foreground"
                )}
              >
                {STEP_LABELS[s]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 flex-1 rounded-full transition-colors",
                  s < current ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────  Main page  ───────────────────────── */

export function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [domain, setDomain] = useState<string>("");
  const [masterId, setMasterId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processed, setProcessed] = useState<ProcessResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [autoJobId, setAutoJobId] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState<string>("");
  const processMutation = useUploadProcess<ProcessResponse & { error?: string }>();
  const submitMutation = useUpload<SubmitResponse & { error?: string }>("submit");
  const processing = processMutation.isPending;
  const submitting = submitMutation.isPending;
  const fetchJobs = useFetchJobs();

  const master = useMemo<UploadMaster | null>(
    () => UPLOAD_MASTERS.find((m) => m.id === masterId) ?? null,
    [masterId]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, UploadMaster[]>();
    for (const m of UPLOAD_MASTERS) {
      if (!map.has(m.group)) map.set(m.group, []);
      map.get(m.group)!.push(m);
    }
    return Array.from(map.entries());
  }, []);

  const domains = useMemo(() => {
    const list = grouped.map(([g]) => g);
    if (!list.includes(ANALYTICS_DOMAIN)) list.push(ANALYTICS_DOMAIN);
    return list;
  }, [grouped]);

  const domainMasters = useMemo(
    () => UPLOAD_MASTERS.filter((m) => m.group === domain),
    [domain]
  );

  function reset() {
    setStep(1);
    setDomain("");
    setMasterId("");
    setFile(null);
    setProcessed(null);
    setMapping({});
    setSubmitResult(null);
    setSubmitError(null);
    setUploadError(null);
    setAutoJobId(null);
    processMutation.reset();
    submitMutation.reset();
    setReportDate("");
  }

  /**
   * G4 — auto-select the TIMECARD job whose period contains any detected date.
   * Defensive: any failure leaves job selection to the server's latest-job
   * fallback. `detectedDates` are ISO "YYYY-MM-DD" strings from the process step.
   */
  async function autoMatchJob(detectedDates: string[]) {
    if (detectedDates.length === 0) return;
    try {
      const jobs: JobRow[] = await fetchJobs("TIMECARD");
      const match = jobs.find((j) => {
        const start = j.periodStart.slice(0, 10);
        const end = j.periodEnd.slice(0, 10);
        return detectedDates.some((d) => d >= start && d <= end);
      });
      if (match) setAutoJobId(match.id);
    } catch {
      // ignore — fall back to manual/server job resolution
    }
  }

  /**
   * Non-timecard auto-match: select the job for `module` whose [periodStart,
   * periodEnd] overlaps the detected date range. Defensive: any failure leaves
   * job selection to the server's overlap/latest-job fallback.
   */
  async function autoMatchJobRange(
    module: UploadModule,
    range: { start: string; end: string }
  ) {
    try {
      const jobs: JobRow[] = await fetchJobs(module);
      const match = jobs.find((j) => {
        const start = j.periodStart.slice(0, 10);
        const end = j.periodEnd.slice(0, 10);
        // Overlap: start <= range.end AND end >= range.start.
        return start <= range.end && end >= range.start;
      });
      if (match) setAutoJobId(match.id);
    } catch {
      // ignore — fall back to manual/server job resolution
    }
  }

  function chooseFile(f: File | null) {
    if (!f) return;
    const okExt = /\.(xls|xlsx|csv)$/i.test(f.name);
    if (!okExt) {
      toast.error("Only .xls, .xlsx, or .csv files are accepted");
      return;
    }
    if (f.size >= MAX_SIZE) {
      toast.error(`File too large — max ${formatSize(MAX_SIZE)}`);
      return;
    }
    setFile(f);
    setProcessed(null);
    setUploadError(null);
  }

  async function runProcess(nextMaster: UploadMaster, nextFile: File) {
    setProcessed(null);
    setUploadError(null);
    const showError = (msg: string) => {
      setUploadError(msg);
      setProcessed(null);
      toast.error(msg, { duration: 6000 });
      setTimeout(
        () =>
          errorBannerRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          }),
        100
      );
    };
    try {
      const fd = new FormData();
      fd.append("masterId", nextMaster.id);
      fd.append("file", nextFile);
      fd.append("reportDate", reportDate ?? "");
      let data: ProcessResponse & { error?: string };
      try {
        data = await processMutation.mutateAsync(fd);
      } catch (e) {
        // Hard rejection (e.g. 422: no date column / no data rows). Surface the
        // error as a destructive banner and do not advance past Step 1.
        showError(apiError(e, "Failed to process file"));
        return;
      }
      if (data.success === false && data.error) {
        showError(data.error);
        return;
      }
      setProcessed(data);
      setMapping(autoMapColumns(data.detectedColumns, nextMaster.requiredColumns));
      // G4: for a TIMECARD master, auto-select the job overlapping the file dates.
      if (nextMaster.module === "TIMECARD" && data.processedRowsByDate) {
        const dates = Object.keys(data.processedRowsByDate).filter(
          (k) => k && k !== "unknown"
        );
        void autoMatchJob(dates);
      }
      // Non-timecard: auto-select the job whose period overlaps the file range.
      if (nextMaster.module !== "TIMECARD" && data.detectedDateRange) {
        void autoMatchJobRange(nextMaster.module, data.detectedDateRange);
      }
      if (!data.success) {
        toast.error("File is missing required columns");
      } else {
        toast.success("File processed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to process file");
    }
  }

  // Trigger processing once both master and file are ready.
  function maybeProcess(m: UploadMaster | null, f: File | null) {
    if (m?.requiresDateInput && !reportDate) {
      toast.error("Please enter the report date before uploading");
      return;
    }
    if (m && f) void runProcess(m, f);
  }

  function downloadTemplate() {
    if (!master) return;
    const headers = [...master.requiredColumns, ...master.optionalColumns];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, master.sampleFileName);
  }

  const requiredUnmapped = useMemo(
    () =>
      master ? master.requiredColumns.filter((f) => !mapping[f]) : [],
    [master, mapping]
  );

  async function submit() {
    if (!master || !file) return;
    setSubmitError(null);
    try {
      const fd = new FormData();
      fd.append("masterId", master.id);
      fd.append("file", file);
      fd.append("mapping", JSON.stringify(mapping));
      fd.append("reportDate", reportDate ?? "");
      if (autoJobId) fd.append("jobId", autoJobId);
      if (processed?.processedRowsByDate) {
        let rowsByDate = processed.processedRowsByDate;
        if (master?.requiresDateInput && reportDate) {
          const allRows = Object.values(rowsByDate).flat();
          rowsByDate = { [reportDate]: allRows };
        }
        fd.append("processedRowsByDate", JSON.stringify(rowsByDate));
      }
      if (processed?.detectedDateRange) {
        fd.append(
          "detectedDateRange",
          JSON.stringify(processed.detectedDateRange)
        );
      }
      const data = await submitMutation.mutateAsync(fd);
      if (!data.success) {
        throw new Error(data.error ?? "Upload failed");
      }
      setSubmitResult(data);
      setStep(4);
    } catch (e) {
      setSubmitError(apiError(e, "Upload failed"));
      setStep(4);
    }
  }

  /* ─────────────────────────  Render  ───────────────────────── */

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Add Data</h1>
          <p className="text-sm text-muted-foreground">Import New Excel Sheet</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            Active <span className="text-success">●</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg text-xs"
            onClick={reset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {/* Step indicator */}
      <div className="aeon-card rounded-2xl border bg-gradient-card p-6 shadow-soft">
        <StepIndicator current={step} />
      </div>

      {/* Steps */}
      {step === 1 && (
        <StepUpload
          domains={domains}
          domain={domain}
          onDomainChange={(d) => {
            setDomain(d);
            setMasterId("");
            setFile(null);
            setProcessed(null);
            setReportDate("");
          }}
          domainMasters={domainMasters}
          masterId={masterId}
          master={master}
          onMasterChange={(id) => {
            setMasterId(id);
            setReportDate("");
            const m = UPLOAD_MASTERS.find((x) => x.id === id) ?? null;
            maybeProcess(m, file);
          }}
          file={file}
          fileInputRef={fileInputRef}
          dragOver={dragOver}
          setDragOver={setDragOver}
          onFile={(f) => {
            chooseFile(f);
            const okExt = f && /\.(xls|xlsx|csv)$/i.test(f.name) && f.size < MAX_SIZE;
            if (okExt) maybeProcess(master, f);
          }}
          onRemoveFile={() => {
            setFile(null);
            setProcessed(null);
          }}
          onDownloadTemplate={downloadTemplate}
          processing={processing}
          processed={processed}
          uploadError={uploadError}
          onClearError={() => setUploadError(null)}
          errorBannerRef={errorBannerRef}
          reportDate={reportDate}
          onReportDateChange={setReportDate}
          onCancel={() => navigate("/validation")}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && master && processed && (
        <StepMapping
          master={master}
          processed={processed}
          mapping={mapping}
          onMapChange={(field, col) =>
            setMapping((prev) => ({ ...prev, [field]: col || null }))
          }
          requiredUnmapped={requiredUnmapped}
          onBack={() => setStep(1)}
          onCancel={() => navigate("/validation")}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && master && processed && (
        <StepPreview
          processed={processed}
          submitting={submitting}
          onBack={() => setStep(2)}
          onCancel={() => navigate("/validation")}
          onSubmit={submit}
        />
      )}

      {step === 4 && (
        <StepFinish
          master={master}
          file={file}
          result={submitResult}
          error={submitError}
          onGoToValidation={() => {
            if (master) navigate(MODULE_PATH[master.module]);
          }}
          onUploadAnother={reset}
          onTryAgain={() => setStep(3)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────  Step 1  ───────────────────────── */

function StepUpload({
  domains,
  domain,
  onDomainChange,
  domainMasters,
  masterId,
  master,
  onMasterChange,
  file,
  fileInputRef,
  dragOver,
  setDragOver,
  onFile,
  onRemoveFile,
  onDownloadTemplate,
  processing,
  processed,
  uploadError,
  onClearError,
  errorBannerRef,
  reportDate,
  onReportDateChange,
  onCancel,
  onNext,
}: {
  domains: string[];
  domain: string;
  onDomainChange: (d: string) => void;
  domainMasters: UploadMaster[];
  masterId: string;
  master: UploadMaster | null;
  onMasterChange: (id: string) => void;
  file: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  onFile: (f: File) => void;
  onRemoveFile: () => void;
  onDownloadTemplate: () => void;
  processing: boolean;
  processed: ProcessResponse | null;
  uploadError: string | null;
  onClearError: () => void;
  errorBannerRef: React.RefObject<HTMLDivElement | null>;
  reportDate: string;
  onReportDateChange: (v: string) => void;
  onCancel: () => void;
  onNext: () => void;
}) {
  const isAnalytics = domain === ANALYTICS_DOMAIN;
  const requiresDateInput = Boolean(master?.requiresDateInput);
  return (
    <div className="space-y-6">
      {/* Domain selector */}
      <div className="aeon-card space-y-2 rounded-2xl border bg-gradient-card p-6 shadow-soft">
        <label className="block text-sm font-semibold">Choose a Domain</label>
        <Select value={domain} onValueChange={onDomainChange}>
          <SelectTrigger className="mt-1.5 h-11 rounded-xl border-border/70 bg-card shadow-soft">
            <SelectValue placeholder="🔍 Select Domain" />
          </SelectTrigger>
          <SelectContent>
            {domains.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: master picker */}
        <div className="aeon-card space-y-4 rounded-2xl border bg-gradient-card p-6 shadow-soft">
          <label className="block text-sm font-semibold">Choose a Master</label>
          {!domain ? (
            <p className="text-xs text-muted-foreground">Select a domain to begin.</p>
          ) : isAnalytics ? (
            <p className="text-xs text-muted-foreground">
              No uploads for Analytics yet.
            </p>
          ) : (
            <div className="space-y-2">
              {domainMasters.map((m) => {
                const selected = masterId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onMasterChange(m.id)}
                    className={cn(
                      "aeon-card flex w-full items-start gap-3 p-3 text-left transition-all hover:-translate-y-0.5",
                      selected && "border-primary bg-primary/5"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 text-base leading-none",
                        selected ? "text-primary" : "text-muted-foreground"
                      )}
                      aria-hidden
                    >
                      {selected ? "◉" : "○"}
                    </span>
                    <span className="space-y-0.5">
                      <span className="block text-sm font-semibold">{m.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {m.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={onDownloadTemplate}
            disabled={!master}
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-semibold",
              master
                ? "text-primary hover:underline"
                : "cursor-not-allowed text-muted-foreground opacity-60"
            )}
          >
            <Download className="h-4 w-4" />
            Download Sample Template
          </button>
        </div>

        {/* Right: dropzone (only once a master is selected) */}
        {master ? (
        <div className="space-y-4">
        {requiresDateInput && (
          <div className="rounded-2xl border-2 border-warning/40 bg-warning/10 p-5 shadow-soft">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
              <div className="w-full space-y-2">
                <p className="text-sm font-bold text-warning-foreground">
                  Report Date Required
                </p>
                <p className="text-xs text-muted-foreground">
                  This report does not contain a date column. Enter the date this
                  report covers so uploaded rows can be assigned to the correct
                  day.
                </p>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => onReportDateChange(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border/70 bg-card px-3 text-sm shadow-soft focus:border-primary focus:outline-none"
                />
                {reportDate ? (
                  <p className="text-xs font-medium text-foreground">
                    Selected: {isoToLabel(reportDate)}
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-destructive">
                    You must enter a date before uploading
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="aeon-card rounded-2xl border bg-gradient-card p-6 shadow-soft">
          <input
            ref={fileInputRef}
            type="file"
            accept={master?.fileType === ".csv" ? ".csv" : ".xls,.xlsx,.csv"}
            className="hidden"
            onChange={(e) => {
              onClearError();
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) onFile(f);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 px-6 py-10 text-center transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand shadow-glow">
                <FileSpreadsheet className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="text-sm font-semibold">
                Drop your Excel file here or click to browse
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                .xls or .xlsx up to 2 MB
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <UploadCloud className="h-4 w-4 text-success" />
                <span className="font-medium">✓ {file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({formatSize(file.size)})
                </span>
              </div>
              <button
                onClick={onRemoveFile}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        </div>
        ) : (
          <div className="aeon-card flex items-center justify-center rounded-2xl border border-dashed bg-gradient-card p-6 text-center text-sm text-muted-foreground shadow-soft">
            Select a master to upload a file.
          </div>
        )}
      </div>

      {/* Hard rejection banner (e.g. no date column / empty file) */}
      {uploadError && (
        <div
          ref={errorBannerRef}
          className="flex items-start gap-3 rounded-xl border-2 border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <p className="text-base font-bold">File rejected</p>
            <p className="whitespace-pre-line">{uploadError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-8 rounded-lg border-destructive/40 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onClearError}
            >
              Dismiss and try again
            </Button>
          </div>
        </div>
      )}

      {/* Process status */}
      {processing && (
        <div className="aeon-card rounded-2xl border bg-gradient-card p-6 text-sm text-muted-foreground shadow-soft">
          Processing file…
        </div>
      )}
      {processed && !processing && (
        <div className="aeon-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-gradient-card p-4 text-sm shadow-soft">
          <span className="font-semibold">
            {processed.success
              ? "File processed — ready for column mapping"
              : "File is missing required columns"}
          </span>
          <StatusBar processed={processed} />
        </div>
      )}

      {/* Bottom bar */}
      <div className="flex items-center justify-between">
        <Button variant="outline" className="rounded-xl" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className="gap-1.5 rounded-xl bg-gradient-brand font-semibold shadow-glow"
          disabled={!processed?.success}
          onClick={onNext}
        >
          Next <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PreviewTable({
  processed,
  maxHeightClass = "max-h-[calc(100vh-300px)] min-h-[300px]",
  showAllRows = false,
}: {
  processed: ProcessResponse;
  maxHeightClass?: string;
  showAllRows?: boolean;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const rows = showAllRows
    ? Object.values(processed.processedRowsByDate ?? {})
        .flat()
        .slice(0, 500)
    : processed.sampleRows;
  const cols = processed.detectedColumns;

  // Parse issue strings into structured records.
  const issues = useMemo<ParsedIssue[]>(() => {
    const parsed = [
      ...processed.errors.map((e) => parseIssue(e, "error")),
      ...processed.warnings.map((w) => parseIssue(w, "warning")),
    ];
    // Add an Excel-serial conversion note if any serial values are present.
    const hasSerial = rows.some((r) => cols.some((c) => isExcelSerial(r[c])));
    const noteText = "Excel serial detected — will be auto-converted";
    if (hasSerial && !parsed.some((p) => p.message === noteText)) {
      parsed.push({ row: null, field: null, message: noteText, severity: "warning" });
    }
    return parsed;
  }, [processed.errors, processed.warnings, rows, cols]);

  // Build per-cell (row/field) maps for cell-level highlighting.
  const { errorCells, warnCells } = useMemo(() => {
    const errorCells = new Map<number, Set<string>>();
    const warnCells = new Map<number, Set<string>>();
    for (const iss of issues) {
      if (iss.row == null || !iss.field) continue;
      if (iss.severity === "error") {
        if (!errorCells.has(iss.row)) errorCells.set(iss.row, new Set());
        errorCells.get(iss.row)!.add(normKey(iss.field));
      } else {
        if (!warnCells.has(iss.row)) warnCells.set(iss.row, new Set());
        warnCells.get(iss.row)!.add(normKey(iss.field));
      }
    }
    return { errorCells, warnCells };
  }, [issues]);

  return (
    <div className="aeon-card space-y-4 rounded-2xl border bg-gradient-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-semibold">Preview</span>
        <span className="text-muted-foreground">{processed.rowCount} rows</span>
        <StatusBar processed={processed} />
      </div>
      <div className="mt-4 rounded-xl border border-border/70 overflow-hidden">
        <div className={cn("overflow-auto", maxHeightClass)}>
          <table className="w-full text-sm border-collapse min-w-max">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <tr>
                {cols.map((c) => (
                  <th
                    key={c}
                    className="whitespace-nowrap border-b px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const rowNum = i + 1;
                return (
                  <tr
                    key={i}
                    className={cn("border-b", i % 2 === 1 && "bg-muted/20")}
                  >
                    {cols.map((c) => {
                      const nk = normKey(c);
                      const cellError = errorCells.get(rowNum)?.has(nk);
                      const cellWarn =
                        !cellError && warnCells.get(rowNum)?.has(nk);
                      return (
                        <td
                          key={c}
                          className={cn(
                            "whitespace-nowrap px-3 py-2",
                            cellError
                              ? "border-l-2 border-l-destructive text-destructive font-medium"
                              : cellWarn
                              ? "border-l-2 border-l-warning text-warning font-medium"
                              : "text-foreground"
                          )}
                        >
                          {formatCell(c, r[c])}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collapsible issue detail panel */}
      {issues.length > 0 && (
        <div className="rounded-xl border">
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
          >
            <span>
              ⚠️ {processed.warningRows} warnings&nbsp;&nbsp;&nbsp;❌{" "}
              {processed.errorRows} errors
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                showDetail && "rotate-180"
              )}
            />
          </button>
          {showDetail && (
            <ul className="space-y-1.5 border-t px-4 py-3 text-xs">
              {issues.map((iss, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      iss.severity === "error"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/10 text-warning"
                    )}
                  >
                    {iss.severity}
                  </span>
                  <span className="text-muted-foreground">
                    {iss.row != null ? `Row ${iss.row}: ` : ""}
                    {iss.field ? `${iss.field} — ` : ""}
                    {iss.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBar({ processed }: { processed: ProcessResponse }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <span className="inline-flex items-center gap-1 text-success">
        <CheckCircle2 className="h-3.5 w-3.5" /> {processed.validRows} valid
      </span>
      <span className="inline-flex items-center gap-1 text-warning-foreground">
        <AlertTriangle className="h-3.5 w-3.5" /> {processed.warningRows} warnings
      </span>
      <span className="inline-flex items-center gap-1 text-destructive">
        <XCircle className="h-3.5 w-3.5" /> {processed.errorRows} errors
      </span>
    </div>
  );
}

/* ─────────────────────────  Step 2 — Column mapping only  ───────────────────────── */

function StepMapping({
  master,
  processed,
  mapping,
  onMapChange,
  requiredUnmapped,
  onBack,
  onCancel,
  onNext,
}: {
  master: UploadMaster;
  processed: ProcessResponse;
  mapping: Record<string, string | null>;
  onMapChange: (field: string, col: string) => void;
  requiredUnmapped: string[];
  onBack: () => void;
  onCancel: () => void;
  onNext: () => void;
}) {
  const firstRow = processed.sampleRows[0] ?? {};
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: detected columns */}
        <div className="aeon-card rounded-2xl border bg-gradient-card p-6 shadow-soft">
          <h3 className="mb-3 text-sm font-semibold">Detected Columns</h3>
          <div className="space-y-2">
            {processed.detectedColumns.map((c) => (
              <div
                key={c}
                className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm"
              >
                <span className="font-medium">{c}</span>
                <span className="max-w-[45%] truncate text-xs text-muted-foreground">
                  {formatCell(c, firstRow[c])}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: mapping */}
        <div className="aeon-card rounded-2xl border bg-gradient-card p-6 shadow-soft">
          <h3 className="mb-3 text-sm font-semibold">Map Required Fields</h3>
          <div className="space-y-3">
            {master.requiredColumns.map((field) => {
              const mapped = mapping[field];
              return (
                <div key={field} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {mapped ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    )}
                    {field}
                  </div>
                  <Select
                    value={mapped ?? ""}
                    onValueChange={(v) => onMapChange(field, v)}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-9 rounded-xl",
                        !mapped && "border-destructive/50"
                      )}
                    >
                      <SelectValue placeholder="Select a column…" />
                    </SelectTrigger>
                    <SelectContent>
                      {processed.detectedColumns.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
          {requiredUnmapped.length > 0 && (
            <p className="mt-3 text-xs font-semibold text-destructive">
              Map all required fields to continue.
            </p>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between">
        <Button variant="outline" className="gap-1.5 rounded-xl" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="gap-1.5 rounded-xl bg-gradient-brand font-semibold shadow-glow"
            disabled={requiredUnmapped.length > 0}
            onClick={onNext}
          >
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────  Step 3 — Full data preview + validation  ───────────────────────── */

function downloadErrorReport(processed: ProcessResponse) {
  const issues = [
    ...processed.errors.map((e) => parseIssue(e, "error")),
    ...processed.warnings.map((w) => parseIssue(w, "warning")),
  ];
  const colFor = (field: string | null): string | null => {
    if (!field) return null;
    const nk = normKey(field);
    return processed.detectedColumns.find((c) => normKey(c) === nk) ?? field;
  };
  const cell = (row: number | null, field: string | null): string => {
    if (row == null || !field) return "";
    const col = colFor(field);
    const r = processed.sampleRows[row - 1];
    if (!r || !col) return "";
    const v = r[col];
    return v === undefined || v === null ? "" : String(v);
  };
  const esc = (v: string): string => `"${v.replace(/"/g, '""')}"`;
  const header = ["Row", "Column", "Severity", "Value", "Issue"];
  const lines = [
    header.join(","),
    ...issues.map((iss) =>
      [
        iss.row != null ? String(iss.row) : "",
        colFor(iss.field) ?? "",
        iss.severity,
        cell(iss.row, iss.field),
        iss.message,
      ]
        .map(esc)
        .join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "error-report.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function StepPreview({
  processed,
  submitting,
  onBack,
  onCancel,
  onSubmit,
}: {
  processed: ProcessResponse;
  submitting: boolean;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const shown = processed.sampleRows.length;
  const hasIssues = processed.errorRows > 0 || processed.warningRows > 0;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-muted-foreground">
          Showing {shown} of {processed.rowCount} rows · {processed.errorRows} errors ·{" "}
          {processed.warningRows} warnings
        </span>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-lg text-xs"
          disabled={!hasIssues}
          onClick={() => downloadErrorReport(processed)}
        >
          <Download className="h-3.5 w-3.5" />
          Download Error Report
        </Button>
      </div>

      {/* Full-height scrollable preview with cell-level highlighting */}
      <PreviewTable
        processed={processed}
        maxHeightClass="max-h-[calc(100vh-280px)]"
        showAllRows={true}
      />

      {/* Bottom bar */}
      <div className="flex items-center justify-between">
        <Button variant="outline" className="gap-1.5 rounded-xl" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="gap-1.5 rounded-xl bg-gradient-brand font-semibold shadow-glow"
            disabled={submitting}
            onClick={onSubmit}
          >
            {submitting ? "Submitting…" : "Submit"} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────  Step 4  ───────────────────────── */

function StepFinish({
  master,
  file,
  result,
  error,
  onGoToValidation,
  onUploadAnother,
  onTryAgain,
}: {
  master: UploadMaster | null;
  file: File | null;
  result: SubmitResponse | null;
  error: string | null;
  onGoToValidation: () => void;
  onUploadAnother: () => void;
  onTryAgain: () => void;
}) {
  if (error) {
    return (
      <div className="aeon-card flex flex-col items-center gap-4 rounded-2xl border bg-gradient-card p-10 text-center shadow-soft">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">Upload failed</h2>
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" className="gap-1.5 rounded-xl" onClick={onTryAgain}>
          <ArrowLeft className="h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="aeon-card flex flex-col items-center gap-5 rounded-2xl border bg-gradient-card p-10 text-center shadow-soft">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
        <Check className="h-9 w-9 text-primary-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-bold">Data uploaded successfully</h2>
        <p className="text-sm text-muted-foreground">
          Your file has been processed and is ready for validation.
        </p>
      </div>

      <div className="w-full max-w-md space-y-1.5 rounded-xl border bg-muted/20 p-4 text-left text-sm">
        <SummaryRow label="Master" value={master?.label ?? "—"} />
        <SummaryRow label="File" value={file?.name ?? "—"} />
        <SummaryRow label="Rows processed" value={String(result?.rowsProcessed ?? 0)} />
        <SummaryRow label="Rows imported" value={String(result?.rowsImported ?? 0)} />
        <SummaryRow label="Rows skipped" value={String(result?.rowsSkipped ?? 0)} />
        <SummaryRow label="Module" value={result?.module ?? master?.module ?? "—"} />
      </div>

      {result?.summary && result.summary.length > 0 && (
        <div className="w-full max-w-md space-y-2 rounded-xl border bg-muted/20 p-4 text-left text-sm">
          <p className="font-semibold">Per-date reconciliation</p>
          {result.message && (
            <p className="text-xs text-muted-foreground">{result.message}</p>
          )}
          <div className="divide-y">
            {[...result.summary]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((d) => (
                <div
                  key={d.date}
                  className="flex items-center justify-between gap-3 py-1.5"
                >
                  <span className="font-medium">{isoToLabel(d.date)}</span>
                  {d.reconciled ? (
                    <span className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {d.total} {d.total === 1 ? "driver" : "drivers"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {d.validated}
                      </span>
                      {d.needsReview > 0 && (
                        <span className="inline-flex items-center gap-1 text-warning-foreground">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {d.needsReview}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">
                      Awaiting other file
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {result?.reconciliation && (
        <div className="w-full max-w-md space-y-2 rounded-xl border bg-muted/20 p-4 text-left text-sm">
          <p className="font-semibold">Reconciliation</p>
          {result.dateRange && (
            <p className="text-xs text-muted-foreground">
              {result.dateRange.start === result.dateRange.end
                ? isoToLabel(result.dateRange.start)
                : `${isoToLabel(result.dateRange.start)} – ${isoToLabel(
                    result.dateRange.end
                  )}`}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              {result.reconciliation.total} rows reconciled
            </span>
            <span className="inline-flex items-center gap-1 text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {result.reconciliation.validated} validated
            </span>
            {result.reconciliation.needsReview > 0 && (
              <span className="inline-flex items-center gap-1 text-warning-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />
                {result.reconciliation.needsReview} need review
              </span>
            )}
          </div>
        </div>
      )}

      <div className="w-full max-w-md rounded-xl border border-primary/15 bg-primary/[0.06] p-4 text-left text-sm">
        <p className="mb-1.5 font-semibold">What happens next</p>
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          <li>Your data is available in the validation workspace.</li>
          <li>Exceptions are flagged for manual review.</li>
          <li>Submit for approval once validation is complete.</li>
        </ul>
      </div>

      <div className="flex gap-2">
        <Button
          className="gap-1.5 rounded-xl bg-gradient-brand font-semibold shadow-glow"
          onClick={onGoToValidation}
        >
          {result?.summary ? "Go to Timecard Validation" : "Go to Validation"}{" "}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" className="rounded-xl" onClick={onUploadAnother}>
          Upload Another File
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-1 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="max-w-[60%] truncate text-right">{value}</span>
    </div>
  );
}
