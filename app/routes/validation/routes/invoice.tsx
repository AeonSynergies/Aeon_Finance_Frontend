import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Gavel,
  Lock,
  Receipt,
  ScrollText,
  Upload,
  X,
  Plus,
} from "lucide-react";
import { Link } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageTabs } from "@/components/shared/PageTabs";
import { ColumnFilter } from "@/components/validation/ColumnFilter";
import { ValidationShell, type KpiItem, type ValidationStage } from "@/components/validation/ValidationShell";
import { CreateJobDialog } from "@/components/validation/CreateJobDialog";
import { JobSelector } from "@/components/validation/JobSelector";
import { useModuleJobs } from "@/hooks/useModuleJobs";
import { useCreateJob, useDeleteJob, useJobRows } from "@/hooks/useJobs";
import { apiError } from "@/services/client";
import { DisputeTrackerTab } from "@/components/validation/DisputeTrackerTab";
import { ApprovalStatusChip, EditableNotesCell, OverrideButton } from "@/components/validation/StatusCells";
import type { DisputeRow as SharedDisputeRow, VendorDisputeStatus, ValidationDisputeStatus } from "@/components/validation/shared";

const mapRouteVendorStatus = (s: string): VendorDisputeStatus => {
  if (s === "Accepted") return "Accepted";
  if (s === "Rejected") return "Rejected";
  if (s === "Resolved") return "Accepted";
  if (s === "Under Review" || s === "Dispute Raised" || s === "ReRaise Required") return "Under Review";
  return "Yet to Dispute";
};
const mapRouteValDisputeStatus = (s: string): ValidationDisputeStatus =>
  s === "Need Dispute" ? "Need Dispute" : s === "Accepted" || s === "Rejected" || s === "Resolved" ? "No Dispute" : "Pending Validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/* ───────── Types ───────── */

type InvoiceValStatus =
  | "Need Manual Validation"
  | "Validated"
  | "Sent for Approval"
  | "Approved"
  | "ReValidate"
  | "Locked";

type DisputeStatus =
  | "Need Dispute"
  | "Sent for Approval"
  | "Approved"
  | "Dispute Raised"
  | "Under Review"
  | "Accepted"
  | "Rejected"
  | "ReRaise Required"
  | "Resolved"
  | "—";

type InvoiceStatus = "Draft" | "Validated" | "Sent for Approval" | "Approved" | "Locked";

type Category = "Route" | "Cancelled Route" | "Training" | "UPD" | "Package" | "Dispute";

interface InvoiceRow {
  id: string;
  week: string;
  date: string;
  serviceType: string;
  category: Category;
  expectedQty: number;
  paidQty: number;
  rate: number;
  disputeStatus: DisputeStatus;
  disputeNotes: string;
  acceptedQty?: number;
  rejectedQty?: number;
  status: InvoiceValStatus;
  reviewedBy: string;
  lastUpdated: string;
  notes?: string;
  amazonAcceptedAmount?: number;
  resolutionNotes?: string;
  /* ── Standardized validation columns ── */
  validationNotes?: string;
  overrideNotes?: string;
  approvalStatus?: "Pending" | "Approved" | "Rejected";
  approverNotes?: string;
}

/* ───────── Demo data ───────── */

const FILES = [
  { type: "Amazon Invoice PDF", status: "Uploaded", date: "Apr 26, 09:12" },
  { type: "Invoice Extracted Excel", status: "Uploaded", date: "Apr 26, 09:18" },
  { type: "Expected Revenue Data", status: "Pending Review", date: "Apr 26, 09:24" },
] as const;

/* ───────── API row mapping ───────── */

