import { useEffect, useState } from "react";
import { XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { TimecardRow } from "./data";

interface RowRejectDialogProps {
  row: TimecardRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string, correctionNotes: string) => void;
}

/** Per-row reject — captures Correction Notes (what should be corrected). */
export function RowRejectDialog({ row, open, onOpenChange, onConfirm }: RowRejectDialogProps) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) setNotes(row?.approverNotes ?? "");
  }, [open, row]);

  if (!row) return null;
  const valid = notes.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <XCircle className="h-4 w-4 text-destructive" />
            Reject Row
          </DialogTitle>
          <DialogDescription className="text-xs">
            {row.name} · {row.date} · {row.id}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label className="text-xs font-semibold">
            Correction Notes <span className="text-destructive">*</span>
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe what should be corrected on this row"
            className="min-h-[100px] text-xs"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!valid}
            onClick={() => onConfirm(row.id, notes.trim())}
            className="h-8 text-xs"
          >
            Reject Row
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
