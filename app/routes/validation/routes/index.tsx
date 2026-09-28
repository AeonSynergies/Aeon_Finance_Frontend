import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileText,
  FileWarning,
  Lock,
  Plus,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { ColumnFilter } from "@/components/validation/ColumnFilter";
import {
  ValidationShell,
  type KpiItem,
  type ValidationStage,
} from "@/components/validation/ValidationShell";
import { BulkActionToolbar } from "@/components/validation/BulkActionToolbar";
import {
  BulkOverrideDialog,
  type OverrideField,
  type OverrideRowInput,
} from "@/components/validation/BulkOverrideDialog";
import { CreateJobDialog } from "@/components/validation/CreateJobDialog";
import { JobSelector } from "@/components/validation/JobSelector";
import { useModuleJobs } from "@/hooks/useModuleJobs";
import { useCreateJob, useDeleteJob, useJobRows } from "@/hooks/useJobs";
import { apiError } from "@/services/client";
import { DisputeTrackerTab } from "@/components/validation/DisputeTrackerTab";
import { RowQuickView } from "@/components/validation/RowQuickView";
import { ApprovalStatusChip, EditableNotesCell, OverrideButton, ValidationStatusChip } from "@/components/validation/StatusCells";
import type { ApprovalStatus, DisputeRow, JobDraft } from "@/components/validation/shared";
import { cn } from "@/lib/utils";

/* ─────────────────────────  Types  ───────────────────────── */

type RouteValStatus =
  | "Need Manual Validation"
  | "Validated"
  | "Sent for Approval"
  | "Approved"
  | "ReValidate"
  | "Locked";

type RouteCategory =
  | "Completed"
  | "AMZL Cancelled"
  | "DSP Cancelled"
  | "Training"
  | "UPD";

type ServiceType =
  | "Standard Parcel - L"
  | "Standard Parcel - M"
  | "Standard Parcel - XL"
  | "Multi-Use Vehicle"
  | "Cargo Van";

interface RouteRow {
  id: string;
  date: string;
  serviceType: ServiceType;
  routeType: string;
  plannedDuration: string;
  category: RouteCategory;
  wstQty: number;
  opsQty: number;
  difference: number;
  disputeRequired: "Yes" | "No";
  disputeNotes: string;
  status: RouteValStatus;
  validationNotes?: string;
  overrideNotes?: string;
  approvalStatus?: ApprovalStatus;
  approverNotes?: string;
  job?: "current" | "previous";
}

interface AuditEntry {
  who: string;
  action: string;
  detail: string;
  at: string;
}

/* ─────────────────────────  API row mapping  ───────────────────────── */

