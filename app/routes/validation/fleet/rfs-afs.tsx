import { useEffect, useMemo, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { VendorDisputeChip } from "@/components/validation/StatusCells";
import type { VendorDisputeStatus, JobDraft } from "@/components/validation/shared";
import { JobSelector } from "@/components/validation/JobSelector";
import { CreateJobDialog } from "@/components/validation/CreateJobDialog";
import { useModuleJobs, type ModuleJob } from "@/hooks/useModuleJobs";
import { Link } from "react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  FileWarning,
  Repeat,
  Send,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ColumnFilter } from "@/components/validation/ColumnFilter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { rfsOverrideSchema, type RfsOverrideValues } from "@/schemas/fleet";
import { apiError } from "@/services/client";
import { useCreateJob, useDeleteJob, useJobRows } from "@/hooks/useJobs";

/* ──────────────────────────────  Types  ────────────────────────────── */

type OpStatus = "Operational" | "Grounded" | "Inactive";
type VehicleType = "Amazon Branded" | "Vendor Branded" | "Rental";
type OwnershipType = "Owned" | "Rented" | "Leased";
type ServiceType =
  | "Standard Parcel - L"
  | "Standard Parcel - M"
  | "Standard Parcel - XL"
  | "Multi-Use Vehicle"
  | "Cargo Van";
type AfsStatus = "Eligible" | "Not Eligible";
type DisputeStatus = "Need Dispute" | "Disputed" | "Rejected" | "Re-Dispute" | "—";
type ApprovalStatus = "Pending" | "Approved" | "Rejected";

interface VehicleRow {
  id: string;
  serviceType: ServiceType;
  vin: string;
  vehicleName: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  state: string;
  registrationExpiry: string;
  ownershipStart: string;
  ownershipEnd: string;
  opStatus: OpStatus;
  opStatusDate: string;
  vendor: string;
  vehicleType: VehicleType;
  ownership: OwnershipType;
  afsStatus: AfsStatus;
  disputeStatus: DisputeStatus;
  disputeNotes: string;
  approvalStatus: ApprovalStatus;
  approvalComments: string;
}

interface SummaryGroup {
  serviceType: ServiceType;
  vendor: string;
  ownership: OwnershipType;
  rfs: { amazon: number; rental: number; nonAmazon: number };
  afs: { amazon: number; rental: number; nonAmazon: number };
  disputed: { amazon: number; rental: number; nonAmazon: number };
}

/* ──────────────────────────────  API row mapping  ──────────────────── */

interface ApiRow {
  id: string;
  date?: string | null;
  data: string;
  validationNotes?: string | null;
  overrideNotes?: string | null;
  approverNotes?: string | null;
  approvalStatus?: string | null;
  disputeStatus?: string | null;
  disputeNotes?: string | null;
}

const OP_STATUSES: OpStatus[] = ["Operational", "Grounded", "Inactive"];
const VEHICLE_TYPES: VehicleType[] = ["Amazon Branded", "Vendor Branded", "Rental"];
const OWNERSHIP_TYPES: OwnershipType[] = ["Owned", "Rented", "Leased"];
const SERVICE_TYPES: ServiceType[] = [
  "Standard Parcel - L",
  "Standard Parcel - M",
  "Standard Parcel - XL",
  "Multi-Use Vehicle",
  "Cargo Van",
];

const matchEnum = <T extends string>(list: T[], v: unknown, fallback: T): T => {
  const s = String(v ?? "").trim().toLowerCase();
  return list.find((o) => o.toLowerCase() === s) ?? fallback;
};

const toAfsStatus = (v: unknown): AfsStatus =>
  String(v ?? "").trim().toLowerCase() === "eligible" ? "Eligible" : "Not Eligible";

const toDisputeStatus = (v: unknown): DisputeStatus =>
  String(v ?? "").toUpperCase() === "NEED_DISPUTE" ? "Need Dispute" : "—";

const toApprovalStatus = (v: unknown): ApprovalStatus => {
  const s = String(v ?? "").toUpperCase();
  return s === "APPROVED" ? "Approved" : s === "REJECTED" ? "Rejected" : "Pending";
};

/** Map an API ValidationRow → the page's VehicleRow shape.
 * SOURCE columns are keyed by master label; derived fields are camelCase. */
