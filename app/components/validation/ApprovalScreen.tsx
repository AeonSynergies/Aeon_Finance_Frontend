import { CheckCircle2, AlertCircle, Save, Send, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ApprovalScreen() {
  const ready = false;
  return (
    <div className="space-y-5 animate-fade-in">
      <div className={`aeon-card p-5 ${ready ? "ring-2 ring-success/40" : "ring-2 ring-warning/40"}`}>
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${ready ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground"}`}>
            {ready ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div className="flex-1">
            <div className="text-base font-bold">{ready ? "Ready for Approval" : "Not Ready — 7 issues pending"}</div>
            <p className="text-xs text-muted-foreground">
              Only records marked Good / No Error or Overridden can be submitted. Resolve remaining errors in the Validation tab.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <Stat label="Total" value="248" />
              <Stat label="Validated" value="234" tone="success" />
              <Stat label="Pending" value="7" tone="warning" />
              <Stat label="Errors" value="7" tone="danger" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="gap-2 rounded-xl"><Save className="h-4 w-4" /> Save Draft</Button>
            <Button disabled={!ready} className="gap-2 rounded-xl bg-gradient-brand shadow-glow disabled:opacity-50">
              <Send className="h-4 w-4" /> Submit for Approval
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="aeon-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="h-4 w-4 text-primary" /> Manager Review
          </h3>
          <div className="space-y-3 text-xs">
            <Row label="Validation summary" value="234 valid · 7 errors · 7 warnings" />
            <Row label="CAP violations" value="3 drivers" tone="danger" />
            <Row label="Overtime drivers" value="12 (43h total)" tone="info" />
          </div>
          <div className="mt-4 flex gap-2">
            <Button className="flex-1 gap-2 rounded-xl bg-success text-success-foreground hover:bg-success/90">
              <CheckCircle2 className="h-4 w-4" /> Approve
            </Button>
            <Button variant="outline" className="flex-1 gap-2 rounded-xl border-destructive/40 text-destructive">
              <X className="h-4 w-4" /> Reject
            </Button>
          </div>
          <Textarea className="mt-3 min-h-[60px] rounded-xl" placeholder="Rejection reason (required if rejecting)…" />
        </div>

        <div className="aeon-card p-5">
          <h3 className="mb-3 text-sm font-bold">Payroll Summary Entry</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payroll period"><Input className="h-9 rounded-xl" defaultValue="Apr 20 – Apr 26" /></Field>
            <Field label="Pay date"><Input type="date" className="h-9 rounded-xl" /></Field>
            <Field label="Process date"><Input type="date" className="h-9 rounded-xl" /></Field>
            <Field label="Total gross pay"><Input className="h-9 rounded-xl" defaultValue="$84,250.00" /></Field>
            <Field label="Total hours"><Input className="h-9 rounded-xl" defaultValue="2,184" /></Field>
            <Field label="PTO hours"><Input className="h-9 rounded-xl" defaultValue="48" /></Field>
            <Field label="OT hours"><Input className="h-9 rounded-xl" defaultValue="143" /></Field>
            <Field label="Bonus amount"><Input className="h-9 rounded-xl" defaultValue="$2,100" /></Field>
            <Field label="Taxes"><Input className="h-9 rounded-xl" defaultValue="$18,920" /></Field>
            <Field label="Total liability"><Input className="h-9 rounded-xl" defaultValue="$103,170" /></Field>
          </div>
          <Button className="mt-4 h-10 w-full gap-2 rounded-xl bg-gradient-brand font-semibold shadow-glow">
            Submit & Lock Job
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" | "danger" }) {
  const cls =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning-foreground" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl border bg-card px-3 py-2">
      <div className={`text-base font-bold tabular-nums ${cls}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
function Row({ label, value, tone }: { label: string; value: string; tone?: "danger" | "info" }) {
  const cls = tone === "danger" ? "text-destructive" : tone === "info" ? "text-info" : "text-foreground";
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold ${cls}`}>{value}</span>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
