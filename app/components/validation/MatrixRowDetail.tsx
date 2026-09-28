import { useState } from "react";
import { Check, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApprovalStatusChip } from "./StatusCells";
import type { ApprovalStatus } from "./shared";
import { cn } from "@/lib/utils";

export interface MatrixDetailState {
  overrideNotes?: string;
  approvalStatus?: ApprovalStatus;
  approverNotes?: string;
}

interface MatrixRowDetailProps {
  /** Number of columns the detail row should span (full table width) */
  colSpan: number;
  state: MatrixDetailState;
  onChange: (s: MatrixDetailState) => void;
  disabled?: boolean;
  /** Optional row label shown on the left of the detail bar */
  label?: string;
}

/**
 * Expanded detail row rendered beneath a matrix row. Provides the
 * standardized Override notes + Approve / Reject controls so matrix-style
 * validation tables can participate in the unified validation governance flow.
 */
export function MatrixRowDetail({
  colSpan,
  state,
  onChange,
  disabled,
  label,
}: MatrixRowDetailProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState(state.approverNotes ?? "");

  const setOverride = (overrideNotes: string) => onChange({ ...state, overrideNotes });
  const approve = () =>
    onChange({ ...state, approvalStatus: "Approved", approverNotes: "" });
  const confirmReject = () => {
    if (!rejectNote.trim()) return;
    onChange({ ...state, approvalStatus: "Rejected", approverNotes: rejectNote.trim() });
    setRejectOpen(false);
  };

  const status: ApprovalStatus = state.approvalStatus ?? "Pending";

  return (
    <tr className="border-b bg-muted/15">
      <td colSpan={colSpan} className="px-3 py-2">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto]">
          {/* Override notes */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              <ShieldAlert className="h-3 w-3 text-warning" />
              Override Notes
              {label && <span className="ml-1 font-mono text-[10px] normal-case text-muted-foreground/70">· {label}</span>}
            </div>
            <Textarea
              value={state.overrideNotes ?? ""}
              onChange={(e) => setOverride(e.target.value)}
              disabled={disabled}
              placeholder="Document the operational reason for overriding the system result…"
              className="min-h-[44px] resize-none text-[11.5px]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Approval block */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Approval
              </span>
              <ApprovalStatusChip status={status} />
            </div>
            {status === "Rejected" && (
              <div className="rounded border border-destructive/30 bg-destructive/5 p-1.5 text-[11px] text-destructive">
                <span className="font-semibold">Rejected:</span> {state.approverNotes || "—"}
              </div>
            )}
            {status === "Approved" && (
              <div className="rounded border border-success/30 bg-success/5 p-1.5 text-[11px] text-success">
                Approved by Manager
              </div>
            )}
            {status === "Pending" && (
              <p className="text-[11px] italic text-muted-foreground">
                Awaiting manager decision.
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                approve();
              }}
              className="h-8 gap-1 border-success/40 text-success hover:bg-success/10"
            >
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                setRejectNote(state.approverNotes ?? "");
                setRejectOpen((v) => !v);
              }}
              className="h-8 gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
          </div>
        </div>

        {/* Inline reject reason capture */}
        {rejectOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "mt-2 flex flex-col gap-2 rounded border border-destructive/30 bg-destructive/5 p-2"
            )}
          >
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-destructive">
              Approver Notes (required to reject)
            </label>
            <Textarea
              autoFocus
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Explain why this row is being rejected…"
              className="min-h-[44px] resize-none text-[11.5px]"
            />
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setRejectOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!rejectNote.trim()}
                onClick={confirmReject}
                className="h-7 bg-destructive text-[11px] text-destructive-foreground hover:bg-destructive/90"
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}