interface ApiRow {
  id: string;
  date?: string | null;
  validationStatus?: string;
  approvalStatus?: string;
  validationNotes?: string | null;
  overrideNotes?: string | null;
  approverNotes?: string | null;
  disputeRequired?: boolean;
  data: string;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function str(v: unknown): string {
  return v === undefined || v === null || v === "" ? "" : String(v);
}

/** API ValidationStatus → module RouteValStatus. */
function apiToRouteStatus(s: string | undefined, locked: boolean): RouteValStatus {
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
function apiToApprovalStatus(s: string | undefined): ApprovalStatus {
  switch (s) {
    case "APPROVED": return "Approved";
    case "REJECTED": return "Rejected";
    default: return "Pending";
  }
}

function mapApiRow(r: ApiRow, locked: boolean): RouteRow {
  let d: Record<string, unknown> = {};
  try {
    d = JSON.parse(r.data) as Record<string, unknown>;
  } catch {
    d = {};
  }
  const wstQty = num(d["WST Qty"]);
  const opsQty = num(d["Ops Qty"]);
  const difference = d.diff !== undefined ? num(d.diff) : wstQty - opsQty;
  return {
    id: r.id,
    date: str(r.date) || "—",
    serviceType: (str(d["Service Type"]) || "—") as ServiceType,
    routeType: str(d["Route Type"]) || "—",
    plannedDuration: "—",
    category: "Completed",
    wstQty,
    opsQty,
    difference,
    disputeRequired: (r.disputeRequired ?? d.disputeRequired) ? "Yes" : "No",
    disputeNotes: str(r.validationNotes),
    status: apiToRouteStatus(r.validationStatus, locked),
    validationNotes: str(r.validationNotes) || undefined,
    overrideNotes: str(r.overrideNotes) || undefined,
    approvalStatus: apiToApprovalStatus(r.approvalStatus),
    approverNotes: str(r.approverNotes) || undefined,
    job: "current",
  };
}

/* ─────────────────────────  Style helpers  ───────────────────────── */

const routeStatusChip: Record<RouteValStatus, string> = {
  "Need Manual Validation": "bg-destructive/10 text-destructive border-destructive/25",
  Validated: "bg-success/10 text-success border-success/25",
  "Sent for Approval": "bg-warning/10 text-warning border-warning/30",
  Approved: "bg-primary/10 text-primary border-primary/25",
  ReValidate: "bg-accent/10 text-accent border-accent/25",
  Locked: "bg-muted text-muted-foreground border-border",
};
const routeStatusIcon: Record<RouteValStatus, typeof CheckCircle2> = {
  "Need Manual Validation": FileWarning,
  Validated: CheckCircle2,
  "Sent for Approval": Clock,
  Approved: ShieldCheck,
  ReValidate: AlertTriangle,
  Locked: Lock,
};
const categoryChip: Record<RouteCategory, string> = {
  Completed: "bg-success/10 text-success border-success/25",
  "AMZL Cancelled": "bg-destructive/10 text-destructive border-destructive/25",
  "DSP Cancelled": "bg-warning/10 text-warning border-warning/30",
  Training: "bg-secondary/15 text-secondary border-secondary/25",
  UPD: "bg-accent/10 text-accent border-accent/25",
};

/* ─────────────────────────  Page  ───────────────────────── */

export default function RouteValidation() {
  const { jobs, selectedJobId, setSelectedJobId, readOnly, loading } =
    useModuleJobs("ROUTE_REVENUE");
  const [rows, setRows] = useState<RouteRow[]>([]);
  // (legacy drawer state removed; quick view is used instead)
  const [showLogs, setShowLogs] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const deleteJobMutation = useDeleteJob();
  const createJobMutation = useCreateJob();
  const rowsQuery = useJobRows(selectedJobId || undefined, "route_revenue");

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

  const [viewMode, setViewMode] = useState<"date" | "full">("full");
  const [editMode, setEditMode] = useState(false);
  const [stage, setStage] = useState<ValidationStage>("draft");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [quickRow, setQuickRow] = useState<RouteRow | null>(null);
  const [topTab, setTopTab] = useState<"validation" | "dispute">("validation");
  const [audit, setAudit] = useState<AuditEntry[]>([
    { who: "Marcus J.", action: "Validated", detail: "R-2501 marked Completed", at: "Today 10:14" },
    { who: "Sofia P.", action: "Sent for approval", detail: "R-2503", at: "Today 10:02" },
    { who: "System", action: "Auto-flagged", detail: "R-2510 qty mismatch", at: "Today 09:48" },
  ]);
  // Filters
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [frozen, setFrozen] = useState<Record<string, boolean>>({});

  // Dispute Tracker rows (derived from rows with disputeRequired = Yes)
  const disputeRows: DisputeRow[] = useMemo(
    () =>
      rows
        .filter((r) => r.disputeRequired === "Yes")
        .map((r) => ({
          id: r.id,
          disputeId: `DSP-${r.id.replace("R-", "")}`,
          disputeType: r.category === "AMZL Cancelled" ? "AMZL Cancellation" : r.category === "UPD" ? "UPD Adjustment" : "Quantity Mismatch",
          validationDisputeStatus:
            r.status === "Need Manual Validation" ? "Pending Validation" : "Need Dispute",
          vendorDisputeStatus: r.status === "Approved" ? "Accepted" : r.status === "Sent for Approval" ? "Under Review" : "Yet to Dispute",
          disputeValue: Math.abs(r.difference) * 220,
          acceptedValue: r.status === "Approved" ? Math.abs(r.difference) * 220 : 0,
          rejectedValue: 0,
          disputeNotes: r.disputeNotes,
          resolutionNotes: r.status === "Approved" ? "Approved by AMZL" : "",
          job: r.job ?? "current",
        })),
    [rows]
  );

  const visibleByJob = rows;

  const filteredRows = useMemo(
    () =>
      visibleByJob.filter((r) =>
        Object.entries(filters).every(([k, sel]) => {
          if (!sel || sel.size === 0) return true;
          return sel.has(String((r as never)[k as keyof RouteRow] ?? ""));
        })
      ),
    [visibleByJob, filters]
  );

  const counts = useMemo(() => {
    const attention = visibleByJob.filter(
      (r) => r.status === "Need Manual Validation" || r.status === "ReValidate"
    ).length;
    return {
      total: visibleByJob.length,
      attention,
      disputes: visibleByJob.filter((r) => r.disputeRequired === "Yes").length,
      completed: visibleByJob.filter((r) => r.category === "Completed").length,
    };
  }, [visibleByJob]);

  const kpis: KpiItem[] = [
    { icon: Truck, label: "Total Routes", value: counts.total, tone: "primary" },
    { icon: AlertTriangle, label: "Need Attention", value: counts.attention, tone: "danger" },
    { icon: FileWarning, label: "Disputes", value: counts.disputes, tone: "warning" },
    { icon: CheckCircle2, label: "Completed", value: counts.completed, tone: "success" },
  ];

  /* ── Selection helpers ── */
  function toggleRow(id: string) {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    if (filteredRows.every((r) => selected.has(r.id)) && filteredRows.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredRows.map((r) => r.id)));
    }
  }
  function clearSelection() { setSelected(new Set()); }
  const allChecked = filteredRows.length > 0 && filteredRows.every((r) => selected.has(r.id));
  const someChecked = filteredRows.some((r) => selected.has(r.id)) && !allChecked;

