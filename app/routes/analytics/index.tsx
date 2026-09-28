import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarDays,
  Clock,
  Eye,
  PiggyBank,
  Repeat,
  ShieldAlert,
  Truck,
  TrendingUp,
} from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import { usePayrollSummaries } from "@/hooks/useJobs";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, PageTabs } from "@/components/shared/PageTabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "finance", label: "Finance & Accounts" },
  { key: "payroll", label: "Payroll & Compliance" },
  { key: "fleet", label: "Routes & Fleets" },
];

const PAYROLL_TAB = "payroll";

type Tone = "default" | "success" | "warning" | "destructive" | "primary";

interface SummaryRow {
  label: string;
  value: string;
  tone?: Tone;
}

interface AnalyticsCard {
  title: string;
  icon: React.ReactNode;
  accent?: string;
  period: string;
  generated: string;
  insight: string;
  rows: SummaryRow[];
  href: string;
}

const toneClass: Record<Tone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

function AnalyticsCardView({ card }: { card: AnalyticsCard }) {
  const navigate = useNavigate();
  return (
    <div className="aeon-card flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ${card.accent ?? "text-primary"}`}>
            {card.icon}
          </div>
          <div className="leading-tight">
            <h3 className="text-base font-extrabold tracking-tight">{card.title}</h3>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> {card.period}
              </span>
              <span>·</span>
              <span>Generated {card.generated}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insight strip */}
      <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.05] px-3 py-2 text-xs font-semibold text-foreground">
        <span className="text-primary">Insight · </span>
        <span className="font-medium text-muted-foreground">{card.insight}</span>
      </div>

      {/* Summary table */}
      <div className="mt-3 overflow-hidden rounded-xl border border-border/70">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border/60">
            {card.rows.map((r) => (
              <tr key={r.label} className="hover:bg-muted/30">
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.label}</td>
                <td className={`px-3 py-2 text-right text-sm font-bold ${toneClass[r.tone ?? "default"]}`}>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-auto pt-4">
        <Button
          variant="outline"
          onClick={() => navigate(card.href)}
          className="h-9 w-full gap-1.5 rounded-xl border-border/70 bg-card text-xs font-semibold shadow-soft hover:border-primary/30 hover:text-primary"
        >
          Detailed View <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

const CARDS: Record<string, AnalyticsCard[]> = {
  finance: [
    {
      title: "Revenue vs Expenses",
      icon: <Repeat className="h-5 w-5" />,
      period: "Apr 2026",
      generated: "Apr 26, 2026",
      insight: "Revenue up 6.2% MoM, expenses up 4.4% — margin expanding.",
      href: "/analytics/revenue-expense",
      rows: [
        { label: "Total Revenue", value: "$571,420", tone: "success" },
        { label: "Total Expenses", value: "$388,110", tone: "warning" },
        { label: "Net Difference", value: "+$183,310", tone: "primary" },
        { label: "MoM Change", value: "+6.2%", tone: "success" },
      ],
    },
    {
      title: "Profitability Analysis",
      icon: <PiggyBank className="h-5 w-5" />,
      accent: "text-success",
      period: "Apr 2026",
      generated: "Apr 26, 2026",
      insight: "Margin at 32.1%, top-quartile across DSP benchmark.",
      href: "/analytics/profitability",
      rows: [
        { label: "Net Profit", value: "$183,310", tone: "success" },
        { label: "Gross Margin", value: "44.2%" },
        { label: "Net Margin", value: "32.1%", tone: "success" },
        { label: "Best Route", value: "RT-A14 · 41%", tone: "primary" },
        { label: "Worst Route", value: "RT-B07 · 11%", tone: "destructive" },
      ],
    },
  ],
  fleet: [
    {
      title: "Fleet Revenue Analysis",
      icon: <Truck className="h-5 w-5" />,
      period: "Apr 2026",
      generated: "Apr 26, 2026",
      insight: "Fleet revenue +5.4% MoM, sprinter class outperforming cargo vans.",
      href: "/analytics/fleet-revenue",
      rows: [
        { label: "Total Fleet Revenue", value: "$312,540", tone: "success" },
        { label: "Active Vehicles", value: "62" },
        { label: "Revenue / Vehicle", value: "$5,041" },
        { label: "Top Class", value: "Sprinter · $128K", tone: "primary" },
      ],
    },
    {
      title: "Route Revenue Analysis",
      icon: <TrendingUp className="h-5 w-5" />,
      accent: "text-secondary",
      period: "Week 17 · Apr 20 – Apr 26",
      generated: "Apr 26, 2026",
      insight: "Match rate 98.2%. 4 routes flagged with revenue leakage.",
      href: "/analytics/route-revenue",
      rows: [
        { label: "Validated Routes", value: "184 / 188" },
        { label: "Match Rate", value: "98.2%", tone: "success" },
        { label: "Revenue Variance", value: "-$3,420", tone: "warning" },
        { label: "Disputed Routes", value: "4", tone: "destructive" },
      ],
    },
    {
      title: "Fleet Utilization Analysis",
      icon: <Truck className="h-5 w-5" />,
      accent: "text-primary",
      period: "Apr 2026",
      generated: "Apr 26, 2026",
      insight: "Utilization 84% — 10 vehicles idle > 3 days.",
      href: "/analytics/fleet-utilization",
      rows: [
        { label: "Avg Utilization", value: "84%", tone: "success" },
        { label: "Active Vehicles", value: "62" },
        { label: "Idle Vehicles", value: "10", tone: "warning" },
        { label: "Down for R&M", value: "4", tone: "destructive" },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Payroll & Compliance — job-level cards backed by /api/jobs/[id]/payroll-summary
// ---------------------------------------------------------------------------

interface PayrollSummary {
  job: { id: string; jobId: string; status: string; periodStart: string; periodEnd: string };
  hasData: boolean;
  hours: {
    totalGrossHours: number;
    totalOtHours: number;
    totalDayOtCount: number;
    weekOtDriverCount: number;
    driverCount: number;
    topOtDrivers: { employeeName: string; fileNumber: string; position: string; otHours: number }[];
  };
  cap: { dayCapViolations: number; totalCapViolations: number; complianceScore: number };
  payroll: { grossPay: number; totalLiability: number };
  revenue: { routeRevenue: number; isActual: boolean };
  profitLoss: number;
}

interface JobSummary {
  id: string;
  jobId: string;
  periodStart: string;
  periodEnd: string;
  summary: PayrollSummary;
}

const VALIDATED = ["INPROGRESS", "SENT_FOR_APPROVAL", "APPROVED", "LOCKED"];

const fmtN = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
const fmtH = (n: number) => `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n)} hrs`;
const fmtPct = (n: number) => `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n)}%`;
const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtPeriod = (start: string, end: string) => {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${s.toLocaleDateString("en-US", o)} – ${e.toLocaleDateString("en-US", o)}`;
  } catch {
    return "—";
  }
};

interface KpiCell {
  label: string;
  value: string;
  tone?: Tone;
}

interface JobColumn {
  header: string;
  render: (j: JobSummary) => { value: string; tone?: Tone };
}

function PayrollCard({
  title,
  icon,
  accent,
  insight,
  kpis,
  jobs,
  columns,
  loading,
  viewHref,
  extra,
}: {
  title: string;
  icon: React.ReactNode;
  accent?: string;
  insight: string;
  kpis: KpiCell[];
  jobs: JobSummary[];
  columns: JobColumn[];
  loading: boolean;
  viewHref: (j: JobSummary) => string;
  extra?: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="aeon-card flex flex-col p-5">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10", accent ?? "text-primary")}>
          {icon}
        </div>
        <h3 className="text-base font-extrabold tracking-tight">{title}</h3>
      </div>

      <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.05] px-3 py-2 text-xs font-semibold text-foreground">
        <span className="text-primary">Insight · </span>
        <span className="font-medium text-muted-foreground">{insight}</span>
      </div>

      {/* Summary KPIs */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</div>
            <div className={cn("mt-0.5 text-sm font-extrabold tabular-nums", toneClass[k.tone ?? "default"])}>{k.value}</div>
          </div>
        ))}
      </div>

      {extra}

      {/* Per-job list */}
      <div className="mt-3 overflow-hidden rounded-xl border border-border/70">
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-muted-foreground">Job</th>
                {columns.map((c) => (
                  <th key={c.header} className="px-3 py-2 text-right font-bold uppercase tracking-wider text-muted-foreground">
                    {c.header}
                  </th>
                ))}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-3 py-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-3 py-6 text-center text-muted-foreground">
                    No validated timecard jobs yet.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <div className="font-semibold">{j.jobId}</div>
                      <div className="text-[10px] text-muted-foreground">{fmtPeriod(j.periodStart, j.periodEnd)}</div>
                    </td>
                    {columns.map((c) => {
                      const { value, tone } = c.render(j);
                      return (
                        <td key={c.header} className={cn("px-3 py-2 text-right font-bold tabular-nums", toneClass[tone ?? "default"])}>
                          {value}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(viewHref(j))}
                        className="h-7 gap-1 rounded-lg border-border/70 px-2 text-[11px] font-semibold hover:border-primary/30 hover:text-primary"
                      >
                        <Eye className="h-3 w-3" /> View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PayrollComplianceTab() {
  const { data: list, isPending } = useJobs({ module: "TIMECARD" });
  const valid = (list ?? []).filter((j) => VALIDATED.includes(j.status));
  const summaries = usePayrollSummaries<PayrollSummary>(valid);
  const loading = isPending || summaries.some((q) => q.isPending);
  const jobs: JobSummary[] = valid.flatMap((j, i) => {
    const s = summaries[i]?.data;
    return s?.hasData ? [{ id: j.id, jobId: j.jobId, periodStart: j.periodStart, periodEnd: j.periodEnd, summary: s }] : [];
  });

  // Aggregate KPIs across all jobs.
  const totalOt = jobs.reduce((s, j) => s + j.summary.hours.totalOtHours, 0);
  const totalOtDrivers = jobs.reduce((s, j) => s + j.summary.hours.weekOtDriverCount, 0);
  const totalDayOt = jobs.reduce((s, j) => s + j.summary.hours.totalDayOtCount, 0);
  const totalCap = jobs.reduce((s, j) => s + j.summary.cap.totalCapViolations, 0);
  const avgCompliance =
    jobs.length > 0 ? jobs.reduce((s, j) => s + j.summary.cap.complianceScore, 0) / jobs.length : 100;
  const totalLiability = jobs.reduce((s, j) => s + j.summary.payroll.totalLiability, 0);
  const totalRevenue = jobs.reduce((s, j) => s + j.summary.revenue.routeRevenue, 0);
  const totalPl = jobs.reduce((s, j) => s + j.summary.profitLoss, 0);

  // Aggregate the top OT drivers across all jobs (top 3 by OT hours).
  const topOtDrivers = jobs
    .flatMap((j) => j.summary.hours.topOtDrivers ?? [])
    .sort((a, b) => b.otHours - a.otHours)
    .slice(0, 3);

  return (
    <div className="space-y-5">
      {/* Row 1 — OT + CAP side by side */}
      <div className="grid gap-5 md:grid-cols-2">
        <PayrollCard
          title="OT Analysis"
          icon={<Clock className="h-5 w-5" />}
          accent="text-warning"
          insight={
            loading
              ? "Loading overtime analytics…"
              : jobs.length === 0
                ? "No validated timecard jobs yet."
                : `${fmtH(totalOt)} of overtime across ${fmtN(jobs.length)} job${jobs.length === 1 ? "" : "s"}.`
          }
          kpis={[
            { label: "Total OT", value: fmtH(totalOt), tone: "warning" },
            { label: "OT Drivers", value: fmtN(totalOtDrivers) },
            { label: "Day OT", value: fmtN(totalDayOt) },
          ]}
          jobs={jobs}
          loading={loading}
          viewHref={(j) => `/validation/timecard?job=${j.id}`}
          extra={
            topOtDrivers.length > 0 ? (
              <div className="mt-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Top OT Drivers
                </div>
                <ul className="space-y-1">
                  {topOtDrivers.map((d, i) => (
                    <li key={i} className="flex items-center justify-between text-xs">
                      <span className="truncate font-semibold">{d.employeeName}</span>
                      <span className="ml-2 shrink-0 font-bold tabular-nums text-warning">{fmtH(d.otHours)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : undefined
          }
          columns={[
            { header: "OT Hrs", render: (j) => ({ value: fmtH(j.summary.hours.totalOtHours), tone: "warning" }) },
            { header: "OT Drivers", render: (j) => ({ value: fmtN(j.summary.hours.weekOtDriverCount) }) },
          ]}
        />

        <PayrollCard
          title="CAP Compliance"
          icon={<ShieldAlert className="h-5 w-5" />}
          accent="text-destructive"
          insight={
            loading
              ? "Loading compliance analytics…"
              : jobs.length === 0
                ? "No validated timecard jobs yet."
                : `${fmtN(totalCap)} CAP violation${totalCap === 1 ? "" : "s"} — ${fmtPct(avgCompliance)} avg compliance.`
          }
          kpis={[
            {
              label: "Violations",
              value: fmtN(totalCap),
              tone: totalCap > 0 ? "destructive" : "success",
            },
            { label: "Avg Score", value: fmtPct(avgCompliance), tone: "primary" },
            { label: "Jobs", value: fmtN(jobs.length) },
          ]}
          jobs={jobs}
          loading={loading}
          viewHref={(j) => `/validation/timecard?job=${j.id}`}
          columns={[
            {
              header: "Violations",
              render: (j) => ({
                value: fmtN(j.summary.cap.totalCapViolations),
                tone: j.summary.cap.totalCapViolations > 0 ? "destructive" : "success",
              }),
            },
            { header: "Score", render: (j) => ({ value: fmtPct(j.summary.cap.complianceScore), tone: "primary" }) },
          ]}
        />
      </div>

      {/* Row 2 — Payroll vs Revenue, full width */}
      <div className="aeon-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b bg-primary/5 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
            <BadgeDollarSign className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold">Payroll vs Revenue</div>
            <div className="text-[10px] text-muted-foreground">Company liability vs route revenue per job</div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground">Total Liability</div>
              <div className="text-lg font-extrabold tabular-nums text-destructive">{fmtUSD(totalLiability)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground">Total Revenue</div>
              <div className="text-lg font-extrabold tabular-nums text-success">{fmtUSD(totalRevenue)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground">Net P/L</div>
              <div className={cn("text-lg font-extrabold tabular-nums", totalPl >= 0 ? "text-success" : "text-destructive")}>
                {totalPl >= 0 ? "+" : "-"}{fmtUSD(Math.abs(totalPl))}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No validated timecard jobs yet.</div>
        ) : (
          <div className="grid divide-x divide-border/50 md:grid-cols-3">
            {jobs.slice(0, 6).map((j) => {
              const s = j.summary;
              const pl = s.profitLoss;
              return (
                <div key={j.id} className="p-4 transition-colors hover:bg-muted/20">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold">{j.jobId}</div>
                      <div className="text-[10px] text-muted-foreground">{fmtPeriod(j.periodStart, j.periodEnd)}</div>
                    </div>
                    <a
                      href={`/analytics/payroll-revenue?job=${j.id}`}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-border/70 bg-card px-2.5 text-[11px] font-semibold transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      View <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Liability</span>
                      <span className="font-semibold text-destructive">{fmtUSD(s.payroll.totalLiability)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revenue{!s.revenue.isActual ? " (est.)" : ""}</span>
                      <span className="font-semibold text-success">{fmtUSD(s.revenue.routeRevenue)}</span>
                    </div>
                    <div className="mt-1 flex justify-between border-t pt-1">
                      <span className="font-semibold">P/L</span>
                      <span className={cn("font-bold", pl >= 0 ? "text-success" : "text-destructive")}>
                        {pl >= 0 ? "+" : ""}
                        {fmtUSD(pl)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const Analytics = () => {
  const [tab, setTab] = useState(TABS[0].key);
  const locked = useJobs({ status: "LOCKED" });
  const lockedCount = locked.isPending ? null : (locked.data?.length ?? 0);

  const hasLocked = (lockedCount ?? 0) > 0;
  const cards = tab === PAYROLL_TAB ? [] : CARDS[tab] ?? [];

  return (
    <AppLayout title="Analytics">
      <div className="space-y-6">
        <PageHeader
          title="Analytics"
          subtitle="Structured analytical breakdown across finance, payroll, fleet and routes"
        />
        <PageTabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === PAYROLL_TAB ? (
          <PayrollComplianceTab />
        ) : lockedCount !== null && !hasLocked ? (
          <div className="aeon-card flex flex-col items-center justify-center gap-2 p-12 text-center">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            <h3 className="text-base font-extrabold tracking-tight">No locked jobs yet</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              No locked jobs yet — lock a validated job to see analytics.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {hasLocked && cards.map((c) => <AnalyticsCardView key={c.title} card={c} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Analytics;
