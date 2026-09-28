import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FilterX,
  Loader2,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { CardsSkeleton, TableSkeleton } from "@/components/shared/Skeletons";
import { AuditTrail } from "@/components/timecard/AuditTrail";
import { CreateTimecardJobDialog } from "@/components/timecard/CreateTimecardJobDialog";
import { DateApprovalStrip } from "@/components/timecard/DateApprovalStrip";
import { OverrideRowDialog } from "@/components/timecard/OverrideRowDialog";
import { TimecardRowsTable } from "@/components/timecard/TimecardRowsTable";
import { ToneBadge } from "@/components/timecard/ToneBadge";
import { UploadsPanel } from "@/components/timecard/UploadsPanel";
import {
  useLockTimecardJob,
  useTimecardJobs,
  useTimecardPermissions,
  useTimecardRows,
  useTimecardUploads,
} from "@/hooks/useTimecard";
import {
  JOB_STATUS,
  dateKey,
  formatDate,
  formatDateTime,
  isRowResolved,
  periodLabel,
  statusLabel,
  validationBlocker,
} from "@/lib/timecard";
import { apiError } from "@/services/client";
import type { TimecardJob, TimecardRow } from "@/types/timecard";

type Tab = "rows" | "uploads" | "audit";
type StatusFilter = "all" | "open" | "resolved" | (string & {});

/** Default job: newest period that isn't locked, else the newest. */
function defaultJob(jobs: TimecardJob[]) {
  const sorted = [...jobs].sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  return sorted.find((j) => j.status !== "LOCKED") ?? sorted[0];
}