interface ApiRow {
  id: string;
  date?: string | null;
  validationStatus?: string;
  approvalStatus?: string;
  disputeStatus?: string;
  disputeRequired?: boolean;
  disputeValue?: number | null;
  validationNotes?: string | null;
  overrideNotes?: string | null;
  approverNotes?: string | null;
  data: string;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function str(v: unknown): string {
  return v === undefined || v === null || v === "" ? "" : String(v);
}

/** API ValidationStatus → module InvoiceValStatus. */
function apiToInvoiceStatus(s: string | undefined, locked: boolean): InvoiceValStatus {
  if (locked || s === "LOCKED") return "Locked";
  switch (s) {
    case "VALIDATED": return "Validated";
    case "SENT_FOR_APPROVAL": return "Sent for Approval";
    case "NEED_DISPUTE":
    case "NEED_MANUAL_VALIDATION":
    case "PENDING_VALIDATION":
    default: return "Need Manual Validation";
  }
}
/** API DisputeStatus → module DisputeStatus. */
function apiToDisputeStatus(s: string | undefined, disputeRequired: boolean): DisputeStatus {
  if (s === "NEED_DISPUTE" || disputeRequired) return "Need Dispute";
  return "—";
}
function apiToApproval(s: string | undefined): "Pending" | "Approved" | "Rejected" {
  switch (s) {
    case "APPROVED": return "Approved";
    case "REJECTED": return "Rejected";
    default: return "Pending";
  }
}

function mapApiRow(r: ApiRow, locked: boolean): InvoiceRow {
  let d: Record<string, unknown> = {};
  try {
    d = JSON.parse(r.data) as Record<string, unknown>;
  } catch {
    d = {};
  }
  const disputeRequired = !!(r.disputeRequired ?? d.disputeRequired);
  return {
    id: r.id,
    week: str(d["Week"]) || "—",
    date: str(r.date) || "—",
    serviceType: str(d["Service Type"]) || "—",
    category: "Route",
    expectedQty: num(d["Expected Qty"]),
    paidQty: num(d["Paid Qty"]),
    rate: num(d["Rate"]),
    disputeStatus: apiToDisputeStatus(r.disputeStatus, disputeRequired),
    disputeNotes: str(r.validationNotes),
    status: apiToInvoiceStatus(r.validationStatus, locked),
    reviewedBy: "—",
    lastUpdated: "—",
    validationNotes: str(r.validationNotes) || undefined,
    overrideNotes: str(r.overrideNotes) || undefined,
    approvalStatus: apiToApproval(r.approvalStatus),
    approverNotes: str(r.approverNotes) || undefined,
  };
}

/* ───────── Style helpers ───────── */

const valStatusStyle: Record<InvoiceValStatus, string> = {
  "Need Manual Validation": "bg-warning/10 text-warning border-warning/30",
  "Validated": "bg-secondary/10 text-secondary border-secondary/30",
  "Sent for Approval": "bg-accent/10 text-accent border-accent/30",
  "Approved": "bg-success/10 text-success border-success/30",
  "ReValidate": "bg-destructive/10 text-destructive border-destructive/30",
  "Locked": "bg-muted text-foreground border-border",
};

const dispStatusStyle: Record<DisputeStatus, string> = {
  "Need Dispute": "bg-warning/10 text-warning",
  "Sent for Approval": "bg-accent/10 text-accent",
  "Approved": "bg-success/10 text-success",
  "Dispute Raised": "bg-primary/10 text-primary",
  "Under Review": "bg-secondary/10 text-secondary",
  "Accepted": "bg-success/10 text-success",
  "Rejected": "bg-destructive/10 text-destructive",
  "ReRaise Required": "bg-destructive/10 text-destructive",
  "Resolved": "bg-muted text-foreground",
  "—": "bg-muted/40 text-muted-foreground",
};

const invoiceStatusStyle: Record<InvoiceStatus, string> = {
  Draft: "bg-muted text-foreground",
  Validated: "bg-secondary/10 text-secondary",
  "Sent for Approval": "bg-accent/10 text-accent",
  Approved: "bg-success/10 text-success",
  Locked: "bg-primary/10 text-primary",
};

const fmt$ = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

/* ───────── Page ───────── */

type FilterKey = "week" | "serviceType" | "category" | "disputeStatus" | "status" | "reviewedBy";

interface ExpectedRevRow {
  id: string;
  week: string;
  date: string;
  serviceType: string;
  category: Category;
  qty: number;
  rate: number;
  expected: number;
}

interface DisputeTrackRow {
  id: string;
  week: string;
  type: string;
  status: DisputeStatus;
  deadline: string;
  qtyImpact: number;
  revenueImpact: number;
  notes: string;
}

const EXPECTED_ROWS: ExpectedRevRow[] = [
  { id: "E-1", week: "W17-2026", date: "Apr 21", serviceType: "Standard Parcel - L", category: "Route", qty: 42, rate: 185, expected: 7770 },
  { id: "E-2", week: "W17-2026", date: "Apr 22", serviceType: "Standard Parcel - M", category: "Route", qty: 38, rate: 175, expected: 6650 },
  { id: "E-3", week: "W17-2026", date: "Apr 22", serviceType: "Cargo Van", category: "Cancelled Route", qty: 4, rate: 95, expected: 380 },
  { id: "E-4", week: "W17-2026", date: "Apr 23", serviceType: "Training", category: "Training", qty: 6, rate: 120, expected: 720 },
  { id: "E-5", week: "W17-2026", date: "Apr 24", serviceType: "UPD", category: "UPD", qty: 180, rate: 1.25, expected: 225 },
  { id: "E-6", week: "W17-2026", date: "Apr 24", serviceType: "Standard Parcel - XL", category: "Package", qty: 920, rate: 0.85, expected: 782 },
];

const DISPUTE_ROWS: DisputeTrackRow[] = [
  { id: "D-9012", week: "W17-2026", type: "Route Count", status: "Dispute Raised", deadline: "Apr 30", qtyImpact: 3, revenueImpact: 525, notes: "3 routes missing from settlement" },
  { id: "D-9013", week: "W17-2026", type: "Late Cancellation", status: "Under Review", deadline: "Apr 29", qtyImpact: 2, revenueImpact: 190, notes: "AMZL cancel within 2h window" },
  { id: "D-9014", week: "W17-2026", type: "Training", status: "Need Dispute", deadline: "May 02", qtyImpact: 2, revenueImpact: 240, notes: "2 training sessions not reflected" },
  { id: "D-9015", week: "W17-2026", type: "UPD", status: "Accepted", deadline: "Apr 28", qtyImpact: 12, revenueImpact: 15, notes: "Partial: 12 mins accepted" },
  { id: "D-9016", week: "W17-2026", type: "Rate", status: "ReRaise Required", deadline: "May 05", qtyImpact: 0, revenueImpact: 312, notes: "Rate card mismatch on XL service" },
  { id: "D-9017", week: "W16-2026", type: "Block Duration", status: "Rejected", deadline: "Apr 24", qtyImpact: 0, revenueImpact: 0, notes: "Insufficient evidence" },
];

export default function RouteInvoiceValidation() {
  const { jobs, selectedJobId, setSelectedJobId, readOnly, loading } =
    useModuleJobs("ROUTE_INVOICE");
  const [tab, setTab] = useState<"invoice" | "expected">("invoice");
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [openRow, setOpenRow] = useState<InvoiceRow | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const deleteJobMutation = useDeleteJob();
  const createJobMutation = useCreateJob();
  const rowsQuery = useJobRows(selectedJobId || undefined, "route_invoice");

  async function deleteJob() {
    if (!selectedJobId) return;
    try {
      await deleteJobMutation.mutateAsync(selectedJobId);
      toast.success("Job deleted");
      setSelectedJobId("");
    } catch (e) {
      toast.error(apiError(e, "Failed to delete job"));
    } finally {
      setDeleteConfirmOpen(false);
    }
  }

  // Seed local (optimistically edited) rows from the server rows.
  useEffect(() => {
    setRows(selectedJobId ? (rowsQuery.data ?? []).map((r) => mapApiRow(r, readOnly)) : []);
  }, [selectedJobId, rowsQuery.data, readOnly]);
  const [filters, setFilters] = useState<Record<FilterKey, Set<string>>>({
    week: new Set(), serviceType: new Set(), category: new Set(),
    disputeStatus: new Set(), status: new Set(), reviewedBy: new Set(),
  });
  const [frozen, setFrozen] = useState<Record<FilterKey, boolean>>({
    week: true, serviceType: false, category: false,
    disputeStatus: false, status: false, reviewedBy: false,
  });
  const [disputePanelOpen, setDisputePanelOpen] = useState(true);

  const visible = useMemo(() => {
    return rows.filter((r) => {
      const test = (k: FilterKey, v: string) => filters[k].size === 0 || filters[k].has(v);
      return (
        test("week", r.week) &&
        test("serviceType", r.serviceType) &&
        test("category", r.category) &&
        test("disputeStatus", r.disputeStatus) &&
        test("status", r.status) &&
        test("reviewedBy", r.reviewedBy || "—")
      );
    });
  }, [rows, filters]);

  /* Aggregates (only used by dispute side panel) */
  const totals = useMemo(() => {
    const disputes = rows.filter((r) =>
      ["Dispute Raised", "Under Review", "ReRaise Required", "Need Dispute", "Sent for Approval"].includes(r.disputeStatus)
    );
    const disputeAmt = disputes.reduce(
      (s, r) => s + Math.max(0, r.expectedQty - r.paidQty) * r.rate, 0
    );
    const accepted = rows.filter((r) => r.disputeStatus === "Accepted").length;
    const rejected = rows.filter((r) => r.disputeStatus === "Rejected").length;
    const resolved = rows
      .filter((r) => r.disputeStatus === "Resolved" || r.disputeStatus === "Accepted")
      .reduce((s, r) => s + (r.acceptedQty ?? 0) * r.rate, 0);
    return { openDisputes: disputes.length, disputeAmt, accepted, rejected, resolved };
  }, [rows]);

  /* Header values for filters */
  const colValues = (k: FilterKey) =>
    Array.from(new Set(rows.map((r) => String((r as any)[k] ?? "—"))));

  const updateRow = (id: string, patch: Partial<InvoiceRow>) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const [viewMode, setViewMode] = useState<"date" | "full">("full");
  const [editMode, setEditMode] = useState(false);
  const [stage, setStage] = useState<ValidationStage>("draft");
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [topTab, setTopTab] = useState<"validation" | "dispute">("validation");

  const sharedDisputes: SharedDisputeRow[] = useMemo(
    () =>
      rows
        .filter((r) => r.disputeStatus !== "—")
        .map((r) => ({
          id: r.id,
          disputeId: r.id,
          disputeType: r.category,
          validationDisputeStatus: mapRouteValDisputeStatus(r.disputeStatus),
          vendorDisputeStatus: mapRouteVendorStatus(r.disputeStatus),
          disputeValue: Math.max(0, r.expectedQty - r.paidQty) * r.rate,
          acceptedValue: 0,
          rejectedValue: 0,
          disputeNotes: r.disputeNotes,
        })),
    [rows]
  );

  const kpis: KpiItem[] = [
    { icon: Receipt, label: "Invoice Lines", value: rows.length, tone: "primary" },
    { icon: AlertTriangle, label: "Need Validation", value: rows.filter((r) => r.status === "Need Manual Validation" || r.status === "ReValidate").length, tone: "danger" },
    { icon: Gavel, label: "Open Disputes", value: totals.openDisputes, tone: "warning" },
    { icon: CheckCircle2, label: "Approved", value: rows.filter((r) => r.status === "Approved" || r.status === "Locked").length, tone: "success" },
  ];

  const attentionCount = rows.filter((r) => r.status === "Need Manual Validation" || r.status === "ReValidate").length;

  return (
    <AppLayout title="Route Invoice Validation" subtitle="Validate invoice payments against expected revenue and disputes">
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Sticky module top bar: back link + module name + job selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card/40 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Link
              to="/validation"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              ← Back
            </Link>
            <span className="text-sm font-bold tracking-tight">Route Invoice Validation</span>
          </div>
          <JobSelector
            jobs={jobs}
            selectedJobId={selectedJobId}
            onSelect={setSelectedJobId}
            onCreateJob={() => setCreateJobOpen(true)}
            onDeleteJob={() => setDeleteConfirmOpen(true)}
            loading={loading}
          />
        </div>
      <ValidationShell
        title="Route Invoice Validation"
        periodLabel="Week 17 · Apr 20 – 26, 2026"
        processLabel="Process: Apr 28, 2026"
        viewLabel="Executive"
        stage={stage}
        topTabs={[
          { key: "validation", label: "Validation" },
          { key: "dispute", label: "Dispute Tracking" },
        ]}
        topTab={topTab}
        onTopTabChange={(v) => setTopTab(v as "validation" | "dispute")}
        disputePane={<DisputeTrackerTab rows={sharedDisputes} />}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        editMode={editMode}
        onEditToggle={() => {
          if (editMode) toast.success("Edits saved");
          setEditMode((v) => !v);
        }}
        editDisabled={readOnly}
        kpis={kpis}
        attentionCount={attentionCount}
        totalCount={rows.length}
        submitDisabled={attentionCount > 0 || stage !== "draft" || readOnly}
        onSubmit={() => setStage("submitted")}
        tableHeaderActions={
          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setCreateJobOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Create Job
          </Button>
        }
      >
      <div className="space-y-3 p-3">
        {/* MINIMAL AEON TABS */}
        <div className="border-b">
          <nav className="flex items-center gap-0">
            {[
              { key: "invoice", label: "Invoice Validation", count: rows.length },
              { key: "expected", label: "Expected Revenue", count: EXPECTED_ROWS.length },
            ].map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as typeof tab)}
                  className={cn(
                    "relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors",
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-bold",
                      active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>


        {/* TAB CONTENT */}
        {tab === "invoice" && (
        <>


        {/* MAIN GRID: TABLE + DISPUTE PANEL */}
        <div className="flex gap-3">
          <div className="min-w-0 flex-1 rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <div className="flex items-center gap-2">
                <ScrollText className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider">Invoice Reconciliation</span>
                <Badge variant="outline" className="h-5 text-[10px]">{visible.length} of {rows.length}</Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]">PDF</Button>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]">CSV</Button>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]">XLS</Button>
                <Button size="sm" className="h-7 gap-1 text-[11px]">
                  <Lock className="h-3 w-3" /> Lock Invoice
                </Button>
              </div>
            </div>

            <div className="relative max-h-[640px] overflow-auto">
              <table className="w-full border-collapse text-[11.5px]">
                <thead className="sticky top-0 z-10 bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <Th group>Invoice Information</Th>
                    <Th group colSpan={3}>Quantity</Th>
                    <Th group colSpan={4}>Rate</Th>
                    <Th group colSpan={2}>Dispute</Th>
                    <Th group colSpan={5}>Validation &amp; Approval</Th>
                    <Th group colSpan={2}>Audit</Th>
                    <Th group sticky="right">Action</Th>
                  </tr>
                  <tr>
                    <ColTh frozen={frozen.week} sticky>
                      Week / Date / Service / Category
                      <ColumnFilter
                        columnKey="week"
                        values={colValues("week")}
                        selected={filters.week}
                        onApply={(v) => setFilters((p) => ({ ...p, week: v }))}
                        onReset={() => setFilters((p) => ({ ...p, week: new Set() }))}
                        frozen={frozen.week}
                        onToggleFreeze={() => setFrozen((p) => ({ ...p, week: !p.week }))}
                        active={filters.week.size > 0}
                      />
                    </ColTh>
                    <ColTh>Expected Qty</ColTh>
                    <ColTh>Paid Qty</ColTh>
                    <ColTh>Diff Qty</ColTh>
                    <ColTh>Rate</ColTh>
                    <ColTh>Expected Value</ColTh>
                    <ColTh>Paid Value</ColTh>
                    <ColTh>Diff Value</ColTh>
                    <ColTh>
                      Dispute Status
                      <ColumnFilter
                        columnKey="disputeStatus"
                        values={colValues("disputeStatus")}
                        selected={filters.disputeStatus}
                        onApply={(v) => setFilters((p) => ({ ...p, disputeStatus: v }))}
                        onReset={() => setFilters((p) => ({ ...p, disputeStatus: new Set() }))}
                        frozen={frozen.disputeStatus}
                        onToggleFreeze={() => setFrozen((p) => ({ ...p, disputeStatus: !p.disputeStatus }))}
                        active={filters.disputeStatus.size > 0}
                      />
                    </ColTh>
                    <ColTh>Dispute Notes</ColTh>
                    <ColTh>
                      Validation Status
                      <ColumnFilter
                        columnKey="status"
                        values={colValues("status")}
                        selected={filters.status}
                        onApply={(v) => setFilters((p) => ({ ...p, status: v }))}
                        onReset={() => setFilters((p) => ({ ...p, status: new Set() }))}
                        frozen={frozen.status}
                        onToggleFreeze={() => setFrozen((p) => ({ ...p, status: !p.status }))}
                        active={filters.status.size > 0}
                      />
                    </ColTh>
                    <ColTh>Validation Notes</ColTh>
                    <ColTh>Override Notes</ColTh>
                    <ColTh>Approval Status</ColTh>
                    <ColTh>Approver Notes</ColTh>
                    <ColTh>Reviewed By</ColTh>
                    <ColTh>Last Updated</ColTh>
                    <ColTh sticky="right">—</ColTh>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={18} className="px-3 py-10 text-center text-xs text-muted-foreground">
                        {!selectedJobId
                          ? "Select a job above or create a new one to begin"
                          : rows.length === 0
                            ? "No rows yet — upload the Amazon Invoice to begin validation"
                            : "No invoice lines match these filters"}
                      </td>
                    </tr>
                  )}
                  {visible.map((r) => {
                    const expVal = r.expectedQty * r.rate;
                    const paidVal = r.paidQty * r.rate;
                    const diffQty = r.expectedQty - r.paidQty;
                    const diffVal = expVal - paidVal;
                    const missingLine = r.paidQty === 0 && r.expectedQty > 0;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setOpenRow(r)}
                        className={cn(
                          "cursor-pointer border-b transition-colors hover:bg-muted/40",
                          missingLine && "border-l-2 border-l-destructive bg-destructive/5"
                        )}
                      >
                        <td className={cn("sticky left-0 z-[1] bg-card px-3 py-1.5", frozen.week && "shadow-[1px_0_0_hsl(var(--border))]")}>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-semibold text-foreground">{r.week} · {r.date}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {r.serviceType} <span className="mx-1">·</span>
                                <span className="rounded bg-muted px-1 py-0.5 text-[9px] font-semibold">{r.category}</span>
                                {missingLine && (
                                  <Badge variant="outline" className="ml-1 h-4 border-destructive/40 bg-destructive/10 px-1 text-[9px] text-destructive">
                                    <AlertTriangle className="mr-0.5 h-2.5 w-2.5" /> Missing Line
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <Td>{r.expectedQty}</Td>
                        <Td>{r.paidQty}</Td>
                        <Td className={cn(diffQty > 0 && "font-semibold text-destructive", diffQty < 0 && "font-semibold text-warning")}>
                          {diffQty > 0 ? `+${diffQty}` : diffQty}
                        </Td>
                        <Td>{fmt$(r.rate)}</Td>
                        <Td>{fmt$(expVal)}</Td>
                        <Td>{fmt$(paidVal)}</Td>
                        <Td className={cn(diffVal > 0 && "font-semibold text-destructive")}>{fmt$(diffVal)}</Td>
                        <Td>
                          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", dispStatusStyle[r.disputeStatus])}>
                            {r.disputeStatus}
                          </span>
                          {typeof r.acceptedQty === "number" && (
                            <div className="mt-0.5 text-[9px] text-muted-foreground">
                              Acc {r.acceptedQty} · Rej {r.rejectedQty ?? 0}
                            </div>
                          )}
                        </Td>
                        <Td className="max-w-[180px] truncate text-muted-foreground">{r.disputeNotes || "—"}</Td>
                        <Td>
                          <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold", valStatusStyle[r.status])}>
                            {r.status === "Locked" && <Lock className="mr-0.5 h-2.5 w-2.5" />}
                            {r.status}
                          </span>
                        </Td>
                        <Td>
                          <EditableNotesCell
                            value={r.validationNotes}
                            editing={editMode && !readOnly}
                            onChange={(v) => updateRow(r.id, { validationNotes: v })}
                            placeholder="Add validation note"
                          />
                        </Td>
                        <Td>
                          <EditableNotesCell
                            value={r.overrideNotes}
                            editing={editMode && !readOnly}
                            onChange={(v) => updateRow(r.id, { overrideNotes: v })}
                            placeholder="No override"
                          />
                        </Td>
                        <Td>
                          <ApprovalStatusChip status={r.approvalStatus ?? "Pending"} />
                        </Td>
                        <Td>
                          <EditableNotesCell
                            value={r.approverNotes}
                            editing={editMode && !readOnly && r.approvalStatus === "Rejected"}
                            onChange={(v) => updateRow(r.id, { approverNotes: v })}
                            placeholder={r.approvalStatus === "Rejected" ? "Required on reject" : "—"}
                          />
                        </Td>
                        <Td className="text-muted-foreground">{r.reviewedBy}</Td>
                        <Td className="text-muted-foreground">{r.lastUpdated}</Td>
                        <td className="sticky right-0 z-[1] bg-card px-2 py-1.5 text-right shadow-[-1px_0_0_hsl(var(--border))]">
                          <div className="flex items-center justify-end gap-1.5">
                            <OverrideButton
                              disabled={readOnly}
                              onClick={() => {
                                setEditMode(true);
                                updateRow(r.id, { overrideNotes: r.overrideNotes ?? "" });
                                toast.info(`Override mode enabled for ${r.id}`);
                              }}
                            />
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* DISPUTE SUMMARY PANEL */}
          <Collapsible open={disputePanelOpen} onOpenChange={setDisputePanelOpen} className="hidden xl:block">
            <div className={cn("rounded-lg border bg-card transition-all", disputePanelOpen ? "w-64" : "w-10")}>
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between border-b px-3 py-2 text-xs font-bold uppercase tracking-wider">
                  {disputePanelOpen && (
                    <span className="flex items-center gap-1.5">
                      <Gavel className="h-3.5 w-3.5 text-primary" /> Disputes
                    </span>
                  )}
                  <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", disputePanelOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 p-3 text-xs">
                  <StatLine label="Total Open" value={totals.openDisputes} accent="primary" />
                  <StatLine label="Accepted" value={totals.accepted} accent="success" />
                  <StatLine label="Rejected" value={totals.rejected} accent="destructive" />
                  <div className="my-2 border-t" />
                  <StatLine label="Pending Revenue" value={fmt$(totals.disputeAmt)} accent="warning" />
                  <StatLine label="Resolved Revenue" value={fmt$(totals.resolved)} accent="success" />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
        </>
        )}

        {tab === "expected" && (
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider">Expected Revenue</span>
                <Badge variant="outline" className="h-5 text-[10px]">{EXPECTED_ROWS.length} rows</Badge>
              </div>
              <span className="text-[10.5px] text-muted-foreground">
                (WST Qty + Dispute Qty) × Rate Card — mapped via Service Type &amp; Planned Duration
              </span>
            </div>
            <div className="max-h-[640px] overflow-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead className="sticky top-0 z-10 bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="border-b px-3 py-1.5 text-left">Week</th>
                    <th className="border-b px-3 py-1.5 text-left">Date</th>
                    <th className="border-b px-3 py-1.5 text-left">Service Type</th>
                    <th className="border-b px-3 py-1.5 text-left">Category</th>
                    <th className="border-b px-3 py-1.5 text-right">Qty</th>
                    <th className="border-b px-3 py-1.5 text-right">Rate</th>
                    <th className="border-b px-3 py-1.5 text-right">Expected Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {EXPECTED_ROWS.map((r, i) => (
                    <tr key={r.id} className={cn("border-b", i % 2 === 1 && "bg-muted/20")}>
                      <td className="px-3 py-1.5">{r.week}</td>
                      <td className="px-3 py-1.5">{r.date}</td>
                      <td className="px-3 py-1.5 font-medium">{r.serviceType}</td>
                      <td className="px-3 py-1.5">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{r.category}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{r.qty}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt$(r.rate)}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-primary tabular-nums">{fmt$(r.expected)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
      </ValidationShell>
      </div>

      <CreateJobDialog
        open={createJobOpen}
        onOpenChange={setCreateJobOpen}
        module="route"
        validationType="Route Invoice"
        jobIdPrefix="RT-INV"
        onCreate={async (job) => {
          try {
            await createJobMutation.mutateAsync({
              module: "ROUTE_INVOICE",
              frequency: job.frequency,
              periodStart: job.periodStart,
              periodEnd: job.periodEnd,
              processDate: job.processDate,
            });
            toast.success(`Job ${job.jobId} created`);
          } catch (e) {
            toast.error(apiError(e, "Failed to create job"));
          }
        }}
      />


      {/* Delete Job confirm */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete job?</DialogTitle>
            <DialogDescription>
              This permanently deletes the selected job and all of its validation
              rows, documents, and related records. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-8 text-xs" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="h-8 text-xs" onClick={deleteJob}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETAIL DRAWER */}
      <Sheet open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)}>
        <SheetContent className="w-full max-w-xl overflow-y-auto p-0 sm:max-w-xl">
          {openRow && (
            <DrawerBody row={openRow} onPatch={(p) => { updateRow(openRow.id, p); setOpenRow({ ...openRow, ...p }); }} onClose={() => setOpenRow(null)} />
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

/* ───────── Sub components ───────── */

function SummaryCard({
  label,
  value,
  sub,
  tone = "primary",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "primary" | "secondary" | "accent" | "success" | "warning" | "destructive";
}) {
  const toneMap: Record<string, string> = {
    primary: "text-primary",
    secondary: "text-secondary",
    accent: "text-accent",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  };
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-lg font-bold leading-tight", toneMap[tone])}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function FileStatusBadge({ status }: { status: "Uploaded" | "Missing" | "Pending Review" }) {
  const map = {
    Uploaded: "bg-success/10 text-success",
    Missing: "bg-destructive/10 text-destructive",
    "Pending Review": "bg-warning/10 text-warning",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold", map[status])}>
      {status === "Uploaded" && <CheckCircle2 className="h-2.5 w-2.5" />}
      {status === "Missing" && <X className="h-2.5 w-2.5" />}
      {status === "Pending Review" && <AlertTriangle className="h-2.5 w-2.5" />}
      {status}
    </span>
  );
}

function Th({ children, group, colSpan, sticky }: { children: React.ReactNode; group?: boolean; colSpan?: number; sticky?: "right" }) {
  return (
    <th
      colSpan={colSpan}
      className={cn(
        "border-b border-r border-border/60 px-3 py-1.5 text-left font-bold",
        group && "bg-muted/80",
        sticky === "right" && "sticky right-0 z-[2]"
      )}
    >
      {children}
    </th>
  );
}

function ColTh({ children, sticky, frozen }: { children: React.ReactNode; sticky?: boolean | "right"; frozen?: boolean }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border-b px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider",
        sticky === true && "sticky left-0 z-[2] bg-muted/60",
        sticky === "right" && "sticky right-0 z-[2] bg-muted/60",
        frozen && "shadow-[1px_0_0_hsl(var(--border))]"
      )}
    >
      <span className="inline-flex items-center">{children}</span>
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("whitespace-nowrap px-3 py-1.5", className)}>{children}</td>;
}

function StatLine({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  const tones: Record<string, string> = {
    primary: "text-primary",
    success: "text-success",
    destructive: "text-destructive",
    warning: "text-warning",
  };
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-bold", tones[accent])}>{value}</span>
    </div>
  );
}

/* ───────── Drawer body ───────── */

function DrawerBody({
  row,
  onPatch,
  onClose,
}: {
  row: InvoiceRow;
  onPatch: (p: Partial<InvoiceRow>) => void;
  onClose: () => void;
}) {
  const expVal = row.expectedQty * row.rate;
  const paidVal = row.paidQty * row.rate;
  const diffQty = row.expectedQty - row.paidQty;
  const diffVal = expVal - paidVal;

  const timeline = [
    { label: "Dispute Created", done: row.disputeStatus !== "—" },
    { label: "Sent for Approval", done: ["Sent for Approval", "Approved", "Dispute Raised", "Under Review", "Accepted", "Rejected", "Resolved", "ReRaise Required"].includes(row.disputeStatus) },
    { label: "Approved", done: ["Approved", "Dispute Raised", "Under Review", "Accepted", "Rejected", "Resolved", "ReRaise Required"].includes(row.disputeStatus) },
    { label: "Raised", done: ["Dispute Raised", "Under Review", "Accepted", "Rejected", "Resolved", "ReRaise Required"].includes(row.disputeStatus) },
    { label: "Under Review", done: ["Under Review", "Accepted", "Rejected", "Resolved", "ReRaise Required"].includes(row.disputeStatus) },
    { label: row.disputeStatus === "Rejected" ? "Rejected" : "Accepted", done: ["Accepted", "Rejected", "Resolved"].includes(row.disputeStatus) },
  ];

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b bg-muted/30 p-4">
        <div className="flex items-start justify-between">
          <div>
            <SheetTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-primary" />
              {row.id}
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-xs">
              {row.week} · {row.date} · {row.serviceType}
            </SheetDescription>
          </div>
          <span className={cn("rounded border px-2 py-0.5 text-[10px] font-semibold", valStatusStyle[row.status])}>
            {row.status}
          </span>
        </div>
      </SheetHeader>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* SECTION 1 — Revenue */}
        <Section title="Revenue Breakdown" icon={<FileText className="h-3.5 w-3.5" />}>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <KV label="Service Type" value={row.serviceType} />
            <KV label="Category" value={row.category} />
            <KV label="Planned Duration" value="10h" />
            <KV label="Rate Applied" value={fmt$(row.rate)} />
            <KV label="Expected Qty" value={row.expectedQty} />
            <KV label="Paid Qty" value={row.paidQty} />
            <KV label="Quantity Difference" value={diffQty} tone={diffQty > 0 ? "destructive" : "default"} />
            <KV label="Revenue Difference" value={fmt$(diffVal)} tone={diffVal > 0 ? "destructive" : "default"} />
          </div>
        </Section>

        {/* SECTION 2 — Dispute timeline */}
        <Section title="Dispute History" icon={<Gavel className="h-3.5 w-3.5" />}>
          <ol className="space-y-2">
            {timeline.map((t, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <span className={cn("h-2 w-2 rounded-full", t.done ? "bg-success" : "bg-muted")} />
                <span className={cn(t.done ? "font-semibold text-foreground" : "text-muted-foreground")}>{t.label}</span>
              </li>
            ))}
          </ol>
          {typeof row.acceptedQty === "number" && (
            <div className="mt-3 rounded border bg-muted/30 p-2 text-[11px]">
              <div className="font-semibold uppercase tracking-wider text-muted-foreground">Partial acceptance</div>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <KV label="Expected" value={row.expectedQty} compact />
                <KV label="Accepted" value={row.acceptedQty} compact tone="success" />
                <KV label="Rejected" value={row.rejectedQty ?? 0} compact tone="destructive" />
              </div>
            </div>
          )}
        </Section>

        {/* SECTION 3 — Notes */}
        <Section title="Notes" icon={<ScrollText className="h-3.5 w-3.5" />}>
          <Textarea
            placeholder="Operational notes…"
            className="min-h-[72px] text-xs"
            value={row.notes ?? ""}
            onChange={(e) => onPatch({ notes: e.target.value })}
          />
        </Section>

        {/* SECTION 4 — Amazon response */}
        <Section title="Amazon Response" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Accepted Amount</span>
              <Input
                type="number"
                className="mt-1 h-8 text-xs"
                value={row.amazonAcceptedAmount ?? ""}
                onChange={(e) => onPatch({ amazonAcceptedAmount: Number(e.target.value) })}
              />
            </label>
            <label className="text-xs">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Accepted Qty</span>
              <Input
                type="number"
                className="mt-1 h-8 text-xs"
                value={row.acceptedQty ?? ""}
                onChange={(e) => onPatch({ acceptedQty: Number(e.target.value) })}
              />
            </label>
            <label className="col-span-2 text-xs">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Resolution Notes</span>
              <Textarea
                className="mt-1 min-h-[60px] text-xs"
                value={row.resolutionNotes ?? ""}
                onChange={(e) => onPatch({ resolutionNotes: e.target.value })}
              />
            </label>
          </div>
        </Section>

        {/* APPROVAL FLOW */}
        <Section title="Approval" icon={<Lock className="h-3.5 w-3.5" />}>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Executive</div>
              <div className="flex flex-col gap-1.5">
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onPatch({ status: "Validated", reviewedBy: "M. Owens", lastUpdated: "Now" })}>
                  Validate
                </Button>
                <Button size="sm" className="h-8 text-xs" onClick={() => onPatch({ status: "Sent for Approval", lastUpdated: "Now" })}>
                  Send for Approval
                </Button>
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Manager</div>
              <div className="flex flex-col gap-1.5">
                <Button size="sm" className="h-8 bg-success text-success-foreground hover:bg-success/90 text-xs" onClick={() => onPatch({ status: "Approved", lastUpdated: "Now" })}>
                  Approve
                </Button>
                <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => onPatch({ status: "ReValidate", lastUpdated: "Now" })}>
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <div className="flex items-center justify-between border-t bg-muted/30 p-3">
        <Select
          value={row.status}
          onValueChange={(v) => onPatch({ status: v as InvoiceValStatus, lastUpdated: "Now" })}
        >
          <SelectTrigger className="h-8 w-56 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["Need Manual Validation", "Validated", "Sent for Approval", "Approved", "ReValidate", "Locked"] as InvoiceValStatus[]).map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function KV({ label, value, tone = "default", compact }: { label: string; value: React.ReactNode; tone?: "default" | "destructive" | "success"; compact?: boolean }) {
  const toneCls = tone === "destructive" ? "text-destructive" : tone === "success" ? "text-success" : "text-foreground";
  return (
    <div className={cn("rounded border bg-background px-2", compact ? "py-1" : "py-1.5")}>
      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("font-semibold", compact ? "text-xs" : "text-sm", toneCls)}>{value}</div>
    </div>
  );
}
