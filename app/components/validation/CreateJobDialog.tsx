import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { jobDraftSchema } from "@/schemas/job";
import { Plus } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JobDraft, ValidationModule } from "./shared";

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: ValidationModule;
  validationType: string;
  /** Suggested default Job ID prefix (e.g. "RT", "FL-RNT") */
  jobIdPrefix?: string;
  onCreate: (job: JobDraft) => void;
}

/** Default validation-due markup (days after period end). Configurable in Settings. */
const DUE_DATE_MARKUP_DAYS = 3;

function addDays(date: string, days: number): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function endFromStart(start: string, frequency: JobDraft["frequency"]): string {
  if (!start) return "";
  switch (frequency) {
    case "Daily":
      return start;
    case "Weekly":
      return addDays(start, 6);
    case "Bi-Weekly":
      return addDays(start, 13);
    case "Monthly":
      return addDays(start, 29);
    default:
      return start;
  }
}

function generateJobId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-5)}-${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;
}

export function CreateJobDialog({
  open,
  onOpenChange,
  module,
  validationType,
  jobIdPrefix = "JOB",
  onCreate,
}: CreateJobDialogProps) {
  const { register, reset, watch, setValue, handleSubmit, formState } = useForm<JobDraft>({
    resolver: zodResolver(jobDraftSchema),
    mode: "onChange",
    defaultValues: seed(module, validationType, jobIdPrefix),
  });
  const draft = watch();

  useEffect(() => {
    if (open) reset(seed(module, validationType, jobIdPrefix));
  }, [open, module, validationType, jobIdPrefix, reset]);

  // Period end + due date are always derived from start + frequency.
  const setPeriod = (periodStart: string, frequency: JobDraft["frequency"]) => {
    const periodEnd = endFromStart(periodStart, frequency);
    const opts = { shouldValidate: true };
    setValue("frequency", frequency, opts);
    setValue("periodStart", periodStart, opts);
    setValue("periodEnd", periodEnd, opts);
    setValue("processDate", addDays(periodEnd, DUE_DATE_MARKUP_DAYS), opts);
  };

  const submit = handleSubmit((values) => {
    onCreate(values);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-primary" /> Create Job — {validationType}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Creating a job auto-generates the upload matrix and initializes the validation tracker.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <Field label="Job ID (auto)">
            <Input value={draft.jobId} disabled className="h-8 text-xs font-mono" />
          </Field>
          <Field label="Validation Type">
            <Input value={draft.validationType} disabled className="h-8 text-xs" />
          </Field>
          <Field label="Validation Frequency">
            <Select value={draft.frequency} onValueChange={(v) => setPeriod(draft.periodStart, v as JobDraft["frequency"])}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["Daily", "Weekly", "Bi-Weekly", "Monthly"] as const).map((f) => (
                  <SelectItem key={f} value={f} className="text-xs">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Period Start *">
            <Input type="date" value={draft.periodStart} onChange={(e) => setPeriod(e.target.value, draft.frequency)} className="h-8 text-xs" />
          </Field>
          <Field label="Period End (auto)">
            <Input type="date" value={draft.periodEnd} disabled className="h-8 text-xs" />
          </Field>
          <Field label={`Validation Due Date (auto · +${DUE_DATE_MARKUP_DAYS}d)`}>
            <Input type="date" value={draft.processDate} disabled className="h-8 text-xs" />
          </Field>

          {module === "payroll" && (
            <>
              <Field label="Payroll Process Date">
                <Input type="date" {...register("payrollProcessDate")} className="h-8 text-xs" />
              </Field>
              <Field label="Pay Date">
                <Input type="date" {...register("payDate")} className="h-8 text-xs" />
              </Field>
            </>
          )}

          {module === "route" && (
            <>
              <Field label="Week Number">
                <Input {...register("weekNumber")} placeholder="e.g. W17" className="h-8 text-xs" />
              </Field>
              <Field label="Invoice Expected Date">
                <Input type="date" {...register("invoiceExpectedDate")} className="h-8 text-xs" />
              </Field>
            </>
          )}

          {module === "fleet" && (
            <>
              <Field label="Fleet Billing Month">
                <Input type="month" {...register("fleetBillingMonth")} className="h-8 text-xs" />
              </Field>
              <Field label="Reconciliation Month">
                <Input type="month" {...register("reconciliationMonth")} className="h-8 text-xs" />
              </Field>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">Cancel</Button>
          <Button
            disabled={!formState.isValid}
            onClick={submit}
            className="h-8 gap-1.5 bg-gradient-brand text-xs text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Create Job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function seed(module: ValidationModule, validationType: string, prefix: string): JobDraft {
  const today = new Date().toISOString().slice(0, 10);
  const frequency: JobDraft["frequency"] =
    module === "payroll" ? "Weekly" : module === "fleet" ? "Monthly" : "Weekly";
  const periodEnd = endFromStart(today, frequency);
  return {
    jobId: generateJobId(prefix),
    frequency,
    periodStart: today,
    periodEnd,
    processDate: addDays(periodEnd, DUE_DATE_MARKUP_DAYS),
    validationType,
  };
}
