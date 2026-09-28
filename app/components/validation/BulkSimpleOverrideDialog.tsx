import { useEffect, useState } from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OverrideRecord, OverrideValidationStatus } from "./data";

interface BulkSimpleOverrideDialogProps {
  open: boolean;
  count: number;
  onOpenChange: (open: boolean) => void;
  onSubmit: (override: OverrideRecord) => void;
}

const STATUSES: OverrideValidationStatus[] = [
  "No Error",
  "Missing",
  "Exception",
  "Missing and Exception",
];

export function BulkSimpleOverrideDialog({
  open,
  count,
  onOpenChange,
  onSubmit,
}: BulkSimpleOverrideDialogProps) {
  const [validationStatus, setValidationStatus] =
    useState<OverrideValidationStatus>("No Error");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setValidationStatus("No Error");
      setNotes("");
    }
  }, [open]);

  const valid = notes.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-warning-foreground" /> Bulk Override
          </DialogTitle>
          <DialogDescription className="text-xs">
            Applying to {count} row{count > 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Validation Status</Label>
            <Select
              value={validationStatus}
              onValueChange={(v) => setValidationStatus(v as OverrideValidationStatus)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Override Notes <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes applied to every selected row"
              className="min-h-[90px] text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              onSubmit({
                validationStatus,
                notes: notes.trim(),
                by: "Executive",
                at: new Date().toISOString(),
                markedNoError: validationStatus === "No Error",
              });
              onOpenChange(false);
            }}
            className="h-8 gap-1.5 text-xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
