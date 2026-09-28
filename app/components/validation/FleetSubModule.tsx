import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateJobDialog } from "@/components/validation/CreateJobDialog";
import { JobSelector } from "@/components/validation/JobSelector";
import { ValidationStatusChip } from "@/components/validation/StatusCells";
import type { ModuleJob } from "@/hooks/useModuleJobs";
import { useModuleJobs } from "@/hooks/useModuleJobs";
import type { JobDraft, ValidationStatus } from "@/components/validation/shared";
import { cn } from "@/lib/utils";
import { apiError } from "@/services/client";
import { useCreateJob, useDeleteJob, useJobRows } from "@/hooks/useJobs";
import type { JobModule } from "@/types";

/* ─────────────────────────  Types  ───────────────────────── */

/** A ValidationRow as returned by GET /api/jobs/[id]/rows. */
export interface FleetRow {
  id: string;
  date: string | null;
  externalId: string | null;
  validationStatus: string;
  disputeStatus: string;
  validationNotes: string | null;
  data: string;
}

export type FleetRowData = Record<string, unknown>;

/** A display column for the fleet validation table. */
export interface FleetColumn {
  key: string;
  label: string;
  /** Reads the display value from the parsed `data` blob (+ the raw row). */
  accessor: (d: FleetRowData, row: FleetRow) => string;
  align?: "left" | "right";
}

export interface FleetSubModuleProps {
  /** JobModule enum string, e.g. "RENTAL", "REPAIR_MAINTENANCE", "INSURANCE". */
  module: string;
  /** ValidationRow.rowType, e.g. "rental", "repair", "insurance". */
  rowType: string;
  title: string;
  description: string;
  /** Suggested Create-Job id prefix (e.g. "FL-RNT"). */
  jobIdPrefix: string;
  /** Required document types shown in the header hint. */
  docTypes: string[];
  /** Column definitions for the validation table. */
  columns: FleetColumn[];
  /** Empty-state message shown when the selected job has 0 rows. */
  emptyRowsMessage: string;
}

/* ─────────────────────────  Helpers  ───────────────────────── */

const dash = (v: unknown): string =>
  v === null || v === undefined || v === "" ? "—" : String(v);

const NO_ROWS: FleetRow[] = [];

function parseData(row: FleetRow): FleetRowData {
  try {
    return JSON.parse(row.data) as FleetRowData;
  } catch {
    return {};
  }
}

/** Map API validation status → display ValidationStatus chip label. */
function mapValidation(s: string): ValidationStatus {
  switch (s) {
    case "VALIDATED":
      return "Validated";
    case "NEED_MANUAL_VALIDATION":
      return "Need Manual Validation";
    case "NEED_DISPUTE":
      return "Need Dispute";
    case "SENT_FOR_APPROVAL":
      return "Sent for Approval";
    case "LOCKED":
      return "Locked";
    default:
      return "Pending Validation";
  }
}

/* ─────────────────────────  Component  ───────────────────────── */

export function FleetSubModule({
  module,
  rowType,
  title,
  description,
  jobIdPrefix,
  docTypes,
  columns,
  emptyRowsMessage,
}: FleetSubModuleProps) {
  const {
    jobs,
    selectedJobId,
    setSelectedJobId,
    selectedJob,
    readOnly,
    loading,
  } = useModuleJobs(module);

  const rowsQuery = useJobRows(selectedJobId || undefined, rowType);
  const rows: FleetRow[] = rowsQuery.data ?? NO_ROWS;
  const createJob = useCreateJob();
  const removeJob = useDeleteJob();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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

  const parsedRows = useMemo(
    () => rows.map((row) => ({ row, data: parseData(row) })),
    [rows]
  );

  async function handleCreateJob(job: JobDraft) {
    try {
      await createJob.mutateAsync({
        module: module as JobModule,
        frequency: job.frequency,
        periodStart: job.periodStart,
        periodEnd: job.periodEnd,
        processDate: job.processDate,
      });
      toast.success("Job created");
    } catch (e) {
      toast.error(apiError(e, "Failed to create job"));
    }
  }

  const totalCols = 1 + columns.length + 2; // Date + data cols + Status + Notes

  return (
    <AppLayout title={title} subtitle={`Validation → Fleets → ${title}`} showAlert={false}>
      <div className="flex flex-col gap-3">
        {/* Sticky module top bar: back link + module name + job selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card/40 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Link
              to="/validation"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              ← Back
            </Link>
            <span className="text-sm font-bold tracking-tight">{title}</span>
          </div>
          <JobSelector
            jobs={jobs as ModuleJob[]}
            selectedJobId={selectedJobId}
            onSelect={setSelectedJobId}
            onCreateJob={() => setCreateOpen(true)}
            onDeleteJob={() => setDeleteConfirmOpen(true)}
            loading={loading}
          />
        </div>

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Required: {docTypes.join(" · ")}
          </p>
        </div>

        <section className="aeon-card flex min-h-[50vh] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight">Validation Rows</h2>
              {selectedJob && (
                <span className="rounded-full border bg-card px-2 py-0.5 font-mono text-[10.5px] font-semibold text-primary">
                  {selectedJob.jobId}
                  {readOnly ? " · Locked" : ""}
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {rows.length} row{rows.length === 1 ? "" : "s"}
            </span>
          </div>

          {!selectedJobId ? (
            <div className="flex flex-1 items-center justify-center p-10 text-center text-xs text-muted-foreground">
              Select a job above or create a new one to begin
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-10 text-center text-xs text-muted-foreground">
              {emptyRowsMessage}
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                  <tr>
                    <th className="h-9 whitespace-nowrap border-b px-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                      Date
                    </th>
                    {columns.map((c) => (
                      <th
                        key={c.key}
                        className={cn(
                          "h-9 whitespace-nowrap border-b px-3 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground",
                          c.align === "right" ? "text-right" : "text-left"
                        )}
                      >
                        {c.label}
                      </th>
                    ))}
                    <th className="h-9 whitespace-nowrap border-b px-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                      Validation Status
                    </th>
                    <th className="h-9 whitespace-nowrap border-b px-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map(({ row, data }, i) => (
                    <tr
                      key={row.id}
                      className={cn("border-b hover:bg-primary/5", i % 2 === 1 && "bg-muted/10")}
                    >
                      <td className="h-10 whitespace-nowrap px-3 align-middle font-mono text-[11.5px] font-semibold text-primary">
                        {dash(row.date)}
                      </td>
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={cn(
                            "h-10 whitespace-nowrap px-3 align-middle",
                            c.align === "right" && "text-right tabular-nums"
                          )}
                        >
                          {c.accessor(data, row)}
                        </td>
                      ))}
                      <td className="h-10 px-3 align-middle">
                        <ValidationStatusChip status={mapValidation(row.validationStatus)} />
                      </td>
                      <td className="h-10 px-3 align-middle">
                        <span className="block max-w-[220px] truncate" title={row.validationNotes ?? ""}>
                          {dash(row.validationNotes)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {parsedRows.length === 0 && (
                    <tr>
                      <td colSpan={totalCols} className="px-3 py-10 text-center text-xs text-muted-foreground">
                        {emptyRowsMessage}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <CreateJobDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          module="fleet"
          validationType={title}
          jobIdPrefix={jobIdPrefix}
          onCreate={handleCreateJob}
        />

        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete job?</DialogTitle>
              <DialogDescription>
                This permanently deletes the selected job and all of its
                validation rows, documents, and related records. This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="h-8 text-xs"
                onClick={deleteJob}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