export default function TimecardPage() {
  const perms = useTimecardPermissions();
  const jobsQuery = useTimecardJobs(perms.canViewJobs);
  const [params, setParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  const jobs = useMemo(
    () => [...(jobsQuery.data ?? [])].sort((a, b) => b.periodStart.localeCompare(a.periodStart)),
    [jobsQuery.data]
  );
  const jobParam = params.get("job");
  const paramJob = jobParam ? jobs.find((j) => j.id === jobParam) : undefined;
  const job = paramJob ?? (jobs.length ? defaultJob(jobs) : undefined);
  const staleParam = !!jobParam && jobsQuery.isSuccess && !paramJob;

  // The selected job lives in the URL (?job=) so refresh / share keeps it.
  const selectJob = (id: string) =>
    setParams((p) => {
      p.set("job", id);
      p.delete("date");
      return p;
    });

  const createButton = perms.canCreateJob && (
    <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
      <Plus className="h-4 w-4" /> New job
    </Button>
  );

  let body: React.ReactNode;
  if (!perms.canViewJobs) {
    body = <AccessDenied what="timecard jobs" />;
  } else if (jobsQuery.isPending) {
    body = (
      <div className="space-y-4 p-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <CardsSkeleton />
        <TableSkeleton />
      </div>
    );
  } else if (jobsQuery.isError) {
    body = (
      <ErrorState
        error={jobsQuery.error}
        title="Couldn’t load timecard jobs"
        onRetry={() => jobsQuery.refetch()}
        retrying={jobsQuery.isFetching}
      />
    );
  } else if (!job) {
    body = (
      <EmptyState
        icon={ClipboardList}
        title="No timecard jobs yet"
        description={
          perms.canCreateJob
            ? "Create a job for a pay period, upload the payroll export and Amazon files, then run validation."
            : "An executive needs to create a job for the pay period before timecards can be validated."
        }
        action={createButton}
      />
    );
  } else {
    body = (
      <>
        {staleParam && (
          <p className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs">
            <AlertTriangle className="h-3.5 w-3.5" /> The job in the link wasn’t found — showing {job.jobId} instead.
          </p>
        )}
        {/* key: reset per-job UI state (filters, highlights, tabs) when switching jobs */}
        <JobWorkspace key={job.id} job={job} />
      </>
    );
  }

  return (
    <AppLayout title="Timecard Validation" subtitle="Validation → Payroll → Timecard" showAlert={false}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card/40 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Link
              to="/validation"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              ← Back
            </Link>
            <span className="text-sm font-bold tracking-tight">Timecard Validation</span>
          </div>
          <div className="flex items-center gap-2">
            {jobs.length > 0 && job && (
              <Select value={job.id} onValueChange={selectJob}>
                <SelectTrigger className="h-9 w-[300px] text-xs" aria-label="Select job">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id} className="text-xs">
                      {j.jobId} · {periodLabel(j)} · {JOB_STATUS[j.status]?.label ?? j.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {jobs.length > 0 && createButton}
          </div>
        </div>
        {body}
      </div>
      <CreateTimecardJobDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(j) => selectJob(j.id)} />
    </AppLayout>
  );
}

/* ─────────────────────────  Selected job  ───────────────────────── */

function JobWorkspace({ job }: { job: TimecardJob }) {
  const perms = useTimecardPermissions();
  const [params, setParams] = useSearchParams();
  const rowsQuery = useTimecardRows(job.id, {}, perms.canViewRows);
  const uploadsQuery = useTimecardUploads(job.id, perms.canViewUploads);
  const lock = useLockTimecardJob(job.id);

  const rows = useMemo(() => rowsQuery.data ?? [], [rowsQuery.data]);
  const readOnly = job.status === "LOCKED";

  // Only tabs the role can read; the first one is the default.
  const tabs = ([
    perms.canViewRows && "rows",
    perms.canViewUploads && "uploads",
    perms.canViewAudit && "audit",
  ].filter(Boolean) as Tab[]);
  const [tab, setTab] = useState<Tab>(tabs[0] ?? "rows");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [overriding, setOverriding] = useState<TimecardRow | null>(null);
  const [confirmLock, setConfirmLock] = useState(false);

  // Default to the uploads tab while there is nothing to validate yet.
  useEffect(() => {
    if (rowsQuery.isSuccess && rows.length === 0 && perms.canViewUploads) setTab("uploads");
  }, [rowsQuery.isSuccess, rows.length, perms.canViewUploads]);

  const selectedDate = params.get("date") ?? "";
  const selectDate = (d: string) => {
    setBlocked(new Set());
    setParams((p) => {
      if (d) p.set("date", d);
      else p.delete("date");
      return p;
    }, { replace: true });
  };

  const counts = useMemo(() => {
    const open = rows.filter((r) => !isRowResolved(r)).length;
    return {
      total: rows.length,
      good: rows.filter((r) => r.validationStatus === "GOOD_NO_ERROR").length,
      open,
      overridden: rows.filter((r) => r.overriddenAt).length,
    };
  }, [rows]);

  const statuses = useMemo(() => [...new Set(rows.map((r) => r.validationStatus))].sort(), [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (selectedDate && dateKey(r.date) !== selectedDate) return false;
      if (statusFilter === "open" && isRowResolved(r)) return false;
      if (statusFilter === "resolved" && !isRowResolved(r)) return false;
      if (!["all", "open", "resolved"].includes(statusFilter) && r.validationStatus !== statusFilter) return false;
      if (q && !`${r.rawPayrollName} ${r.rawAmazonName ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, selectedDate, statusFilter, search]);

  const filtersActive = statusFilter !== "all" || search.trim() !== "";
  const clearFilters = () => {
    setStatusFilter("all");
    setSearch("");
  };

  // After a blocked submit, make sure the blocking rows are visible.
  function onBlocked(ids: string[]) {
    setBlocked(new Set(ids));
    if (ids.length) {
      setTab("rows");
      clearFilters();
    }
  }

  async function doLock() {
    try {
      await lock.mutateAsync();
      toast.success(`${job.jobId} locked`);
      setConfirmLock(false);
    } catch (e) {
      toast.error(apiError(e, "Could not lock the job"));
    }
  }

  const status = JOB_STATUS[job.status] ?? { label: job.status, tone: "muted" as const };
  const uploadBlocker = uploadsQuery.data ? validationBlocker(uploadsQuery.data) : null;

  return (
    <div className="space-y-4 p-4">
      {/* Job summary */}
      <div className="aeon-card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Job</div>
            <div className="font-bold">{job.jobId}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Period</div>
            <div className="font-semibold">{periodLabel(job)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Frequency</div>
            <div className="font-semibold capitalize">{job.frequency.toLowerCase()}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Process date</div>
            <div className="font-semibold">{formatDate(job.processDate)}</div>
          </div>
          <ToneBadge tone={status.tone}>{status.label}</ToneBadge>
        </div>
        {perms.canLock && job.status === "APPROVED" && (
          <Button size="sm" className="gap-1.5" onClick={() => setConfirmLock(true)}>
            <Lock className="h-4 w-4" /> Lock job
          </Button>
        )}
      </div>

      {readOnly && (
        <p className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> Locked {job.lockedAt ? formatDateTime(job.lockedAt) : ""} — this job is read-only.
        </p>
      )}

      {/* KPIs */}
      {!perms.canViewRows ? null : rowsQuery.isPending ? (
        <CardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi icon={Users} label="Rows" value={counts.total} />
          <Kpi icon={CheckCircle2} label="Good – no error" value={counts.good} tone="text-success" />
          <Kpi icon={AlertTriangle} label="Need attention" value={counts.open} tone={counts.open ? "text-warning" : undefined} />
          <Kpi icon={ShieldCheck} label="Overridden" value={counts.overridden} />
        </div>
      )}

      {tabs.length === 0 ? (
        <div className="aeon-card">
          <AccessDenied what="this job’s rows, files or audit trail" />
        </div>
      ) : (
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="aeon-card overflow-hidden">
        <div className="border-b px-4 pt-3">
          <TabsList>
            {perms.canViewRows && (
              <TabsTrigger value="rows">Validation{counts.open > 0 ? ` (${counts.open} open)` : ""}</TabsTrigger>
            )}
            {perms.canViewUploads && <TabsTrigger value="uploads">Source files</TabsTrigger>}
            {perms.canViewAudit && <TabsTrigger value="audit">Audit trail</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="rows" className="mt-0">
          {rowsQuery.isPending ? (
            <TableSkeleton />
          ) : rowsQuery.isError ? (
            <ErrorState
              error={rowsQuery.error}
              title="Couldn’t load validation rows"
              onRetry={() => rowsQuery.refetch()}
              retrying={rowsQuery.isFetching}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No validated rows yet"
              description={
                uploadBlocker && perms.canViewUploads
                  ? `${uploadBlocker} Then run validation from the Source files tab.`
                  : perms.canValidate
                  ? "The required files are uploaded — run validation to generate rows."
                  : "Rows appear here once the executive runs validation."
              }
              action={
                perms.canViewUploads &&
                (perms.canUpload || perms.canValidate) &&
                !readOnly && (
                  <Button size="sm" variant="outline" onClick={() => setTab("uploads")}>
                    Go to source files
                  </Button>
                )
              }
            />
          ) : (
            <>
              <DateApprovalStrip
                job={job}
                rows={rows}
                readOnly={readOnly}
                selectedDate={selectedDate}
                onSelectDate={selectDate}
                onBlocked={onBlocked}
              />
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search driver…"
                    className="h-8 w-56 pl-8 text-xs"
                    aria-label="Search driver"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-56 text-xs" aria-label="Filter by status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="open">Needs attention</SelectItem>
                    <SelectItem value="resolved">Resolved (good or overridden)</SelectItem>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filtersActive && (
                  <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={clearFilters}>
                    <FilterX className="h-3.5 w-3.5" /> Clear
                  </Button>
                )}
                <span className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
                  {rowsQuery.isFetching && <Loader2 className="h-3 w-3 animate-spin" aria-label="Refreshing" />}
                  {visible.length} of {selectedDate ? rows.filter((r) => dateKey(r.date) === selectedDate).length : rows.length} rows
                </span>
              </div>
              {visible.length === 0 ? (
                <EmptyState
                  icon={FilterX}
                  title="No rows match"
                  description={filtersActive ? "Try a different search or status filter." : "There are no rows for this date."}
                  action={
                    filtersActive && (
                      <Button size="sm" variant="outline" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )
                  }
                />
              ) : (
                <TimecardRowsTable
                  rows={visible}
                  highlightIds={blocked}
                  canOverride={perms.canOverride && !readOnly}
                  onOverride={setOverriding}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="uploads" className="mt-0">
          <UploadsPanel job={job} readOnly={readOnly} onValidated={() => setTab("rows")} />
        </TabsContent>

        <TabsContent value="audit" className="mt-0">
          <AuditTrail jobId={job.id} />
        </TabsContent>
      </Tabs>
      )}

      <OverrideRowDialog jobId={job.id} row={overriding} onClose={() => setOverriding(null)} />

      <Dialog open={confirmLock} onOpenChange={(o) => !lock.isPending && setConfirmLock(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lock {job.jobId}?</DialogTitle>
            <DialogDescription>
              Every date is approved. Locking is permanent — the job becomes read-only for everyone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLock(false)} disabled={lock.isPending}>
              Cancel
            </Button>
            <Button onClick={doLock} disabled={lock.isPending} className="gap-1.5">
              {lock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Lock job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="aeon-soft flex items-center gap-3 px-4 py-3">
      <Icon className={`h-5 w-5 ${tone ?? "text-primary"}`} />
      <div>
        <div className="text-xl font-bold tabular-nums">{value}</div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
