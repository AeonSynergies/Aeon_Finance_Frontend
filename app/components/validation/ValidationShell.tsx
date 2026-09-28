import { AlertTriangle, CalendarDays, CheckCircle2, Pencil, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ValidationStage = "draft" | "submitted" | "approved" | "rejected";

export interface KpiItem {
  icon: any;
  label: string;
  value: number | string;
  tone: "primary" | "danger" | "accent" | "warning" | "success" | "info";
}

interface ValidationShellProps {
  title: string;
  periodLabel: string;
  processLabel?: string;
  viewLabel?: string;
  stage?: ValidationStage;
  stageLabel?: string;
  /** Legacy current/previous tab strip. Omit both to hide it (jobs are now
   *  chosen via a dropdown in rightHeaderExtras). */
  jobTab?: "current" | "previous";
  onJobTabChange?: (v: "current" | "previous") => void;
  viewMode: "date" | "full";
  onViewModeChange: (v: "date" | "full") => void;
  editMode?: boolean;
  onEditToggle?: () => void;
  editDisabled?: boolean;
  kpis: KpiItem[];
  /** Title shown inside the operational table header band */
  tableTitle?: string;
  /** Attention message shown to the left in the table header band */
  attentionMessage?: string;
  attentionCount?: number;
  totalCount?: number;
  submitDisabled?: boolean;
  onSubmit?: () => void;
  submitLabel?: string;
  /** Extra action buttons shown to the right inside the table header band (Export, Add Row, etc.) */
  tableHeaderActions?: React.ReactNode;
  rightHeaderExtras?: React.ReactNode;
  /** Top-level tab strip (e.g. Validation / Dispute Tracking). When omitted, only children render. */
  topTabs?: { key: string; label: string }[];
  topTab?: string;
  onTopTabChange?: (v: string) => void;
  /** Dispute tracking pane shown when topTab === "dispute" */
  disputePane?: React.ReactNode;
  children: React.ReactNode;
}

export function ValidationShell({
  title,
  periodLabel,
  processLabel,
  viewLabel = "Executive",
  stage = "draft",
  stageLabel,
  jobTab = "current",
  onJobTabChange,
  viewMode,
  onViewModeChange,
  editMode,
  onEditToggle,
  editDisabled,
  kpis,
  tableTitle,
  attentionMessage,
  attentionCount = 0,
  totalCount = 0,
  submitDisabled,
  onSubmit,
  submitLabel = "Submit for Approval",
  tableHeaderActions,
  rightHeaderExtras,
  topTabs,
  topTab = "validation",
  onTopTabChange,
  disputePane,
  children,
}: ValidationShellProps) {
  const resolved = attentionCount === 0;
  const computedAttention =
    attentionMessage ??
    (resolved
      ? totalCount > 0
        ? "All rows validated"
        : "Nothing pending"
      : `${attentionCount} row${attentionCount > 1 ? "s" : ""} require manual validation`);

  return (
    <div className="flex h-[calc(100vh-72px)] flex-col gap-3 pb-2">
      {/* Top bar */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {periodLabel}
              </span>
              {processLabel && <span>{processLabel}</span>}
              <span className="font-semibold text-foreground">View: {viewLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {rightHeaderExtras}
            <StageBadge stage={stage} label={stageLabel} />
            {onEditToggle && (
              <Button
                variant={editMode ? "default" : "outline"}
                onClick={onEditToggle}
                disabled={editDisabled}
                className="h-9 gap-1.5 rounded-lg text-xs font-semibold"
              >
                {editMode ? (
                  <>
                    <Save className="h-3.5 w-3.5" /> Save
                  </>
                ) : (
                  <>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* View toggle */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-b">
          <div className="flex items-center gap-2 pb-2">
            <Label htmlFor="view-mode" className="text-xs font-semibold text-muted-foreground">
              {viewMode === "date" ? "Date View" : "Full View"}
            </Label>
            <Switch
              id="view-mode"
              checked={viewMode === "full"}
              onCheckedChange={(v) => onViewModeChange(v ? "full" : "date")}
            />
          </div>
        </div>
      </div>

      {/* KPI strip — BELOW tabs, refreshes per job */}
      {kpis.length > 0 && (
        <div className={cn("grid grid-cols-2 gap-2", `md:grid-cols-${Math.min(kpis.length, 4)}`)}>
          {kpis.map((k, i) => (
            <Kpi key={`${jobTab}-${i}`} {...k} />
          ))}
        </div>
      )}

      {/* Optional top-level tab strip (Validation / Dispute Tracking / ...) */}
      {topTabs && topTabs.length > 0 && (
        <div className="flex border-b">
          {topTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => onTopTabChange?.(t.key)}
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase tracking-wide border-b-2 -mb-px transition-colors",
                topTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Dispute tracking pane */}
      {topTabs && topTab === "dispute" && disputePane ? (
        <div className="aeon-card flex min-h-0 flex-1 flex-col overflow-hidden">
          {disputePane}
        </div>
      ) : (
        /* Operational table card */
        <div className="aeon-card flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Operational Table Header band */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {tableTitle && (
                <h2 className="truncate text-sm font-bold tracking-tight text-foreground">{tableTitle}</h2>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                  resolved
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                )}
              >
                {resolved ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                {computedAttention}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {tableHeaderActions}
              {onSubmit && (
                <Button
                  onClick={onSubmit}
                  disabled={submitDisabled}
                  className="h-8 gap-1.5 rounded-lg bg-gradient-brand text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" /> {submitLabel}
                </Button>
              )}
            </div>
          </div>

          {/* Table content area */}
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </div>
      )}
    </div>
  );
}

function StageBadge({ stage, label }: { stage: ValidationStage; label?: string }) {
  const map = {
    draft: { cls: "border-warning/30 bg-warning/15 text-warning-foreground", dot: "bg-warning", label: "In Progress" },
    submitted: { cls: "border-info/30 bg-info/15 text-info", dot: "bg-info", label: "Awaiting Manager" },
    approved: { cls: "border-success/30 bg-success/15 text-success", dot: "bg-success", label: "Approved" },
    rejected: { cls: "border-destructive/30 bg-destructive/15 text-destructive", dot: "bg-destructive", label: "Rejected" },
  } as const;
  const m = map[stage];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide",
        m.cls
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} /> {label ?? m.label}
    </span>
  );
}

function Kpi({ icon: Icon, label, value, tone }: KpiItem) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    danger: "bg-destructive/10 text-destructive",
    accent: "bg-accent/10 text-accent",
    warning: "bg-warning/15 text-warning-foreground",
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
  } as const;
  return (
    <div className="flex h-[64px] items-center gap-3 rounded-xl border bg-card px-3 shadow-soft">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tones[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-xl font-extrabold tabular-nums">{value}</span>
      </div>
    </div>
  );
}
