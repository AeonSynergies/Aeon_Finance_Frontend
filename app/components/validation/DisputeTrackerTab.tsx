import { useMemo, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { DisputeRow, VendorDisputeStatus } from "./shared";
import { ValidationDisputeChip, VendorDisputeChip } from "./StatusCells";

interface DisputeTrackerTabProps {
  rows: DisputeRow[];
  /** Job filter driven by the parent shell's job tab. Defaults to "current". */
  job?: "current" | "previous";
  /** Currency formatter; default USD */
  format?: (n: number) => string;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const ACCEPTANCE_STATUSES: VendorDisputeStatus[] = [
  "Yet to Dispute",
  "Submitted",
  "Under Review",
  "Accepted",
  "Partially Accepted",
  "Rejected",
];

interface AcceptanceEdit {
  status: VendorDisputeStatus;
  accepted: number;
}

export function DisputeTrackerTab({ rows, job = "current", format = fmt }: DisputeTrackerTabProps) {
  // Local overrides for acceptance status + accepted value (keyed by row id).
  const [overrides, setOverrides] = useState<Record<string, AcceptanceEdit>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AcceptanceEdit | null>(null);

  const filtered = useMemo(() => rows.filter((r) => (r.job ?? "current") === job), [rows, job]);

  const resolve = (r: DisputeRow): AcceptanceEdit => {
    const o = overrides[r.id];
    if (o) return o;
    // Default: if the source row hasn't been submitted, force "Yet to Dispute".
    const status: VendorDisputeStatus =
      r.vendorDisputeStatus && r.vendorDisputeStatus !== "Yet to Dispute"
        ? r.vendorDisputeStatus
        : "Yet to Dispute";
    return { status, accepted: r.acceptedValue ?? 0 };
  };

  const startEdit = (r: DisputeRow) => {
    setEditingId(r.id);
    setDraft(resolve(r));
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };
  const saveEdit = (r: DisputeRow) => {
    if (!draft) return;
    const accepted = Math.max(0, Math.min(draft.accepted || 0, r.disputeValue));
    setOverrides((p) => ({ ...p, [r.id]: { ...draft, accepted } }));
    setEditingId(null);
    setDraft(null);
    toast.success(`Acceptance updated for ${r.disputeId}`);
  };

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        const cur = resolve(r);
        const accepted = cur.status === "Accepted" || cur.status === "Partially Accepted" ? cur.accepted : 0;
        const rejected =
          cur.status === "Rejected"
            ? r.disputeValue
            : cur.status === "Partially Accepted"
              ? Math.max(0, r.disputeValue - cur.accepted)
              : 0;
        return {
          dispute: acc.dispute + r.disputeValue,
          accepted: acc.accepted + accepted,
          rejected: acc.rejected + rejected,
        };
      },
      { dispute: 0, accepted: 0, rejected: 0 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, overrides]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-end gap-3 border-b bg-muted/30 px-3 py-2 text-[11px] font-semibold">
        <span>Dispute: <span className="text-foreground">{format(totals.dispute)}</span></span>
        <span className="text-success">Accepted: {format(totals.accepted)}</span>
        <span className="text-destructive">Rejected: {format(totals.rejected)}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[1200px] border-collapse text-[12px]">
          <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
            <tr>
              {[
                "Dispute ID",
                "Type",
                "Validation Dispute Status",
                "Dispute Status",
                "Dispute Value",
                "Accepted",
                "Rejected",
                "Dispute Notes",
                "Resolution Notes",
                "Action",
              ].map((h) => (
                <th key={h} className="h-9 whitespace-nowrap border-b px-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-[12px] italic text-muted-foreground">
                  No disputes recorded for the {job} job.
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => {
                const cur = resolve(r);
                const editing = editingId === r.id;
                const acceptedShown = cur.status === "Accepted" || cur.status === "Partially Accepted" ? cur.accepted : 0;
                const rejectedShown =
                  cur.status === "Rejected"
                    ? r.disputeValue
                    : cur.status === "Partially Accepted"
                      ? Math.max(0, r.disputeValue - cur.accepted)
                      : 0;
                return (
                  <tr key={r.id} className={cn("border-b hover:bg-muted/20", i % 2 === 1 && "bg-muted/10")}>
                    <td className="h-10 px-3 font-mono text-[11.5px] font-semibold">{r.disputeId}</td>
                    <td className="h-10 px-3">{r.disputeType}</td>
                    <td className="h-10 px-3"><ValidationDisputeChip status={r.validationDisputeStatus} /></td>
                    <td className="h-10 px-3">
                      {editing && draft ? (
                        <Select
                          value={draft.status}
                          onValueChange={(v) => setDraft({ ...draft, status: v as VendorDisputeStatus })}
                        >
                          <SelectTrigger className="h-7 w-[170px] text-[11.5px]">
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
                    <td className="h-10 px-3 text-right tabular-nums">{format(r.disputeValue)}</td>
                    <td className="h-10 px-3 text-right tabular-nums text-success">
                      {editing && draft && (draft.status === "Accepted" || draft.status === "Partially Accepted") ? (
                        <input
                          type="number"
                          min={0}
                          max={r.disputeValue}
                          value={draft.accepted}
                          onChange={(e) => setDraft({ ...draft, accepted: Number(e.target.value) })}
                          className="h-7 w-[110px] rounded border bg-background px-1.5 text-right text-[11.5px] focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      ) : (
                        format(acceptedShown)
                      )}
                    </td>
                    <td className="h-10 px-3 text-right tabular-nums text-destructive">{format(rejectedShown)}</td>
                    <td className="h-10 max-w-[220px] truncate px-3 text-[11.5px]" title={r.disputeNotes}>{r.disputeNotes ?? "—"}</td>
                    <td className="h-10 max-w-[220px] truncate px-3 text-[11.5px]" title={r.resolutionNotes}>{r.resolutionNotes ?? "—"}</td>
                    <td className="h-10 px-3">
                      {editing ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" onClick={() => saveEdit(r)} className="h-7 gap-1 px-2 text-[11px]">
                            <Check className="h-3 w-3" /> Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 gap-1 px-2 text-[11px]">
                            <X className="h-3 w-3" /> Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(r)}
                          className="h-7 gap-1 px-2 text-[11px]"
                        >
                          <Pencil className="h-3 w-3" /> Update Acceptance
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
