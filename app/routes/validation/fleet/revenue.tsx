import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  Download,
  FileText,
  Gavel,
  Plus,
  Receipt,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ColumnFilter } from "@/components/validation/ColumnFilter";
import {
  ValidationShell,
  type KpiItem,
  type ValidationStage,
} from "@/components/validation/ValidationShell";
import { CreateJobDialog } from "@/components/validation/CreateJobDialog";
import { DisputeTrackerTab } from "@/components/validation/DisputeTrackerTab";
import { JobSelector } from "@/components/validation/JobSelector";
import { useModuleJobs, type ModuleJob } from "@/hooks/useModuleJobs";
import { ApprovalStatusChip, EditableNotesCell, OverrideButton } from "@/components/validation/StatusCells";
import type { DisputeRow as SharedDisputeRow, VendorDisputeStatus, ValidationDisputeStatus, JobDraft } from "@/components/validation/shared";
import { cn } from "@/lib/utils";
import { apiError } from "@/services/client";
import { useCreateJob, useDeleteJob, useJobRows } from "@/hooks/useJobs";

const mapVendorStatus = (s: string): VendorDisputeStatus => {
  switch (s) {
    case "Accepted": return "Accepted";
    case "Rejected": return "Rejected";
    case "Resolved": return "Accepted";
    case "Under Review":
    case "Raised":
    case "Re-Raise":
      return "Under Review";
    default: return "Yet to Dispute";
  }
};
const mapValDisputeStatus = (s: string): ValidationDisputeStatus =>
  s === "Need Dispute" ? "Need Dispute" : s === "Resolved" || s === "Accepted" || s === "Rejected" ? "No Dispute" : "Pending Validation";

/* ──────────────── Types ──────────────── */

type VehicleType =
  | "Standard Parcel - L"
  | "Standard Parcel - M"
  | "Standard Parcel - XL"
  | "Multi-Use Vehicle"
  | "Cargo Van";

type OwnershipType = "Owned" | "Rented" | "Leased";

type InvoiceValStatus =
  | "Matched"
  | "Short Paid"
  | "Over Paid"
  | "Disputed"
  | "Locked";

type DisputeStatus =
  | "Need Dispute"
  | "Raised"
  | "Under Review"
  | "Accepted"
  | "Rejected"
  | "Re-Raise"
  | "Resolved";

interface ExpectedRow {
  id: string;
  vehicleType: VehicleType;
  vendor: string;
  ownership: OwnershipType;
  eligibleQty: number;
  rate: number;
  disputeQty: number;
  // derived
}

interface InvoiceRow {
  id: string;
  vehicleType: VehicleType;
  vendor: string;
  expectedQty: number;
  paidQty: number;
  rate: number;
  status: InvoiceValStatus;
  disputeStatus: DisputeStatus | "—";
  validationNotes?: string;
  overrideNotes?: string;
  approvalStatus?: "Pending" | "Approved" | "Rejected";
  approverNotes?: string;
}

interface DisputeRow {
  id: string;
  vehicleType: VehicleType;
  vendor: string;
  disputeType: string;
  qtyImpact: number;
  revenueImpact: number;
  status: DisputeStatus;
  deadline: string;
  notes: string;
}

/* ──────────────── API row mapping ──────────────── */

interface ApiRow {
  id: string;
  date?: string | null;
  data: string;
  validationNotes?: string | null;
  overrideNotes?: string | null;
  approverNotes?: string | null;
  approvalStatus?: string | null;
  disputeStatus?: string | null;
  disputeValue?: number | null;
}

const VEHICLE_TYPES: VehicleType[] = [
  "Standard Parcel - L",
  "Standard Parcel - M",
  "Standard Parcel - XL",
  "Multi-Use Vehicle",
  "Cargo Van",
];
const OWNERSHIP_TYPES: OwnershipType[] = ["Owned", "Rented", "Leased"];