function mapApiRow(r: ApiRow): VehicleRow {
  let d: Record<string, unknown> = {};
  try {
    d = JSON.parse(r.data) as Record<string, unknown>;
  } catch {
    d = {};
  }
  const vin = String(d["VIN"] ?? "—");
  return {
    id: r.id,
    serviceType: matchEnum(SERVICE_TYPES, d["Service Type"] ?? d["Vehicle Type"], "Standard Parcel - M"),
    vin,
    vehicleName: String(d["Vehicle"] ?? d["Vehicle Name"] ?? vin),
    licensePlate: String(d["License Plate"] ?? "—"),
    make: String(d["Make"] ?? "—"),
    model: String(d["Model"] ?? "—"),
    year: Number(d["Year"]) || 0,
    state: String(d["State"] ?? "—"),
    registrationExpiry: String(d["Registration Expiry"] ?? "—"),
    ownershipStart: String(d["Ownership Start"] ?? "—"),
    ownershipEnd: String(d["Ownership End"] ?? "—"),
    opStatus: matchEnum(OP_STATUSES, d["Op Status"], "Operational"),
    opStatusDate: String(d["Op Status Date"] ?? r.date ?? "—"),
    vendor: String(d["Vendor"] ?? "—"),
    vehicleType: matchEnum(VEHICLE_TYPES, d["Vehicle Type"], "Vendor Branded"),
    ownership: matchEnum(OWNERSHIP_TYPES, d["Ownership"], "Owned"),
    afsStatus: toAfsStatus(d["AFS Status"]),
    disputeStatus: toDisputeStatus(r.disputeStatus),
    disputeNotes: String(r.disputeNotes ?? r.validationNotes ?? ""),
    approvalStatus: toApprovalStatus(r.approvalStatus),
    approvalComments: String(r.approverNotes ?? r.overrideNotes ?? ""),
  };
}

/** Aggregate vehicle rows into RFS/AFS summary groups. */
function buildSummary(rows: VehicleRow[]): SummaryGroup[] {
  const bucketOf = (t: VehicleType): "amazon" | "rental" | "nonAmazon" =>
    t === "Amazon Branded" ? "amazon" : t === "Rental" ? "rental" : "nonAmazon";
  const map = new Map<string, SummaryGroup>();
  for (const r of rows) {
    const key = `${r.serviceType}|${r.vendor}|${r.ownership}`;
    let g = map.get(key);
    if (!g) {
      g = {
        serviceType: r.serviceType,
        vendor: r.vendor,
        ownership: r.ownership,
        rfs: { amazon: 0, rental: 0, nonAmazon: 0 },
        afs: { amazon: 0, rental: 0, nonAmazon: 0 },
        disputed: { amazon: 0, rental: 0, nonAmazon: 0 },
      };
      map.set(key, g);
    }
    const b = bucketOf(r.vehicleType);
    g.rfs[b] += 1;
    if (r.afsStatus === "Eligible") g.afs[b] += 1;
    if (r.disputeStatus === "Need Dispute") g.disputed[b] += 1;
  }
  return Array.from(map.values());
}

/* ──────────────────────────────  Style helpers  ────────────────────── */

const opStatusChip: Record<OpStatus, string> = {
  Operational: "bg-success/10 text-success border-success/25",
  Grounded: "bg-destructive/10 text-destructive border-destructive/25",
  Inactive: "bg-muted text-muted-foreground border-border",
};

const afsChip: Record<AfsStatus, string> = {
  Eligible: "bg-success/10 text-success border-success/25",
  "Not Eligible": "bg-destructive/10 text-destructive border-destructive/25",
};

const disputeChip: Record<DisputeStatus, string> = {
  "Need Dispute": "bg-warning/10 text-warning border-warning/30",
  Disputed: "bg-accent/10 text-accent border-accent/25",
  Rejected: "bg-destructive/10 text-destructive border-destructive/25",
  "Re-Dispute": "bg-secondary/15 text-secondary border-secondary/25",
  "—": "bg-muted text-muted-foreground border-border",
};

const approvalChip: Record<ApprovalStatus, string> = {
  Approved: "bg-success/10 text-success border-success/25",
  Rejected: "bg-destructive/10 text-destructive border-destructive/25",
  Pending: "bg-warning/10 text-warning border-warning/30",
};

const vehicleTypeChip: Record<VehicleType, string> = {
  "Amazon Branded": "bg-primary/10 text-primary border-primary/25",
  "Vendor Branded": "bg-accent/10 text-accent border-accent/25",
  Rental: "bg-secondary/15 text-secondary border-secondary/25",
};

/* ──────────────────────────────  Page  ─────────────────────────────── */

