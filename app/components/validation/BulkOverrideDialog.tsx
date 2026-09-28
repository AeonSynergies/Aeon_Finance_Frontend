import { useEffect, useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface OverrideField {
  key: string;
  label: string;
  type?: "text" | "number";
  width?: string;
}

export interface OverrideRowInput {
  id: string;
  identifier: string;     // first fixed column
  currentStatus: string;  // second fixed column
  values: Record<string, string | number>;
}

export interface OverrideSubmission {
  id: string;
  values: Record<string, string | number>;
  notes: string;
  by: string;
  at: string; // ISO
}

interface BulkOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: OverrideRowInput[];
  fields: OverrideField[];
  identifierLabel?: string;
  statusLabel?: string;
  user?: string;
  onSubmit: (updates: OverrideSubmission[]) => void;
}

/**
 * Compact tabular bulk-override dialog.
 * Fixed columns: Identifier, Current Status.
 * Editable columns come from `fields`. Last column is mandatory Override Notes.
 */
export function BulkOverrideDialog({
  open,
  onOpenChange,
  rows,
  fields,
  identifierLabel = "Row ID",
  statusLabel = "Current Status",
  user = "Executive",
  onSubmit,
}: BulkOverrideDialogProps) {
  const [state, setState] = useState<Record<string, { values: Record<string, string | number>; notes: string }>>({});

  useEffect(() => {
    if (open) {
      const seed: typeof state = {};
      for (const r of rows) {
        seed[r.id] = { values: { ...r.values }, notes: "" };
      }
      setState(seed);
    }
  }, [open, rows]);

  const allNotesFilled = useMemo(
    () => rows.length > 0 && rows.every((r) => (state[r.id]?.notes ?? "").trim().length > 0),
    [rows, state]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-warning-foreground" /> Bulk Override
          </DialogTitle>
          <DialogDescription className="text-xs">
            {rows.length} row{rows.length > 1 ? "s" : ""} · override reason is mandatory and will be recorded in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto rounded-lg border">
          <table className="w-full border-collapse text-[12px]">
            <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
              <tr>
                <th className="sticky left-0 z-20 h-9 whitespace-nowrap border-b bg-muted/70 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {identifierLabel}
                </th>
                <th className="sticky left-[120px] z-20 h-9 whitespace-nowrap border-b bg-muted/70 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {statusLabel}
                </th>
                {fields.map((f) => (
                  <th
                    key={f.key}
                    className="h-9 whitespace-nowrap border-b px-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                    style={f.width ? { width: f.width } : undefined}
                  >
                    {f.label}
                  </th>
                ))}
                <th className="h-9 whitespace-nowrap border-b px-3 text-left text-[11px] font-bold uppercase tracking-wider text-destructive">
                  Override Notes *
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const s = state[r.id] ?? { values: r.values, notes: "" };
                const noteMissing = s.notes.trim().length === 0;
                return (
                  <tr key={r.id} className={cn("border-b", i % 2 === 1 && "bg-muted/20")}>
                    <td className="sticky left-0 z-10 h-10 whitespace-nowrap bg-card px-3 font-mono text-[11.5px] font-semibold">
                      {r.identifier}
                    </td>
                    <td className="sticky left-[120px] z-10 h-10 whitespace-nowrap bg-card px-3 text-muted-foreground">
                      {r.currentStatus}
                    </td>
                    {fields.map((f) => (
                      <td key={f.key} className="h-10 px-2">
                        <Input
                          type={f.type === "number" ? "number" : "text"}
                          value={String(s.values[f.key] ?? "")}
                          onChange={(e) =>
                            setState((p) => ({
                              ...p,
                              [r.id]: {
                                ...s,
                                values: {
                                  ...s.values,
                                  [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value,
                                },
                              },
                            }))
                          }
                          className="h-7 text-xs"
                        />
                      </td>
                    ))}
                    <td className="h-10 px-2">
                      <Input
                        value={s.notes}
                        onChange={(e) =>
                          setState((p) => ({
                            ...p,
                            [r.id]: { ...s, notes: e.target.value },
                          }))
                        }
                        placeholder="Reason for override…"
                        className={cn(
                          "h-7 text-xs",
                          noteMissing && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            disabled={!allNotesFilled}
            onClick={() => {
              const at = new Date().toISOString();
              const updates: OverrideSubmission[] = rows.map((r) => ({
                id: r.id,
                values: state[r.id]?.values ?? r.values,
                notes: (state[r.id]?.notes ?? "").trim(),
                by: user,
                at,
              }));
              onSubmit(updates);
              onOpenChange(false);
            }}
            className="h-8 gap-1.5 text-xs"
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Apply Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