  /* ── Inline edit ── */
  function updateQty(id: string, key: "wstQty" | "opsQty", value: number) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, [key]: value } as RouteRow;
        next.difference = next.wstQty - next.opsQty;
        return next;
      })
    );
  }
  function saveEdits() {
    setEditMode(false);
    toast.success("Quantity edits saved and difference recalculated");
    setAudit((a) => [
      { who: "You", action: "Edited", detail: `${selected.size || filteredRows.length} routes`, at: "Just now" },
      ...a,
    ]);
  }

  /* ── Bulk actions ── */
  function bulkSubmit() {
    setRows((prev) =>
      prev.map((r) => (selected.has(r.id) ? { ...r, status: "Sent for Approval" } : r))
    );
    toast.success(`${selected.size} routes submitted for approval`);
    setAudit((a) => [{ who: "You", action: "Submitted", detail: `${selected.size} routes`, at: "Just now" }, ...a]);
    clearSelection();
  }
  function bulkDelete() {
    setRows((prev) => prev.filter((r) => !selected.has(r.id)));
    toast.success(`${selected.size} routes deleted`);
    setAudit((a) => [{ who: "You", action: "Deleted", detail: `${selected.size} routes`, at: "Just now" }, ...a]);
    clearSelection();
  }

  /* ── Override ── */
  const overrideFields: OverrideField[] = [
    { key: "wstQty", label: "WST Qty", type: "number", width: "100px" },
    { key: "opsQty", label: "Ops Qty", type: "number", width: "100px" },
    { key: "category", label: "Category", width: "150px" },
  ];
  const overrideRows: OverrideRowInput[] = visibleByJob
    .filter((r) => selected.has(r.id))
    .map((r) => ({
      id: r.id,
      identifier: r.id,
      currentStatus: r.status,
      values: { wstQty: r.wstQty, opsQty: r.opsQty, category: r.category },
    }));

  /* ── Add Row ── */
  function handleAddRow(newRow: RouteRow) {
    setRows((prev) => [{ ...newRow, job: "current" }, ...prev]);
    toast.success(`Route ${newRow.id} added`);
    setAudit((a) => [{ who: "You", action: "Added", detail: newRow.id, at: "Just now" }, ...a]);
  }

  /* ── Create Job ── */
  async function handleCreateJob(job: JobDraft) {
    try {
      await createJobMutation.mutateAsync({
        module: "ROUTE_REVENUE",
        frequency: job.frequency,
        periodStart: job.periodStart,
        periodEnd: job.periodEnd,
        processDate: job.processDate,
      });
      toast.success(`Job ${job.jobId} created · upload matrix initialized`);
      setAudit((a) => [
        { who: "You", action: "Job created", detail: `${job.jobId} · ${job.frequency} · ${job.periodStart} → ${job.periodEnd}`, at: "Just now" },
        ...a,
      ]);
    } catch (e) {
      toast.error(apiError(e, "Failed to create job"));
    }
  }

  /* ── Submit page ── */
  function submitPage() {
    setStage("submitted");
    toast.success("Submitted for manager approval");
    setAudit((a) => [{ who: "You", action: "Submitted page", detail: "Route Revenue", at: "Just now" }, ...a]);
  }

  return (
    <AppLayout title="Route Revenue Validation" subtitle="Validation → Routes → Route Revenue" showAlert={false}>
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
            <span className="text-sm font-bold tracking-tight">Route Revenue Validation</span>
          </div>
          <JobSelector
            jobs={jobs}
            selectedJobId={selectedJobId}
            onSelect={(v) => { setSelectedJobId(v); clearSelection(); }}
            onCreateJob={() => setCreateJobOpen(true)}
            onDeleteJob={() => setDeleteConfirmOpen(true)}
            loading={loading}
          />
        </div>
      <ValidationShell
        title="Route Revenue Validation"
        periodLabel="Week 25 · Jun 16 – 22, 2026"
        processLabel="Station: DSE2"
        viewLabel="Executive"
        stage={stage}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        editMode={editMode}
        onEditToggle={() => (editMode ? saveEdits() : setEditMode(true))}
        editDisabled={readOnly}
        kpis={kpis}
        tableTitle="Daily Route Validation"
        attentionCount={counts.attention}
        totalCount={counts.total}
        submitDisabled={counts.attention > 0 || stage !== "draft" || readOnly}
        onSubmit={submitPage}
        tableHeaderActions={
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              onClick={() => setCreateJobOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Create Job
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              onClick={() => setAddRowOpen(true)}
              disabled={readOnly}
            >
              <Plus className="h-3.5 w-3.5" /> Add Row
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => toast.success("Export queued")}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </>
        }
        rightHeaderExtras={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs" onClick={() => setShowLogs(true)}>
              <FileText className="h-3.5 w-3.5" /> Logs
            </Button>
          </div>
        }
        topTabs={[
          { key: "validation", label: "Validation" },
          { key: "dispute", label: "Dispute Tracking" },
        ]}
        topTab={topTab}
        onTopTabChange={(v) => setTopTab(v as "validation" | "dispute")}
        disputePane={<DisputeTrackerTab rows={disputeRows} />}
      >
        {/* Bulk action toolbar */}
        <BulkActionToolbar
          count={selected.size}
          onClear={clearSelection}
          onEdit={() => { setEditMode(true); toast.info("Edit mode enabled — update WST/Ops Qty inline"); }}
          onDelete={bulkDelete}
          onSubmit={bulkSubmit}
          onOverride={() => setOverrideOpen(true)}
          isApprover={false}
        />

        {/* Scrollable table area with sticky header */}
        <div className="relative overflow-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead className="sticky top-0 z-20 bg-muted/70 backdrop-blur">
              <tr>
                <th className="sticky left-0 z-30 h-9 w-10 border-b bg-muted/70 px-2 text-left">
                  <Checkbox
                    checked={allChecked ? true : someChecked ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                {COLS.map((c) => {
                  const active = !!filters[c.key] && filters[c.key].size > 0;
                  const isFrozen = !!frozen[c.key];
                  return (
                    <th
                      key={c.key}
                      style={c.width ? { width: c.width } : undefined}
                      className={cn(
                        "h-9 whitespace-nowrap border-b px-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        isFrozen && "sticky left-10 z-20 bg-muted/80 shadow-[2px_0_0_hsl(var(--border))]"
                      )}
                    >
                      <span className="inline-flex items-center">
                        {c.label}
                        {c.filterable && (
                          <ColumnFilter
                            columnKey={c.key}
                            values={visibleByJob.map((r) => String((r as never)[c.key] ?? ""))}
                            selected={filters[c.key] ?? new Set()}
                            onApply={(s) => setFilters((p) => ({ ...p, [c.key]: s }))}
                            onReset={() =>
                              setFilters((p) => {
                                const n = { ...p };
                                delete n[c.key];
                                return n;
                              })
                            }
                            frozen={isFrozen}
                            onToggleFreeze={() => setFrozen((p) => ({ ...p, [c.key]: !p[c.key] }))}
                            active={active}
                          />
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={COLS.length + 1} className="px-3 py-10 text-center text-xs text-muted-foreground">
                    {!selectedJobId
                      ? "Select a job above or create a new one to begin"
                      : rows.length === 0
                        ? "No rows yet — upload the WST Weekly Report to begin validation"
                        : "No routes match these filters"}
                  </td>
                </tr>
              )}
              {filteredRows.map((r, i) => {
                const isSel = selected.has(r.id);
                const Icon = routeStatusIcon[r.status];
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b transition-colors hover:bg-primary/5",
                      i % 2 === 1 && "bg-muted/20",
                      isSel && "bg-primary/10 hover:bg-primary/15"
                    )}
                  >
                    <td className="h-10 w-10 px-2 align-middle">
                      <Checkbox
                        checked={isSel}
                        onCheckedChange={() => toggleRow(r.id)}
                        aria-label={`Select ${r.id}`}
                      />
                    </td>
                    <td className="h-10 px-3 align-middle" onClick={() => setQuickRow(r)}>
                      <span className="cursor-pointer font-mono text-[11.5px] font-semibold text-primary">{r.date}</span>
                    </td>
                    <td className="h-10 px-3 align-middle font-medium">{r.serviceType}</td>
                    <td className="h-10 px-3 align-middle">{r.routeType}</td>
                    <td className="h-10 px-3 text-right align-middle">{r.plannedDuration}</td>
                    <td className="h-10 px-3 align-middle">
                      <span className={cn("aeon-stat-pill border", categoryChip[r.category])}>{r.category}</span>
                    </td>
                    <td className="h-10 w-[90px] px-2 text-right align-middle">
                      {editMode && !readOnly ? (
                        <Input
                          type="number"
                          value={r.wstQty}
                          onChange={(e) => updateQty(r.id, "wstQty", Number(e.target.value))}
                          className="h-7 border-primary/40 bg-primary/5 text-right text-xs font-semibold"
                        />
                      ) : (
                        <span className="tabular-nums">{r.wstQty}</span>
                      )}
                    </td>
                    <td className="h-10 w-[90px] px-2 text-right align-middle">
                      {editMode && !readOnly ? (
                        <Input
                          type="number"
                          value={r.opsQty}
                          onChange={(e) => updateQty(r.id, "opsQty", Number(e.target.value))}
                          className="h-7 border-primary/40 bg-primary/5 text-right text-xs font-semibold"
                        />
                      ) : (
                        <span className="tabular-nums">{r.opsQty}</span>
                      )}
                    </td>
                    <td className="h-10 px-3 text-right align-middle">
                      <span className={cn("font-semibold tabular-nums", r.difference !== 0 ? "text-destructive" : "text-muted-foreground")}>
                        {r.difference > 0 ? `+${r.difference}` : r.difference}
                      </span>
                    </td>
                    <td className="h-10 px-3 text-center align-middle">
                      {r.disputeRequired === "Yes" ? (
                        <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">Yes</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="h-10 px-3 align-middle">
                      <span className="block max-w-[200px] truncate text-xs text-muted-foreground" title={r.disputeNotes}>
                        {r.disputeNotes || "—"}
                      </span>
                    </td>
                    <td className="h-10 px-3 align-middle">
                      <ValidationStatusChip status={routeToValidation(r.status)} />
                    </td>
                    <td className="h-10 px-3 align-middle">
                      <EditableNotesCell
                        value={r.validationNotes}
                        editing={editMode && !readOnly}
                        onChange={(v) => setRows((p) => p.map((x) => (x.id === r.id ? { ...x, validationNotes: v } : x)))}
                        placeholder="Add validation note"
                      />
                    </td>
                    <td className="h-10 px-3 align-middle">
                      <EditableNotesCell
                        value={r.overrideNotes}
                        editing={editMode && !readOnly}
                        onChange={(v) => setRows((p) => p.map((x) => (x.id === r.id ? { ...x, overrideNotes: v } : x)))}
                        placeholder="No override"
                      />
                    </td>
                    <td className="h-10 px-3 align-middle">
                      <ApprovalStatusChip status={r.approvalStatus ?? "Pending"} />
                    </td>
                    <td className="h-10 px-3 align-middle">
                      <EditableNotesCell
                        value={r.approverNotes}
                        editing={editMode && !readOnly && r.approvalStatus === "Rejected"}
                        onChange={(v) => setRows((p) => p.map((x) => (x.id === r.id ? { ...x, approverNotes: v } : x)))}
                        placeholder={r.approvalStatus === "Rejected" ? "Required on reject" : "—"}
                      />
                    </td>
                    <td className="h-10 px-3 align-middle">
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setQuickRow(r)}>
                          View
                        </Button>
                        <OverrideButton
                          disabled={readOnly}
                          onClick={() => {
                            setSelected(new Set([r.id]));
                            setOverrideOpen(true);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
          <span>
            Showing <b className="text-foreground">{filteredRows.length}</b> of {visibleByJob.length}
          </span>
          <span className="inline-flex items-center gap-1">
            <ClipboardList className="h-3 w-3" /> Sticky headers · column filters · inline edit · bulk actions
          </span>
        </div>
      </ValidationShell>
      </div>

      {/* Bulk override modal */}
      <BulkOverrideDialog
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        rows={overrideRows}
        fields={overrideFields}
        identifierLabel="Route"
        statusLabel="Current Status"
        onSubmit={(updates) => {
          setRows((prev) =>
            prev.map((r) => {
              const u = updates.find((x) => x.id === r.id);
              if (!u) return r;
              const wstQty = Number(u.values.wstQty);
              const opsQty = Number(u.values.opsQty);
              return {
                ...r,
                wstQty,
                opsQty,
                difference: wstQty - opsQty,
                category: (u.values.category as RouteCategory) ?? r.category,
                status: "Validated" as RouteValStatus,
              };
            })
          );
          const at = new Date().toLocaleString();
          setAudit((a) => [
            ...updates.map((u) => ({
              who: u.by,
              action: "Override",
              detail: `${u.id} — ${u.notes}`,
              at,
            })),
            ...a,
          ]);
          toast.success(`Override applied to ${updates.length} routes`);
          clearSelection();
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

      {/* Add Row modal */}
      <AddRowDialog open={addRowOpen} onOpenChange={setAddRowOpen} onAdd={handleAddRow} />

      {/* Create Job modal */}
      <CreateJobDialog
        open={createJobOpen}
        onOpenChange={setCreateJobOpen}
        module="route"
        validationType="Route Revenue"
        jobIdPrefix="RT"
        onCreate={handleCreateJob}
      />

      {/* Row Quick View slide */}
      <RowQuickView
        open={!!quickRow}
        onOpenChange={(o) => !o && setQuickRow(null)}
        title={quickRow ? `${quickRow.id} · ${quickRow.serviceType}` : ""}
        subtitle={quickRow ? `${quickRow.date} · ${quickRow.routeType} · Planned ${quickRow.plannedDuration}` : ""}
        validationStatus={quickRow ? routeToValidation(quickRow.status) : undefined}
        approval={{ status: quickRow?.approvalStatus ?? "Pending", approverNotes: quickRow?.approverNotes }}
        override={quickRow?.overrideNotes ? { notes: quickRow.overrideNotes, by: "Executive", at: new Date().toISOString() } : undefined}
        audit={audit
          .filter((a) => a.detail.includes(quickRow?.id ?? ""))
          .map((a, i) => ({ id: `${i}`, who: a.who, action: a.action, detail: a.detail, at: a.at }))}
        detailsBody={
          quickRow && (
            <div className="space-y-2 text-[12px]">
              <KV k="Route ID" v={quickRow.id} />
              <KV k="Service Type" v={quickRow.serviceType} />
              <KV k="Route Type" v={quickRow.routeType} />
              <KV k="Planned Duration" v={quickRow.plannedDuration} />
              <KV k="Category" v={quickRow.category} />
              <KV k="WST Qty" v={String(quickRow.wstQty)} />
              <KV k="Ops Qty" v={String(quickRow.opsQty)} />
              <KV k="Difference" v={String(quickRow.difference)} />
              <KV k="Dispute Required" v={quickRow.disputeRequired} />
              <KV k="Dispute Notes" v={quickRow.disputeNotes || "—"} />
            </div>
          )
        }
        validationBody={quickRow?.validationNotes || (quickRow?.disputeNotes ?? "—")}
      />

      {/* Logs sheet */}
      <Sheet open={showLogs} onOpenChange={setShowLogs}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Audit Log</SheetTitle>
            <SheetDescription>Edits, overrides, approvals, deletions, status changes</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2 text-xs">
            {audit.map((e, i) => (
              <div key={i} className="aeon-soft p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{e.who} · {e.action}</span>
                  <span className="text-[10.5px] text-muted-foreground">{e.at}</span>
                </div>
                <div className="mt-0.5 text-muted-foreground">{e.detail}</div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

/* ─────────────────────────  Column defs (header)  ───────────────────────── */

const COLS: { key: keyof RouteRow & string; label: string; width?: string; align?: "left" | "right" | "center"; filterable?: boolean }[] = [
  { key: "date", label: "Date", width: "80px", filterable: true },
  { key: "serviceType", label: "Service Type", filterable: true },
  { key: "routeType", label: "Route Type", filterable: true, width: "110px" },
  { key: "plannedDuration", label: "Planned", width: "80px", align: "right" },
  { key: "category", label: "Category", filterable: true, width: "140px" },
  { key: "wstQty", label: "WST Qty", width: "80px", align: "right" },
  { key: "opsQty", label: "Ops Qty", width: "80px", align: "right" },
  { key: "difference", label: "Diff", width: "70px", align: "right" },
  { key: "disputeRequired", label: "Dispute?", width: "90px", align: "center", filterable: true },
  { key: "disputeNotes", label: "Dispute Notes", width: "200px" },
  { key: "status", label: "Validation Status", filterable: true, width: "190px" },
  { key: "validationNotes", label: "Validation Notes", width: "200px" },
  { key: "overrideNotes", label: "Override Notes", width: "200px" },
  { key: "approvalStatus", label: "Approval Status", width: "140px", filterable: true },
  { key: "approverNotes", label: "Approver Notes", width: "200px" },
  { key: "id", label: "Action", width: "150px" },
];

/* Map module RouteValStatus → standardized ValidationStatus */
import type { ValidationStatus as VS } from "@/components/validation/shared";
function routeToValidation(s: RouteValStatus): VS {
  switch (s) {
    case "Validated": return "Validated";
    case "Need Manual Validation": return "Need Manual Validation";
    case "Sent for Approval": return "Sent for Approval";
    case "Approved": return "Validated";
    case "ReValidate": return "Need Manual Validation";
    case "Locked": return "Locked";
  }
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-1 last:border-0">
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">{k}</span>
      <span className="max-w-[60%] text-right text-[12px]">{v}</span>
    </div>
  );
}

/* ─────────────────────────  Add Row Dialog  ───────────────────────── */

function AddRowDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (row: RouteRow) => void;
}) {
  const [date, setDate] = useState("Jun 21");
  const [serviceType, setServiceType] = useState<ServiceType>("Standard Parcel - L");
  const [routeType, setRouteType] = useState("CYCLE_1");
  const [plannedDuration, setPlannedDuration] = useState("10h");
  const [category, setCategory] = useState<RouteCategory>("Completed");
  const [wstQty, setWstQty] = useState(1);
  const [opsQty, setOpsQty] = useState(1);
  const [disputeRequired, setDisputeRequired] = useState<"Yes" | "No">("No");
  const [disputeNotes, setDisputeNotes] = useState("");
  const [status, setStatus] = useState<RouteValStatus>("Need Manual Validation");

  function submit() {
    const id = `R-${Math.floor(2600 + Math.random() * 400)}`;
    onAdd({
      id,
      date,
      serviceType,
      routeType,
      plannedDuration,
      category,
      wstQty,
      opsQty,
      difference: wstQty - opsQty,
      disputeRequired,
      disputeNotes,
      status,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Add Route Row</DialogTitle>
          <DialogDescription className="text-xs">
            Adds a route into the current job. Validation logic recalculates and the audit log is updated.
          </DialogDescription>
        </DialogHeader>

        <FormSection title="Route Information">
          <Grid>
            <FieldBlock label="Date"><Input value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-xs" /></FieldBlock>
            <FieldBlock label="Service Type">
              <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceType)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Standard Parcel - L","Standard Parcel - M","Standard Parcel - XL","Multi-Use Vehicle","Cargo Van"] as ServiceType[]).map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldBlock>
            <FieldBlock label="Route Type"><Input value={routeType} onChange={(e) => setRouteType(e.target.value)} className="h-8 text-xs" /></FieldBlock>
            <FieldBlock label="Planned Duration"><Input value={plannedDuration} onChange={(e) => setPlannedDuration(e.target.value)} className="h-8 text-xs" /></FieldBlock>
            <FieldBlock label="Category">
              <Select value={category} onValueChange={(v) => setCategory(v as RouteCategory)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Completed","AMZL Cancelled","DSP Cancelled","Training","UPD"] as RouteCategory[]).map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldBlock>
          </Grid>
        </FormSection>

        <FormSection title="Validation Information">
          <Grid cols={3}>
            <FieldBlock label="WST Qty"><Input type="number" value={wstQty} onChange={(e) => setWstQty(Number(e.target.value))} className="h-8 text-xs" /></FieldBlock>
            <FieldBlock label="Ops Qty"><Input type="number" value={opsQty} onChange={(e) => setOpsQty(Number(e.target.value))} className="h-8 text-xs" /></FieldBlock>
            <FieldBlock label="Diff"><Input value={wstQty - opsQty} disabled className="h-8 text-xs" /></FieldBlock>
          </Grid>
        </FormSection>

        <FormSection title="Dispute Information">
          <Grid>
            <FieldBlock label="Dispute Required">
              <Select value={disputeRequired} onValueChange={(v) => setDisputeRequired(v as "Yes" | "No")}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="No" className="text-xs">No</SelectItem>
                  <SelectItem value="Yes" className="text-xs">Yes</SelectItem>
                </SelectContent>
              </Select>
            </FieldBlock>
            <FieldBlock label="Validation Status">
              <Select value={status} onValueChange={(v) => setStatus(v as RouteValStatus)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Need Manual Validation","Validated","Sent for Approval"] as RouteValStatus[]).map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldBlock>
          </Grid>
          <div className="mt-2">
            <Label className="text-[11px] font-semibold text-muted-foreground">Dispute Notes</Label>
            <Textarea
              value={disputeNotes}
              onChange={(e) => setDisputeNotes(e.target.value)}
              className="mt-1 min-h-[70px] text-xs"
              placeholder="Optional notes for downstream dispute…"
            />
          </div>
        </FormSection>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">Cancel</Button>
          <Button onClick={submit} className="h-8 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add Route
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}
function Grid({ cols = 2, children }: { cols?: 2 | 3; children: React.ReactNode }) {
  return <div className={cn("grid gap-2", cols === 3 ? "grid-cols-3" : "grid-cols-2")}>{children}</div>;
}
function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[11px] font-semibold text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