export default function RfsVsAfsValidation() {
  const [tab, setTab] = useState<"summary" | "info">("summary");
  const { jobs, selectedJobId, setSelectedJobId, readOnly, loading } =
    useModuleJobs("RFS_AFS");
  const [summaryDrawer, setSummaryDrawer] = useState<SummaryGroup | null>(null);
  const [vehicleDrawer, setVehicleDrawer] = useState<VehicleRow | null>(null);
  const [overrideRow, setOverrideRow] = useState<VehicleRow | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const rowsQuery = useJobRows(selectedJobId || undefined, "rfs_afs");
  const createJob = useCreateJob();
  const removeJob = useDeleteJob();
  // ponytail: local copy of the query data so override edits stay optimistic (as before).
  const [rows, setRows] = useState<VehicleRow[]>([]);

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

  useEffect(() => {
    setRows(selectedJobId && rowsQuery.data ? rowsQuery.data.map(mapApiRow) : []);
  }, [selectedJobId, rowsQuery.data]);

  const summary = useMemo(() => buildSummary(rows), [rows]);

  async function handleCreateJob(job: JobDraft) {
    try {
      await createJob.mutateAsync({
        module: "RFS_AFS",
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

  const attention = rows.filter(
    (r) => r.disputeStatus === "Need Dispute" || r.opStatus === "Grounded"
  ).length;

  function handleOverrideSave(updated: VehicleRow) {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setOverrideRow(null);
    toast.success(`Override applied to ${updated.vehicleName}`);
  }

  return (
    <AppLayout
      title="RFS vs AFS Validation"
      subtitle="Validation → Fleets → RFS vs AFS Validation"
      showAlert={false}
    >
      <div className="flex h-[calc(100vh-72px)] flex-col gap-3 pb-2">
        {/* Sticky module top bar: back link + module name + job selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card/40 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Link
              to="/validation"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              ← Back
            </Link>
            <span className="text-sm font-bold tracking-tight">RFS vs AFS Validation</span>
          </div>
          <div className="flex items-center gap-2">
            <JobSelector
              jobs={jobs as unknown as ModuleJob[]}
              selectedJobId={selectedJobId}
              onSelect={setSelectedJobId}
              onCreateJob={() => setCreateOpen(true)}
              onDeleteJob={() => setDeleteConfirmOpen(true)}
              loading={loading}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 text-xs"
              onClick={() => toast.success("Export started")}
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 text-xs"
              onClick={() => setShowLogs(true)}
            >
              <FileText className="h-3.5 w-3.5" /> View Logs
            </Button>
          </div>
        </div>

        {/* Title + tabs */}
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">RFS vs AFS Validation</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Validate RFS vehicles, AFS eligibility, and fleet dispute requirements
            </p>
          </div>

          {/* Aeon-style tabs */}
          <div className="flex border-b">
            {(
              [
                { key: "summary", label: "RFS vs AFS Dispute Summary" },
                { key: "info", label: "RFS & AFS Info" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative -mb-px border-b-2 px-4 py-2 text-xs font-semibold transition-colors",
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="aeon-card flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-auto">
            {!selectedJobId ? (
              <div className="flex h-full items-center justify-center px-3 py-16 text-center text-xs text-muted-foreground">
                Select a job above or create a new one to begin
              </div>
            ) : rows.length === 0 ? (
              <div className="flex h-full items-center justify-center px-3 py-16 text-center text-xs text-muted-foreground">
                No rows yet — upload the Vehicle Roster and AFS Eligibility Report to begin validation
              </div>
            ) : tab === "summary" ? (
              <SummaryTable rows={summary} onRowClick={setSummaryDrawer} />
            ) : (
              <VehicleTable
                rows={rows}
                onRowClick={setVehicleDrawer}
                onOverride={setOverrideRow}
                readOnly={readOnly}
              />
            )}
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-card/95 px-4 py-2 backdrop-blur">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                attention === 0
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  attention === 0 ? "bg-success" : "bg-destructive"
                )}
              />
              {attention === 0
                ? "All vehicles validated"
                : `${attention} vehicle${attention > 1 ? "s" : ""} need attention`}
            </span>

            <Button
              onClick={() => toast.success("Submitted for manager approval")}
              disabled={attention > 0 || readOnly}
              className="h-8 gap-1.5 rounded-lg bg-gradient-brand text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" /> Submit for Approval
            </Button>
          </div>
        </div>
      </div>

      {/* Summary drawer */}
      <SummaryDrawer group={summaryDrawer} onClose={() => setSummaryDrawer(null)} />

      {/* Vehicle drawer */}
      <VehicleDrawer vehicle={vehicleDrawer} onClose={() => setVehicleDrawer(null)} />

      {/* Override modal */}
      <OverrideDialog
        vehicle={overrideRow}
        onClose={() => setOverrideRow(null)}
        onSave={handleOverrideSave}
      />

      {/* Logs sheet */}
      <Sheet open={showLogs} onOpenChange={setShowLogs}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Validation Logs</SheetTitle>
            <SheetDescription>Audit trail for fleet eligibility validation</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2 text-xs">
            {[
              ["Marcus J.", "Override AFS Status on V-1002 → Not Eligible", "Today 11:14"],
              ["Sofia P.", "Dispute filed for V-1006 (Inactive vehicle)", "Today 10:48"],
              ["System", "Auto-flagged V-1004 → Grounded needs manual validation", "Today 09:30"],
              ["Aisha B.", "Approved V-1007 (Standard Parcel - XL)", "Yesterday 16:55"],
              ["System", "Re-Dispute opened on V-1008 after Amazon rejection", "Yesterday 14:12"],
            ].map(([who, what, when], i) => (
              <div key={i} className="aeon-soft p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{who}</span>
                  <span className="text-[10.5px] text-muted-foreground">{when}</span>
                </div>
                <div className="mt-0.5 text-muted-foreground">{what}</div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <CreateJobDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        module="fleet"
        validationType="RFS vs AFS"
        jobIdPrefix="FA"
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

/* ──────────────────────────────  Summary table  ────────────────────── */

function SubHeaderCells({ group }: { group: "RFS" | "AFS" | "DSP" }) {
  return (
    <>
      <th className="h-9 whitespace-nowrap border-b px-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Amazon
      </th>
      <th className="h-9 whitespace-nowrap border-b px-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Rental
      </th>
      <th
        className="h-9 whitespace-nowrap border-b border-r px-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
      >
        Non-Amazon
      </th>
    </>
  );
}

function SummaryTable({
  rows,
  onRowClick,
}: {
  rows: SummaryGroup[];
  onRowClick: (g: SummaryGroup) => void;
}) {
  const totals = useMemo(() => {
    const t = {
      rfs: { amazon: 0, rental: 0, nonAmazon: 0 },
      afs: { amazon: 0, rental: 0, nonAmazon: 0 },
      disputed: { amazon: 0, rental: 0, nonAmazon: 0 },
    };
    rows.forEach((r) => {
      (["amazon", "rental", "nonAmazon"] as const).forEach((k) => {
        t.rfs[k] += r.rfs[k];
        t.afs[k] += r.afs[k];
        t.disputed[k] += r.disputed[k];
      });
    });
    return t;
  }, [rows]);

  const sum = (o: { amazon: number; rental: number; nonAmazon: number }) =>
    o.amazon + o.rental + o.nonAmazon;

  interface Acceptance {
    status: VendorDisputeStatus;
    accepted: number;
  }
  const [acceptance, setAcceptance] = useState<Record<string, Acceptance>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Acceptance | null>(null);
  const rowKey = (r: SummaryGroup) => `${r.serviceType}|${r.vendor}|${r.ownership}`;
  const resolve = (r: SummaryGroup): Acceptance =>
    acceptance[rowKey(r)] ?? { status: "Yet to Dispute", accepted: 0 };

  const ACCEPTANCE_STATUSES: VendorDisputeStatus[] = [
    "Yet to Dispute",
    "Submitted",
    "Under Review",
    "Accepted",
    "Partially Accepted",
    "Rejected",
  ];

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
          <tr>
            <th rowSpan={2} className="h-9 whitespace-nowrap border-b border-r px-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Service Type
            </th>
            <th rowSpan={2} className="h-9 whitespace-nowrap border-b border-r px-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Vendor
            </th>
            <th rowSpan={2} className="h-9 whitespace-nowrap border-b border-r px-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Ownership
            </th>
            <th colSpan={3} className="border-b border-r bg-primary/5 px-3 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-primary">
              RFS Count
            </th>
            <th colSpan={3} className="border-b border-r bg-secondary/10 px-3 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-secondary">
              AFS Count
            </th>
            <th colSpan={3} className="border-b border-r bg-destructive/5 px-3 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-destructive">
              Disputed Count
            </th>
            <th rowSpan={2} className="h-9 whitespace-nowrap border-b border-r px-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Dispute Status
            </th>
            <th rowSpan={2} className="h-9 whitespace-nowrap border-b border-r px-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Accepted
            </th>
            <th rowSpan={2} className="h-9 whitespace-nowrap border-b border-r px-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Rejected
            </th>
            <th rowSpan={2} className="h-9 whitespace-nowrap border-b px-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Action
            </th>
          </tr>
          <tr>
            {(["RFS", "AFS", "DSP"] as const).map((g) => (
              <SubHeaderCells key={g} group={g} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const key = rowKey(r);
            const cur = resolve(r);
            const editing = editingId === key;
            const disputedTotal = sum(r.disputed);
            const acceptedShown =
              cur.status === "Accepted" || cur.status === "Partially Accepted" ? cur.accepted : 0;
            const rejectedShown =
              cur.status === "Rejected"
                ? disputedTotal
                : cur.status === "Partially Accepted"
                  ? Math.max(0, disputedTotal - cur.accepted)
                  : 0;
            return (
              <tr
                key={key}
                onClick={() => onRowClick(r)}
                className={cn(
                  "cursor-pointer border-b transition-colors hover:bg-primary/5",
                  i % 2 === 1 && "bg-muted/20"
                )}
              >
                <td className="h-10 whitespace-nowrap border-r px-3 align-middle font-medium">
                  {r.serviceType}
                </td>
                <td className="h-10 whitespace-nowrap border-r px-3 align-middle text-muted-foreground">
                  {r.vendor}
                </td>
                <td className="h-10 whitespace-nowrap border-r px-3 align-middle text-muted-foreground">
                  {r.ownership}
                </td>
                <td className="h-10 whitespace-nowrap px-3 text-right tabular-nums">{r.rfs.amazon || "—"}</td>
                <td className="h-10 whitespace-nowrap px-3 text-right tabular-nums">{r.rfs.rental || "—"}</td>
                <td className="h-10 whitespace-nowrap border-r px-3 text-right tabular-nums">{r.rfs.nonAmazon || "—"}</td>
                <td className="h-10 whitespace-nowrap px-3 text-right tabular-nums">{r.afs.amazon || "—"}</td>
                <td className="h-10 whitespace-nowrap px-3 text-right tabular-nums">{r.afs.rental || "—"}</td>
                <td className="h-10 whitespace-nowrap border-r px-3 text-right tabular-nums">{r.afs.nonAmazon || "—"}</td>
                <td className={cn("h-10 whitespace-nowrap px-3 text-right font-semibold tabular-nums", r.disputed.amazon > 0 && "text-destructive")}>
                  {r.disputed.amazon || "—"}
                </td>
                <td className={cn("h-10 whitespace-nowrap px-3 text-right font-semibold tabular-nums", r.disputed.rental > 0 && "text-destructive")}>
                  {r.disputed.rental || "—"}
                </td>
                <td className={cn("h-10 whitespace-nowrap border-r px-3 text-right font-semibold tabular-nums", r.disputed.nonAmazon > 0 && "text-destructive")}>
                  {r.disputed.nonAmazon || "—"}
                </td>
                <td className="h-10 whitespace-nowrap border-r px-3" onClick={(e) => e.stopPropagation()}>
                  {editing && draft ? (
                    <Select
                      value={draft.status}
                      onValueChange={(v) => setDraft({ ...draft, status: v as VendorDisputeStatus })}
                    >
                      <SelectTrigger className="h-7 w-[160px] text-[11.5px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCEPTANCE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-[11.5px]">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <VendorDisputeChip status={cur.status} />
                  )}
                </td>
                <td className="h-10 whitespace-nowrap border-r px-3 text-right tabular-nums text-success" onClick={(e) => e.stopPropagation()}>
                  {editing && draft && (draft.status === "Accepted" || draft.status === "Partially Accepted") ? (
                    <input
                      type="number"
                      min={0}
                      max={disputedTotal}
                      value={draft.accepted}
                      onChange={(e) => setDraft({ ...draft, accepted: Number(e.target.value) })}
                      className="h-7 w-[80px] rounded border bg-background px-1.5 text-right text-[11.5px] focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    acceptedShown || "—"
                  )}
                </td>
                <td className="h-10 whitespace-nowrap border-r px-3 text-right tabular-nums text-destructive">
                  {rejectedShown || "—"}
                </td>
                <td className="h-10 whitespace-nowrap px-3" onClick={(e) => e.stopPropagation()}>
                  {editing ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={() => {
                          if (!draft) return;
                          const accepted = Math.max(0, Math.min(draft.accepted || 0, disputedTotal));
                          setAcceptance((p) => ({ ...p, [key]: { ...draft, accepted } }));
                          setEditingId(null);
                          setDraft(null);
                          toast.success(`Acceptance updated for ${r.serviceType} · ${r.vendor}`);
                        }}
                      >
                        <Check className="h-3 w-3" /> Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={() => {
                          setEditingId(null);
                          setDraft(null);
                        }}
                      >
                        <X className="h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 px-2 text-[11px]"
                      disabled={disputedTotal === 0}
                      onClick={() => {
                        setEditingId(key);
                        setDraft(resolve(r));
                      }}
                    >
                      <Pencil className="h-3 w-3" /> Update Acceptance
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="sticky bottom-0 bg-muted/60 backdrop-blur">
          <tr className="font-bold">
            <td colSpan={3} className="h-10 border-t border-r px-3 text-right text-[11px] uppercase tracking-wider">
              Totals · {sum(totals.rfs)} RFS / {sum(totals.afs)} AFS / {sum(totals.disputed)} Disputed
            </td>
            <td className="h-10 border-t px-3 text-right tabular-nums">{totals.rfs.amazon}</td>
            <td className="h-10 border-t px-3 text-right tabular-nums">{totals.rfs.rental}</td>
            <td className="h-10 border-t border-r px-3 text-right tabular-nums">{totals.rfs.nonAmazon}</td>
            <td className="h-10 border-t px-3 text-right tabular-nums">{totals.afs.amazon}</td>
            <td className="h-10 border-t px-3 text-right tabular-nums">{totals.afs.rental}</td>
            <td className="h-10 border-t border-r px-3 text-right tabular-nums">{totals.afs.nonAmazon}</td>
            <td className="h-10 border-t px-3 text-right tabular-nums text-destructive">{totals.disputed.amazon}</td>
            <td className="h-10 border-t px-3 text-right tabular-nums text-destructive">{totals.disputed.rental}</td>
            <td className="h-10 border-t border-r px-3 text-right tabular-nums text-destructive">{totals.disputed.nonAmazon}</td>
            <td colSpan={4} className="h-10 border-t px-3" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ──────────────────────────────  Vehicle table  ────────────────────── */

interface VColDef {
  key: keyof VehicleRow | "override";
  label: string;
  width?: string;
  align?: "left" | "right" | "center";
  filterable?: boolean;
  freezable?: boolean;
  render: (r: VehicleRow) => React.ReactNode;
}

function VehicleTable({
  rows,
  onRowClick,
  onOverride,
  readOnly,
}: {
  rows: VehicleRow[];
  onRowClick: (r: VehicleRow) => void;
  onOverride: (r: VehicleRow) => void;
  readOnly?: boolean;
}) {
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [frozen, setFrozen] = useState<Record<string, boolean>>({ vin: true });

  const cols: VColDef[] = [
    { key: "serviceType", label: "Service Type", filterable: true, width: "180px", render: (r) => <span className="font-medium">{r.serviceType}</span> },
    { key: "vin", label: "VIN", filterable: true, width: "180px", render: (r) => <span className="font-mono text-[11.5px]">{r.vin}</span> },
    { key: "vehicleName", label: "Vehicle", filterable: true, width: "120px", render: (r) => <span className="font-semibold">{r.vehicleName}</span> },
    {
      key: "opStatus",
      label: "Op Status",
      filterable: true,
      width: "130px",
      render: (r) => (
        <span className={cn("aeon-stat-pill border", opStatusChip[r.opStatus])}>{r.opStatus}</span>
      ),
    },
    { key: "opStatusDate", label: "Op Status Date", filterable: true, width: "130px", render: (r) => <span className="text-muted-foreground">{r.opStatusDate}</span> },
    { key: "vendor", label: "Vendor", filterable: true, width: "140px", render: (r) => r.vendor },
    {
      key: "vehicleType",
      label: "Vehicle Type",
      filterable: true,
      width: "150px",
      render: (r) => (
        <span className={cn("aeon-stat-pill border", vehicleTypeChip[r.vehicleType])}>{r.vehicleType}</span>
      ),
    },
    { key: "ownership", label: "Ownership", filterable: true, width: "110px", render: (r) => r.ownership },
    {
      key: "afsStatus",
      label: "AFS Status",
      filterable: true,
      width: "150px",
      render: (r) => (
        <label className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={r.afsStatus === "Eligible"} disabled />
          <span className={cn("aeon-stat-pill border", afsChip[r.afsStatus])}>{r.afsStatus}</span>
        </label>
      ),
    },
    {
      key: "disputeStatus",
      label: "Dispute Status",
      filterable: true,
      width: "140px",
      render: (r) => (
        <span className={cn("aeon-stat-pill border", disputeChip[r.disputeStatus])}>
          {r.disputeStatus === "—" ? "None" : r.disputeStatus}
        </span>
      ),
    },
    {
      key: "disputeNotes",
      label: "Dispute Notes",
      render: (r) => (
        <span className="block max-w-[260px] truncate text-xs text-muted-foreground" title={r.disputeNotes}>
          {r.disputeNotes || "—"}
        </span>
      ),
    },
    {
      key: "approvalStatus",
      label: "Approval",
      filterable: true,
      width: "120px",
      render: (r) => (
        <span className={cn("aeon-stat-pill border", approvalChip[r.approvalStatus])}>{r.approvalStatus}</span>
      ),
    },
    {
      key: "approvalComments",
      label: "Approval Notes",
      render: (r) => (
        <span className="block max-w-[200px] truncate text-xs text-muted-foreground" title={r.approvalComments}>
          {r.approvalComments || "—"}
        </span>
      ),
    },
    {
      key: "override",
      label: "Action",
      width: "100px",
      align: "center",
      render: (r) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-[11px]"
          disabled={readOnly}
          onClick={(e) => {
            e.stopPropagation();
            onOverride(r);
          }}
        >
          <Repeat className="h-3 w-3" /> Override
        </Button>
      ),
    },
  ];

  const visible = useMemo(
    () =>
      rows.filter((r) =>
        cols.every((c) => {
          if (c.key === "override") return true;
          const sel = filters[c.key];
          if (!sel || sel.size === 0) return true;
          return sel.has(String((r as never)[c.key] ?? ""));
        })
      ),
    [rows, filters]
  );

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
          <tr>
            {cols.map((c) => {
              const active = !!filters[c.key] && filters[c.key].size > 0;
              const isFrozen = !!frozen[c.key];
              return (
                <th
                  key={c.key}
                  className={cn(
                    "h-9 whitespace-nowrap border-b px-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    isFrozen && "sticky left-0 z-20 bg-muted/80 shadow-[2px_0_0_hsl(var(--border))]"
                  )}
                  style={c.width ? { width: c.width } : undefined}
                >
                  <span className="inline-flex items-center">
                    {c.label}
                    {c.filterable && c.key !== "override" && (
                      <ColumnFilter
                        columnKey={c.key as string}
                        values={rows.map((r) => String((r as never)[c.key] ?? ""))}
                        selected={filters[c.key] ?? new Set()}
                        onApply={(s) => setFilters((p) => ({ ...p, [c.key]: s }))}
                        onReset={() =>
                          setFilters((p) => {
                            const n = { ...p };
                            delete n[c.key as string];
                            return n;
                          })
                        }
                        frozen={isFrozen}
                        onToggleFreeze={() =>
                          setFrozen((p) => ({ ...p, [c.key]: !p[c.key as string] }))
                        }
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
          {visible.length === 0 && (
            <tr>
              <td colSpan={cols.length} className="px-3 py-10 text-center text-xs text-muted-foreground">
                No vehicles match these filters
              </td>
            </tr>
          )}
          {visible.map((r, i) => {
            const needsAttn =
              r.opStatus === "Grounded" ||
              (r.opStatus === "Operational" && r.afsStatus === "Not Eligible");
            return (
              <tr
                key={r.id}
                onClick={() => onRowClick(r)}
                className={cn(
                  "cursor-pointer border-b transition-colors hover:bg-primary/5",
                  i % 2 === 1 && "bg-muted/20",
                  needsAttn && "border-l-2 border-l-destructive bg-destructive/5"
                )}
              >
                {cols.map((c) => {
                  const isFrozen = !!frozen[c.key];
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        "h-10 whitespace-nowrap px-3 align-middle",
                        c.align === "right" && "text-right tabular-nums",
                        c.align === "center" && "text-center",
                        isFrozen && "sticky left-0 z-10 bg-card shadow-[2px_0_0_hsl(var(--border))]"
                      )}
                    >
                      {c.render(r)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="sticky bottom-0 flex items-center justify-between border-t bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>
          Showing <b className="text-foreground">{visible.length}</b> of {rows.length} vehicles
        </span>
        <span className="inline-flex items-center gap-1">
          <ClipboardList className="h-3 w-3" /> Sticky headers · frozen VIN · column filters
        </span>
      </div>
    </div>
  );
}

/* ──────────────────────────────  Summary drawer  ───────────────────── */

function SummaryDrawer({
  group,
  onClose,
}: {
  group: SummaryGroup | null;
  onClose: () => void;
}) {
  if (!group) return null;
  return (
    <Sheet open={!!group} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{group.serviceType}</SheetTitle>
          <SheetDescription>
            {group.vendor} · {group.ownership}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <Section title="Summary Breakdown">
            <Tri label="RFS Count" o={group.rfs} tone="primary" />
            <Tri label="AFS Count" o={group.afs} tone="accent" />
            <Tri label="Disputed Count" o={group.disputed} tone="danger" />
          </Section>

          <Section title="Validation Notes">
            <div className="aeon-soft space-y-2 p-3 text-xs">
              <p className="text-muted-foreground">
                Compare RFS eligible vehicles vs AFS authorized vehicles for missing eligibility and
                operational mismatches.
              </p>
              <Textarea
                placeholder="Add operational or manual validation notes…"
                className="min-h-[80px] text-xs"
              />
            </div>
          </Section>

          <Section title="Approval Status">
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-8 flex-1 gap-1.5 bg-success text-success-foreground hover:bg-success/90"
                onClick={() => {
                  toast.success("Group approved");
                  onClose();
                }}
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 flex-1 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => {
                  toast.error("Group rejected");
                  onClose();
                }}
              >
                <X className="h-3.5 w-3.5" /> Reject
              </Button>
            </div>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Tri({
  label,
  o,
  tone,
}: {
  label: string;
  o: { amazon: number; rental: number; nonAmazon: number };
  tone: "primary" | "accent" | "danger";
}) {
  const map = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    danger: "bg-destructive/10 text-destructive",
  } as const;
  return (
    <div className="aeon-soft p-3">
      <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Amazon Branded", o.amazon],
          ["Rental", o.rental],
          ["Non-Amazon", o.nonAmazon],
        ].map(([k, v]) => (
          <div key={k as string} className={cn("rounded-md px-2 py-1.5", map[tone])}>
            <div className="text-[10px] font-semibold uppercase opacity-75">{k}</div>
            <div className="text-lg font-extrabold tabular-nums">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────  Vehicle drawer  ───────────────────── */

function VehicleDrawer({
  vehicle,
  onClose,
}: {
  vehicle: VehicleRow | null;
  onClose: () => void;
}) {
  if (!vehicle) return null;

  return (
    <Sheet open={!!vehicle} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <SheetTitle>{vehicle.vehicleName}</SheetTitle>
            <span className={cn("aeon-stat-pill border", opStatusChip[vehicle.opStatus])}>
              {vehicle.opStatus}
            </span>
          </div>
          <SheetDescription className="font-mono text-[11.5px]">
            VIN {vehicle.vin}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <Section title="Vehicle Details">
            <KV
              items={[
                ["License Plate", vehicle.licensePlate],
                ["Make", vehicle.make],
                ["Model", vehicle.model],
                ["Year", String(vehicle.year)],
                ["Registered State", vehicle.state],
                ["Vehicle Type", vehicle.vehicleType],
              ]}
            />
          </Section>

          <Section title="Registration">
            <KV items={[["Registration Expiry", vehicle.registrationExpiry]]} />
          </Section>

          <Section title="Ownership">
            <KV
              items={[
                ["Ownership Type", vehicle.ownership],
                ["Vendor", vehicle.vendor],
                ["Ownership Start", vehicle.ownershipStart],
                ["Ownership End", vehicle.ownershipEnd],
              ]}
            />
          </Section>

          <Section title="Eligibility & Disputes">
            <div className="aeon-soft space-y-2 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">AFS Status</span>
                <span className={cn("aeon-stat-pill border", afsChip[vehicle.afsStatus])}>
                  {vehicle.afsStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Dispute Status</span>
                <span className={cn("aeon-stat-pill border", disputeChip[vehicle.disputeStatus])}>
                  {vehicle.disputeStatus === "—" ? "None" : vehicle.disputeStatus}
                </span>
              </div>
              {vehicle.disputeNotes && (
                <p className="rounded-md border bg-card p-2 text-muted-foreground">
                  {vehicle.disputeNotes}
                </p>
              )}
            </div>
          </Section>

          <Section title="Operational History">
            <ol className="relative ml-2 space-y-3 border-l pl-4 text-xs">
              {[
                { label: `${vehicle.opStatus} (current)`, date: vehicle.opStatusDate, tone: "primary" },
                { label: "Operational", date: "May 14, 2026", tone: "success" },
                { label: "Override · AFS Status updated", date: "May 02, 2026", tone: "accent" },
                { label: "Registered (RFS)", date: vehicle.ownershipStart, tone: "muted" },
              ].map((e, i) => (
                <li key={i} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                      e.tone === "primary" && "bg-primary",
                      e.tone === "success" && "bg-success",
                      e.tone === "accent" && "bg-accent",
                      e.tone === "muted" && "bg-muted-foreground"
                    )}
                  />
                  <div className="font-semibold">{e.label}</div>
                  <div className="text-[11px] text-muted-foreground">{e.date}</div>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function KV({ items }: { items: [string, string][] }) {
  return (
    <div className="aeon-soft divide-y text-xs">
      {items.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between px-3 py-1.5">
          <span className="text-muted-foreground">{k}</span>
          <span className="font-semibold">{v || "—"}</span>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────  Override dialog  ──────────────────── */

function OverrideDialog({
  vehicle,
  onClose,
  onSave,
}: {
  vehicle: VehicleRow | null;
  onClose: () => void;
  onSave: (v: VehicleRow) => void;
}) {
  const form = useForm<RfsOverrideValues>({
    resolver: zodResolver(rfsOverrideSchema),
    mode: "onChange",
    defaultValues: { type: "AFS Status", afsNew: "Eligible", opNew: "Operational", opDate: "", reason: "" },
  });
  const type = form.watch("type");
  const valid = form.formState.isValid;

  if (!vehicle) return null;

  const handleSave = form.handleSubmit(({ type, afsNew, opNew, opDate }) => {
    if (!vehicle) return;
    const updated: VehicleRow = { ...vehicle };
    if (type === "AFS Status") {
      updated.afsStatus = afsNew;
      updated.disputeStatus =
        afsNew === "Not Eligible" && updated.opStatus === "Operational" ? "Need Dispute" : "—";
      updated.disputeNotes =
        afsNew === "Not Eligible" && updated.opStatus === "Operational"
          ? "Vehicle is Operational and Not Eligible for AFS"
          : "";
    } else {
      updated.opStatus = opNew;
      updated.opStatusDate = opDate;
      if (opNew === "Grounded") {
        updated.disputeStatus = "Need Dispute";
        updated.disputeNotes = "Vehicle is Grounded, needs Manual Validation";
      }
    }
    onSave(updated);
  });

  return (
    <Dialog open={!!vehicle} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Override · {vehicle.vehicleName}</DialogTitle>
          <DialogDescription>
            Changes are logged in the audit trail and update operational records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Override Type</Label>
            <Select value={type} onValueChange={(v) => form.setValue("type", v as typeof type, { shouldValidate: true })}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AFS Status">AFS Status</SelectItem>
                <SelectItem value="Operational Status">Operational Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "AFS Status" ? (
            <div>
              <Label className="text-xs">New AFS Status</Label>
              <Select value={form.watch("afsNew")} onValueChange={(v) => form.setValue("afsNew", v as AfsStatus, { shouldValidate: true })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Eligible">Eligible</SelectItem>
                  <SelectItem value="Not Eligible">Not Eligible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div>
                <Label className="text-xs">New Operational Status</Label>
                <Select value={form.watch("opNew")} onValueChange={(v) => form.setValue("opNew", v as OpStatus, { shouldValidate: true })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operational">Operational</SelectItem>
                    <SelectItem value="Grounded">Grounded</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">
                  Status Change Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  {...form.register("opDate")}
                  className="h-9 text-xs"
                />
              </div>
            </>
          )}

          <div>
            <Label className="text-xs">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              {...form.register("reason")}
              placeholder="Describe the reason for this override…"
              className="min-h-[80px] text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-gradient-brand text-xs text-primary-foreground"
            disabled={!valid}
            onClick={() => void handleSave()}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Apply Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