const matchEnum = <T extends string>(list: T[], v: unknown, fallback: T): T => {
  const s = String(v ?? "").trim().toLowerCase();
  return list.find((o) => o.toLowerCase() === s) ?? fallback;
};

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

const toApprovalStatus = (v: unknown): "Pending" | "Approved" | "Rejected" => {
  const s = String(v ?? "").toUpperCase();
  return s === "APPROVED" ? "Approved" : s === "REJECTED" ? "Rejected" : "Pending";
};

/** Parsed representation of one API ValidationRow → the page's two view shapes.
 * SOURCE columns are keyed by master label; derived fields are camelCase. */
function mapFleetRow(r: ApiRow): { expected: ExpectedRow; invoice: InvoiceRow } {
  let d: Record<string, unknown> = {};
  try {
    d = JSON.parse(r.data) as Record<string, unknown>;
  } catch {
    d = {};
  }
  const vehicleType = matchEnum(VEHICLE_TYPES, d["Vehicle Type"], "Standard Parcel - M");
  const ownership = matchEnum(OWNERSHIP_TYPES, d["Ownership"], "Owned");
  const vendor = String(d["Vendor"] ?? "—");
  const eligibleQty = n(d["Eligible Qty"]);
  const rate = n(d["Rate"]);
  const paidAmount = n(d["Amount"] ?? d["Paid Amount"] ?? d["paidAmount"]);
  const expectedRevenue = n(d["expectedRevenue"]) || eligibleQty * rate;
  const paidQty = rate > 0 ? Math.round(paidAmount / rate) : 0;
  const diff = n(d["diff"]) || expectedRevenue - paidAmount;
  const needDispute = String(r.disputeStatus ?? "").toUpperCase() === "NEED_DISPUTE";

  const status: InvoiceValStatus =
    diff > 0 ? "Short Paid" : diff < 0 ? "Over Paid" : "Matched";

  return {
    expected: {
      id: r.id,
      vehicleType,
      vendor,
      ownership,
      eligibleQty,
      rate,
      disputeQty: 0,
    },
    invoice: {
      id: r.id,
      vehicleType,
      vendor,
      expectedQty: eligibleQty,
      paidQty,
      rate,
      status,
      disputeStatus: needDispute ? "Need Dispute" : "—",
      validationNotes: r.validationNotes ?? undefined,
      overrideNotes: r.overrideNotes ?? undefined,
      approvalStatus: toApprovalStatus(r.approvalStatus),
      approverNotes: r.approverNotes ?? undefined,
    },
  };
}

/* ──────────────── Style helpers ──────────────── */

const invStatusStyle: Record<InvoiceValStatus, string> = {
  Matched: "bg-success/10 text-success border-success/25",
  "Short Paid": "bg-destructive/10 text-destructive border-destructive/25",
  "Over Paid": "bg-warning/10 text-warning border-warning/30",
  Disputed: "bg-accent/10 text-accent border-accent/25",
  Locked: "bg-muted text-foreground border-border",
};

const disputeStyle: Record<DisputeStatus | "—", string> = {
  "Need Dispute": "bg-warning/10 text-warning border-warning/30",
  Raised: "bg-primary/10 text-primary border-primary/25",
  "Under Review": "bg-secondary/15 text-secondary border-secondary/25",
  Accepted: "bg-success/10 text-success border-success/25",
  Rejected: "bg-destructive/10 text-destructive border-destructive/25",
  "Re-Raise": "bg-destructive/10 text-destructive border-destructive/25",
  Resolved: "bg-muted text-foreground border-border",
  "—": "bg-muted/40 text-muted-foreground border-border",
};

const fmt$ = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/* ──────────────── Page ──────────────── */

type FilterKey = "vehicleType" | "vendor" | "ownership" | "disputeType" | "status";

export default function FleetRevenueValidation() {
  const [tab, setTab] = useState<"expected" | "invoice">("expected");
  const [topTab, setTopTab] = useState<"validation" | "dispute">("validation");
  const { jobs, selectedJobId, setSelectedJobId, readOnly, loading } =
    useModuleJobs("FLEET_REVENUE");
  const [viewMode, setViewMode] = useState<"date" | "full">("full");
  const [editMode, setEditMode] = useState(false);
  const [stage, setStage] = useState<ValidationStage>("draft");
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const rowsQuery = useJobRows(selectedJobId || undefined, "fleet_revenue");
  const createJob = useCreateJob();
  const removeJob = useDeleteJob();
  const mapped = useMemo(
    () => (selectedJobId && rowsQuery.data ? rowsQuery.data.map(mapFleetRow) : []),
    [selectedJobId, rowsQuery.data]
  );
  const expectedRows = useMemo(() => mapped.map((m) => m.expected), [mapped]);
  // ponytail: local copy so inline invoice edits stay optimistic (as before).
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const updateInvoice = (id: string, patch: Partial<InvoiceRow>) =>
    setInvoices((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  useEffect(() => {
    setInvoices(mapped.map((m) => m.invoice));
  }, [mapped]);

  async function deleteJob() {
    if (!selectedJobId) return;
    try {
      await removeJob.mutateAsync(selectedJobId);
      toast.success("Job deleted");
      setSelectedJobId("");
    } catch (e) {
      toast.error(apiError(e, "Failed to delete job"));
    } finally {
      setDeleteConfirmOpen(false);
    }
  }

  async function handleCreateJob(job: JobDraft) {
    try {
      await createJob.mutateAsync({
        module: "FLEET_REVENUE",
        frequency: job.frequency,
        periodStart: job.periodStart,
        periodEnd: job.periodEnd,
        processDate: job.processDate,
      });
      toast.success(`Job ${job.jobId} created`);
    } catch (e) {
      toast.error(apiError(e, "Failed to create job"));
    }
  }

  const sharedDisputes: SharedDisputeRow[] = useMemo(
    () =>
      invoices
        .filter((r) => r.disputeStatus !== "—")
        .map((r) => {
          const value = Math.max(0, (r.expectedQty - r.paidQty) * r.rate);
          const status = String(r.disputeStatus);
          return {
            id: r.id,
            disputeId: r.id,
            disputeType: "AFS Count",
            validationDisputeStatus: mapValDisputeStatus(status),
            vendorDisputeStatus: mapVendorStatus(status),
            disputeValue: value,
            acceptedValue: 0,
            rejectedValue: 0,
            disputeNotes: r.validationNotes ?? "",
            resolutionNotes: undefined,
            job: "current",
          };
        }),
    [invoices]
  );

  const [filters, setFilters] = useState<Record<FilterKey, Set<string>>>({
    vehicleType: new Set(),
    vendor: new Set(),
    ownership: new Set(),
    disputeType: new Set(),
    status: new Set(),
  });
  const [frozen, setFrozen] = useState<Record<FilterKey, boolean>>({
    vehicleType: true,
    vendor: false,
    ownership: false,
    disputeType: false,
    status: false,
  });

  /* Derived expected revenue rows */
  const expectedDerived = useMemo(
    () =>
      expectedRows.map((r) => {
        const expected = r.eligibleQty * r.rate;
        const adjusted = r.disputeQty * r.rate;
        return { ...r, expected, adjusted, final: expected + adjusted };
      }),
    [expectedRows]
  );

  const totalExpected = expectedDerived.reduce((s, r) => s + r.final, 0);
  const totalPaid = invoices.reduce((s, r) => s + r.paidQty * r.rate, 0);
  const totalDiff = totalExpected - totalPaid;
  const openDisputes = invoices.filter((r) => r.disputeStatus === "Need Dispute").length;
  const attentionCount =
    invoices.filter((r) => r.status === "Short Paid" || r.status === "Over Paid" || r.status === "Disputed").length;

  const kpis: KpiItem[] = [
    { icon: BadgeDollarSign, label: "Expected Revenue", value: fmt$(totalExpected), tone: "primary" },
    { icon: Receipt, label: "Paid Revenue", value: fmt$(totalPaid), tone: "info" },
    { icon: AlertTriangle, label: "Revenue Diff", value: fmt$(totalDiff), tone: totalDiff > 0 ? "danger" : "success" },
    { icon: Gavel, label: "Open Disputes", value: openDisputes, tone: "warning" },
  ];

  /* Filters helpers */
  function colValuesInvoice(k: FilterKey): string[] {
    return Array.from(new Set(invoices.map((r) => String((r as any)[k] ?? "—"))));
  }
  const invoiceVisible = invoices.filter((r) => {
    const test = (k: FilterKey, v: string) => filters[k].size === 0 || filters[k].has(v);
    return (
      test("vehicleType", r.vehicleType) &&
      test("vendor", r.vendor) &&
      test("status", r.status)
    );
  });

  return (
    <AppLayout
      title="Fleet Revenue Validation"
      subtitle="Validate expected vs paid fleet revenue and disputes"
      showAlert={false}
    >
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
            <span className="text-sm font-bold tracking-tight">Fleet Revenue Validation</span>
          </div>
          <JobSelector
            jobs={jobs as unknown as ModuleJob[]}
            selectedJobId={selectedJobId}
            onSelect={setSelectedJobId}
            onCreateJob={() => setCreateJobOpen(true)}
            onDeleteJob={() => setDeleteConfirmOpen(true)}
            loading={loading}
          />
        </div>
      <ValidationShell
        title="Fleet Revenue Validation"
        periodLabel="Apr 2026"
        processLabel="Process: Apr 28, 2026"
        viewLabel="Executive"
        stage={stage}
        topTabs={[
          { key: "validation", label: "Validation" },
          { key: "dispute", label: "Dispute Tracking" },
        ]}
        topTab={topTab}
        onTopTabChange={(v) => setTopTab(v as "validation" | "dispute")}
        disputePane={<DisputeTrackerTab rows={sharedDisputes} job="current" />}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        editMode={editMode}
        onEditToggle={() => { if (editMode) toast.success("Edits saved"); setEditMode((v) => !v); }}
        editDisabled={readOnly}
        kpis={kpis}
        attentionCount={attentionCount}
        totalCount={invoices.length}
        submitDisabled={attentionCount > 0 || stage !== "draft" || readOnly}
        onSubmit={() => {
          setStage("submitted");
          toast.success("Submitted for manager approval");
        }}
        tableHeaderActions={
          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setCreateJobOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Create Job
          </Button>
        }
        rightHeaderExtras={
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 text-xs"
              onClick={() => toast.success("Export started")}
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" /> Logs
            </Button>
          </>
        }
      >
        <div className="space-y-3 p-3">
          {/* MINIMAL AEON TABS */}
          <div className="border-b">
            <nav className="flex items-center gap-0">
              {[
                { key: "expected", label: "Expected Revenue", count: expectedRows.length },
                { key: "invoice", label: "Invoice Validation", count: invoices.length },
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

          {!selectedJobId ? (
            <div className="rounded-lg border bg-card px-3 py-16 text-center text-xs text-muted-foreground">
              Select a job above or create a new one to begin
            </div>
          ) : invoices.length === 0 ? (
            <div className="rounded-lg border bg-card px-3 py-16 text-center text-xs text-muted-foreground">
              No rows yet — upload the Vehicle Revenue Export and Amazon Fleet Invoice to begin validation
            </div>
          ) : null}

          {/* EXPECTED REVENUE TAB */}
          {selectedJobId && invoices.length > 0 && tab === "expected" && (
            <div className="rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider">Expected Fleet Revenue</span>
                  <Badge variant="outline" className="h-5 text-[10px]">
                    (AFS Eligible Qty + Approved Dispute Qty) × Rate Card
                  </Badge>
                </div>
              </div>
              <div className="relative max-h-[640px] overflow-auto">
                <table className="w-full border-collapse text-[11.5px]">
                  <thead className="sticky top-0 z-10 bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <Th sticky>Vehicle Type</Th>
                      <Th>Vendor</Th>
                      <Th>Ownership</Th>
                      <Th right>Eligible Qty</Th>
                      <Th right>Rate</Th>
                      <Th right>Expected Revenue</Th>
                      <Th right>Dispute Qty</Th>
                      <Th right>Adjusted Revenue</Th>
                      <Th right>Final Revenue</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {expectedDerived.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="sticky left-0 z-[1] bg-card px-3 py-2 font-semibold">{r.vehicleType}</td>
                        <td className="px-3 py-2">{r.vendor}</td>
                        <td className="px-3 py-2">{r.ownership}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.eligibleQty}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt$(r.rate)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt$(r.expected)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.disputeQty}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt$(r.adjusted)}</td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums text-primary">{fmt$(r.final)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 z-10 bg-muted/60 text-[11px] font-bold uppercase">
                    <tr>
                      <td className="px-3 py-2" colSpan={5}>Total</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmt$(expectedDerived.reduce((s, r) => s + r.expected, 0))}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {expectedDerived.reduce((s, r) => s + r.disputeQty, 0)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmt$(expectedDerived.reduce((s, r) => s + r.adjusted, 0))}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-primary">{fmt$(totalExpected)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* INVOICE VALIDATION TAB */}
          {selectedJobId && invoices.length > 0 && tab === "invoice" && (
            <div className="rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <div className="flex items-center gap-2">
                  <Receipt className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider">Fleet Revenue Invoice Validation</span>
                  <Badge variant="outline" className="h-5 text-[10px]">
                    {invoiceVisible.length} of {invoices.length}
                  </Badge>
                </div>
              </div>
              <div className="relative max-h-[640px] overflow-auto">
                <table className="w-full border-collapse text-[11.5px]">
                  <thead className="sticky top-0 z-10 bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <ColTh sticky frozen={frozen.vehicleType}>
                        Vehicle Type
                        <ColumnFilter
                          columnKey="vehicleType"
                          values={colValuesInvoice("vehicleType")}
                          selected={filters.vehicleType}
                          onApply={(v) => setFilters((p) => ({ ...p, vehicleType: v }))}
                          onReset={() => setFilters((p) => ({ ...p, vehicleType: new Set() }))}
                          frozen={frozen.vehicleType}
                          onToggleFreeze={() => setFrozen((p) => ({ ...p, vehicleType: !p.vehicleType }))}
                          active={filters.vehicleType.size > 0}
                        />
                      </ColTh>
                      <ColTh>
                        Vendor
                        <ColumnFilter
                          columnKey="vendor"
                          values={colValuesInvoice("vendor")}
                          selected={filters.vendor}
                          onApply={(v) => setFilters((p) => ({ ...p, vendor: v }))}
                          onReset={() => setFilters((p) => ({ ...p, vendor: new Set() }))}
                          frozen={frozen.vendor}
                          onToggleFreeze={() => setFrozen((p) => ({ ...p, vendor: !p.vendor }))}
                          active={filters.vendor.size > 0}
                        />
                      </ColTh>
                      <ColTh right>Expected Qty</ColTh>
                      <ColTh right>Paid Qty</ColTh>
                      <ColTh right>Diff Qty</ColTh>
                      <ColTh right>Expected Revenue</ColTh>
                      <ColTh right>Paid Revenue</ColTh>
                      <ColTh right>Revenue Diff</ColTh>
                      <ColTh>
                        Invoice Status
                        <ColumnFilter
                          columnKey="status"
                          values={colValuesInvoice("status")}
                          selected={filters.status}
                          onApply={(v) => setFilters((p) => ({ ...p, status: v }))}
                          onReset={() => setFilters((p) => ({ ...p, status: new Set() }))}
                          frozen={frozen.status}
                          onToggleFreeze={() => setFrozen((p) => ({ ...p, status: !p.status }))}
                          active={filters.status.size > 0}
                        />
                      </ColTh>
                      <ColTh>Dispute Status</ColTh>
                      <ColTh>Validation Notes</ColTh>
                      <ColTh>Override Notes</ColTh>
                      <ColTh>Approval Status</ColTh>
                      <ColTh>Approver Notes</ColTh>
                      <ColTh>Action</ColTh>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceVisible.map((r) => {
                      const exp = r.expectedQty * r.rate;
                      const paid = r.paidQty * r.rate;
                      const diff = exp - paid;
                      return (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="sticky left-0 z-[1] bg-card px-3 py-2 font-semibold">{r.vehicleType}</td>
                          <td className="px-3 py-2">{r.vendor}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.expectedQty}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.paidQty}</td>
                          <td
                            className={cn(
                              "px-3 py-2 text-right font-semibold tabular-nums",
                              r.expectedQty - r.paidQty > 0 && "text-destructive",
                              r.expectedQty - r.paidQty < 0 && "text-warning"
                            )}
                          >
                            {r.expectedQty - r.paidQty}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmt$(exp)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmt$(paid)}</td>
                          <td
                            className={cn(
                              "px-3 py-2 text-right font-semibold tabular-nums",
                              diff > 0 && "text-destructive",
                              diff < 0 && "text-warning"
                            )}
                          >
                            {fmt$(diff)}
                          </td>
                          <td className="px-3 py-2">
                            <Chip className={invStatusStyle[r.status]}>{r.status}</Chip>
                          </td>
                          <td className="px-3 py-2">
                            <Chip className={disputeStyle[r.disputeStatus]}>{r.disputeStatus}</Chip>
                          </td>
                          <td className="px-3 py-2">
                            <EditableNotesCell
                              value={r.validationNotes}
                              editing={editMode && !readOnly}
                              onChange={(v) => updateInvoice(r.id, { validationNotes: v })}
                              placeholder="Add validation note"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <EditableNotesCell
                              value={r.overrideNotes}
                              editing={editMode && !readOnly}
                              onChange={(v) => updateInvoice(r.id, { overrideNotes: v })}
                              placeholder="No override"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <ApprovalStatusChip status={r.approvalStatus ?? "Pending"} />
                          </td>
                          <td className="px-3 py-2">
                            <EditableNotesCell
                              value={r.approverNotes}
                              editing={editMode && !readOnly && r.approvalStatus === "Rejected"}
                              onChange={(v) => updateInvoice(r.id, { approverNotes: v })}
                              placeholder={r.approvalStatus === "Rejected" ? "Required on reject" : "—"}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <OverrideButton
                              disabled={readOnly}
                              onClick={() => {
                                setEditMode(true);
                                updateInvoice(r.id, { overrideNotes: r.overrideNotes ?? "" });
                                toast.info(`Override mode enabled for ${r.id}`);
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
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
        module="fleet"
        validationType="Fleet Revenue"
        jobIdPrefix="FL-REV"
        onCreate={handleCreateJob}
      />
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
    </AppLayout>
  );
}

/* ──────────────── Small primitives ──────────────── */

function Th({
  children,
  sticky,
  right,
  colSpan,
}: {
  children: React.ReactNode;
  sticky?: boolean;
  right?: boolean;
  colSpan?: number;
}) {
  return (
    <th
      colSpan={colSpan}
      className={cn(
        "border-b bg-muted/60 px-3 py-2 text-left font-bold",
        right && "text-right",
        sticky && "sticky left-0 z-[2] bg-muted/80"
      )}
    >
      {children}
    </th>
  );
}

function ColTh({
  children,
  sticky,
  frozen,
  right,
}: {
  children: React.ReactNode;
  sticky?: boolean;
  frozen?: boolean;
  right?: boolean;
}) {
  return (
    <th
      className={cn(
        "border-b bg-muted/60 px-3 py-2 text-left font-bold whitespace-nowrap",
        right && "text-right",
        sticky && "sticky left-0 z-[2] bg-muted/80",
        frozen && "border-r border-primary/30"
      )}
    >
      <span className="inline-flex items-center gap-1">{children}</span>
    </th>
  );
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}
