import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BadgeDollarSign,
  Clock,
  Receipt,
  ShieldAlert,
  
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { useJobLists } from "@/hooks/useJobs";
import { usePayrollExceptions } from "@/hooks/useAnalytics";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, PageTabs } from "@/components/shared/PageTabs";
import { KpiCard } from "@/components/shared/KpiCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "finance", label: "Finance & Accounts" },
  { key: "payroll", label: "Payroll & Compliance" },
  { key: "fleet", label: "Routes & Fleets" },
];

const trend = [
  { m: "Nov", revenue: 412, expense: 318 },
  { m: "Dec", revenue: 458, expense: 332 },
  { m: "Jan", revenue: 489, expense: 356 },
  { m: "Feb", revenue: 502, expense: 361 },
  { m: "Mar", revenue: 538, expense: 372 },
  { m: "Apr", revenue: 571, expense: 388 },
];

const otTrend = [
  { w: "W12", current: 64, previous: 58 },
  { w: "W13", current: 71, previous: 60 },
  { w: "W14", current: 58, previous: 66 },
  { w: "W15", current: 86, previous: 70 },
  { w: "W16", current: 79, previous: 72 },
  { w: "W17", current: 94, previous: 75 },
];

const otByWave = [
  { wave: "Wave 1", avg: 4.2 },
  { wave: "Wave 2", avg: 6.8 },
  { wave: "Wave 3", avg: 9.4 },
];

const otByDriver = [
  { name: "Marcus Lee", ot: 14.5 },
  { name: "Priya Shah", ot: 12.2 },
  { name: "Jorge Ramos", ot: 11.8 },
  { name: "Aisha Khan", ot: 10.4 },
  { name: "Tomas Rivera", ot: 9.6 },
  { name: "Naomi Park", ot: 8.9 },
  { name: "Devon Cole", ot: 7.7 },
  { name: "Hana Watanabe", ot: 6.5 },
];

const capWeekly = [
  { w: "W12", twelve: 4, sixty: 2, brk: 1, consec: 1, gap: 0 },
  { w: "W13", twelve: 5, sixty: 3, brk: 2, consec: 1, gap: 1 },
  { w: "W14", twelve: 3, sixty: 1, brk: 1, consec: 0, gap: 1 },
  { w: "W15", twelve: 7, sixty: 4, brk: 2, consec: 2, gap: 1 },
  { w: "W16", twelve: 6, sixty: 2, brk: 3, consec: 1, gap: 2 },
  { w: "W17", twelve: 8, sixty: 5, brk: 2, consec: 3, gap: 2 },
];

const payrollImpact = [
  { w: "W12", regular: 62, ot: 8 },
  { w: "W13", regular: 64, ot: 11 },
  { w: "W14", regular: 60, ot: 7 },
  { w: "W15", regular: 66, ot: 14 },
  { w: "W16", regular: 65, ot: 12 },
  { w: "W17", regular: 68, ot: 16 },
];

const profitTrend = [
  { m: "Nov", v: 94 },
  { m: "Dec", v: 126 },
  { m: "Jan", v: 133 },
  { m: "Feb", v: 141 },
  { m: "Mar", v: 166 },
  { m: "Apr", v: 183 },
];

interface ListItem {
  label: string;
  sub?: string;
  value: string;
  tone?: "default" | "success" | "warning" | "destructive";
}

const toneClass: Record<NonNullable<ListItem["tone"]>, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

function ChartCard({
  title,
  subtitle,
  href,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(href)}
      className={cn(
        "aeon-card group flex flex-col p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-glow",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-70 group-hover:opacity-100">
          Open <ArrowRight className="h-3 w-3" />
        </span>
      </div>
      {children}
    </button>
  );
}

function TopList({
  title,
  subtitle,
  href,
  items,
}: {
  title: string;
  subtitle?: string;
  href: string;
  items: ListItem[];
}) {
  const navigate = useNavigate();
  return (
    <div className="aeon-card flex flex-col p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <button
          onClick={() => navigate(href)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Detailed View <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <ol className="mt-3 divide-y divide-border/60">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-3 py-2 text-sm">
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{it.label}</div>
              {it.sub && <div className="truncate text-[11px] text-muted-foreground">{it.sub}</div>}
            </div>
            <span className={cn("text-sm font-bold", toneClass[it.tone ?? "default"])}>{it.value}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** G10 — analytics only reflect LOCKED (validated & locked) jobs. */
function LockedEmptyState() {
  return (
    <div className="aeon-card flex flex-col items-center justify-center gap-2 p-12 text-center">
      <ShieldAlert className="h-8 w-8 text-muted-foreground" />
      <h3 className="text-base font-extrabold tracking-tight">No validated jobs yet</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        No validated jobs yet — validate a job to see dashboard analytics.
      </p>
    </div>
  );
}

interface ExceptionData {
  topDrivers: { name: string; count: number; types: string[] }[];
  currentPeriodCount: number;
  currentJobId: string | null;
  currentPeriod: string | null;
}

const VALIDATED_STATUSES = ["INPROGRESS", "SENT_FOR_APPROVAL", "APPROVED", "LOCKED"].map((status) => ({ status }));

const Dashboard = () => {
  const [tab, setTab] = useState(TABS[0].key);
  const { data: exceptionData = null } = usePayrollExceptions<ExceptionData>();
  // Dashboard reflects validated jobs (in-progress through locked), not just locked.
  const validatedLists = useJobLists(VALIDATED_STATUSES);
  const lockedCount = validatedLists.some((q) => q.isPending)
    ? null
    : validatedLists.reduce((a, q) => a + (q.data?.length ?? 0), 0);

  const hasLocked = (lockedCount ?? 0) > 0;

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle="Executive overview across finance, payroll and fleet"
          actions={
            <Button variant="outline" className="h-9 rounded-xl border-border/70 bg-card text-xs font-semibold shadow-soft">
              Apr 20 – Apr 26, 2026
            </Button>
          }
        />
        <PageTabs tabs={TABS} active={tab} onChange={setTab} />

        {lockedCount !== null && !hasLocked && <LockedEmptyState />}

        {hasLocked && tab === "finance" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Revenue (MTD)" value="$571,420" delta={{ value: "6.2%", positive: true }} hint="vs last month" icon={<BadgeDollarSign className="h-5 w-5" />} accent="primary" />
              <KpiCard label="Expenses (MTD)" value="$388,110" delta={{ value: "4.4%", positive: false }} hint="vs last month" icon={<Wallet className="h-5 w-5" />} accent="warning" />
              <KpiCard label="Profit (MTD)" value="$183,310" delta={{ value: "9.8%", positive: true }} icon={<Receipt className="h-5 w-5" />} accent="success" />
              <KpiCard label="Margin" value="32.1%" delta={{ value: "1.4%", positive: true }} accent="secondary" />
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              <ChartCard
                title="Revenue vs Expense"
                subtitle="Last 6 months"
                href="/analytics"
                className="lg:col-span-2"
              >
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} />
                      <Area type="monotone" dataKey="expense" stroke="hsl(var(--warning))" fill="url(#exp)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Profitability Trend" subtitle="Net profit ($K)" href="/analytics">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={profitTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                      <Line type="monotone" dataKey="v" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <TopList
                title="Top 10 Revenue Loss Routes"
                subtitle="Largest negative variance vs rate card"
                href="/analytics/route-revenue"
                items={[
                  { label: "RT-B07", sub: "Edgewood · 5 days", value: "-$1,840", tone: "destructive" },
                  { label: "RT-A22", sub: "Westbrook · 3 days", value: "-$1,210", tone: "destructive" },
                  { label: "RT-C11", sub: "Lakeshore · 2 days", value: "-$960", tone: "destructive" },
                  { label: "RT-B14", sub: "Northgate · 4 days", value: "-$720", tone: "warning" },
                  { label: "RT-A05", sub: "Centerline · 1 day", value: "-$410", tone: "warning" },
                ]}
              />
              <TopList
                title="Top 10 Profit Routes"
                subtitle="Highest margin contribution"
                href="/analytics/profitability"
                items={[
                  { label: "RT-A14", sub: "Glenview · 41% margin", value: "+$8,210", tone: "success" },
                  { label: "RT-C03", sub: "Harborline · 38%", value: "+$7,440", tone: "success" },
                  { label: "RT-D08", sub: "Parkside · 36%", value: "+$6,820", tone: "success" },
                  { label: "RT-B19", sub: "Midtown · 34%", value: "+$6,120", tone: "success" },
                  { label: "RT-A09", sub: "Eastfield · 33%", value: "+$5,810", tone: "success" },
                ]}
              />
            </div>
          </>
        )}

        {hasLocked && tab === "payroll" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Active Drivers" value="184" hint="this cycle" icon={<Users className="h-5 w-5" />} accent="primary" />
              <KpiCard label="OT Drivers" value="32" delta={{ value: "12%", positive: false }} icon={<Clock className="h-5 w-5" />} accent="warning" />
              <KpiCard label="CAP Violations" value="9" delta={{ value: "3", positive: false }} icon={<ShieldAlert className="h-5 w-5" />} accent="destructive" />
              <KpiCard label="Payroll Impact" value="$24,810" hint="OT leakage" accent="secondary" />
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              <ChartCard title="OT Trend" subtitle="Current vs previous period (hrs)" href="/analytics/overtime-cap" className="lg:col-span-2">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={otTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="w" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="current" name="Current" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="previous" name="Previous" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="OT by Route Wave" subtitle="Average OT per wave (hrs)" href="/analytics/overtime-cap">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={otByWave}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="wave" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="avg" name="Avg OT" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="OT by Driver" subtitle="Top contributors this week" href="/analytics/overtime-cap" className="lg:col-span-3">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={otByDriver} layout="vertical" margin={{ left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={110} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="ot" name="OT hrs" radius={[0, 8, 8, 0]}>
                        {otByDriver.map((d, i) => (
                          <Cell key={d.name} fill={i < 3 ? "hsl(var(--destructive))" : i < 5 ? "hsl(var(--warning))" : "hsl(var(--primary))"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="CAP Violation Trend" subtitle="By category, weekly stacked" href="/analytics/overtime-cap" className="lg:col-span-2">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={capWeekly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="w" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="twelve" name="12 hrs/day" stackId="a" fill="hsl(var(--destructive))" />
                      <Bar dataKey="sixty" name="60 hrs/week" stackId="a" fill="hsl(var(--warning))" />
                      <Bar dataKey="brk" name="Break delivery" stackId="a" fill="hsl(var(--secondary))" />
                      <Bar dataKey="consec" name="Consecutive days" stackId="a" fill="hsl(var(--primary))" />
                      <Bar dataKey="gap" name="Shift gap" stackId="a" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Payroll Impact" subtitle="Regular vs OT payroll ($k)" href="/analytics/overtime-cap">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={payrollImpact}>
                      <defs>
                        <linearGradient id="reg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="otg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="w" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="regular" name="Regular" stroke="hsl(var(--primary))" fill="url(#reg)" strokeWidth={2} />
                      <Area type="monotone" dataKey="ot" name="Overtime" stroke="hsl(var(--accent))" fill="url(#otg)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <TopList
                title="Top 10 OT Drivers"
                subtitle="Most overtime hours this cycle"
                href="/analytics/overtime-cap"
                items={[
                  { label: "M. Carter", sub: "DA-1184", value: "24.5 h", tone: "destructive" },
                  { label: "S. Patel", sub: "DA-1102", value: "21.8 h", tone: "destructive" },
                  { label: "J. Nguyen", sub: "DA-1147", value: "19.4 h", tone: "warning" },
                  { label: "R. Gomez", sub: "DA-1162", value: "18.1 h", tone: "warning" },
                  { label: "K. Reed", sub: "DA-1090", value: "17.2 h", tone: "warning" },
                ]}
              />
              <TopList
                title="Top 10 CAP Violations"
                subtitle="By driver this cycle"
                href="/analytics/overtime-cap"
                items={[
                  { label: "M. Carter", sub: "60h/wk · 12h/day", value: "3", tone: "destructive" },
                  { label: "S. Patel", sub: "60h/wk", value: "2", tone: "destructive" },
                  { label: "R. Gomez", sub: "Consecutive days", value: "1", tone: "warning" },
                  { label: "K. Reed", sub: "12h/day", value: "1", tone: "warning" },
                  { label: "L. Hwang", sub: "12h/day", value: "1", tone: "warning" },
                ]}
              />
            </div>

            {exceptionData && (
              <div className="aeon-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-extrabold">Payroll Exceptions</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Current period ({exceptionData.currentPeriod ?? "—"}):
                      <span className="ml-1 font-semibold text-warning">
                        {exceptionData.currentPeriodCount} exceptions
                      </span>
                    </div>
                  </div>
                  {exceptionData.currentJobId && (
                    <a
                      href={`/validation/timecard?job=${exceptionData.currentJobId}`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      View in Timecard →
                    </a>
                  )}
                </div>
                <div className="overflow-hidden rounded-xl border border-border/70">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-muted-foreground">#</th>
                        <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-muted-foreground">Driver</th>
                        <th className="px-3 py-2 text-center font-bold uppercase tracking-wider text-muted-foreground">Exceptions</th>
                        <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-muted-foreground">Common Issue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exceptionData.topDrivers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                            No exceptions found
                          </td>
                        </tr>
                      ) : (
                        exceptionData.topDrivers.map((d, i) => (
                          <tr key={i} className="border-t hover:bg-muted/20">
                            <td className="px-3 py-2 font-bold text-muted-foreground">{i + 1}</td>
                            <td className="px-3 py-2 font-semibold">{d.name}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 font-bold text-warning">
                                {d.count}
                              </span>
                            </td>
                            <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                              {d.types[0] ?? "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {hasLocked && tab === "fleet" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Active Vehicles" value="62" icon={<Truck className="h-5 w-5" />} accent="primary" />
              <KpiCard label="Utilization" value="84%" delta={{ value: "2.1%", positive: true }} accent="success" />
              <KpiCard label="Fleet Revenue" value="$312,540" delta={{ value: "5.4%", positive: true }} accent="secondary" />
              <KpiCard label="R&M Cost" value="$28,420" delta={{ value: "3.2%", positive: false }} accent="warning" />
            </div>

            <ChartCard title="Fleet Revenue vs Expenses" subtitle="Last 6 months" href="/analytics/fleet-revenue">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" fill="hsl(var(--secondary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <div className="grid gap-5 md:grid-cols-2">
              <TopList
                title="Top 10 Idle Vehicles"
                subtitle="Most days without route assignment"
                href="/analytics/fleet-utilization"
                items={[
                  { label: "VAN-2207", sub: "Cargo Van", value: "11 days", tone: "destructive" },
                  { label: "VAN-2188", sub: "Cargo Van", value: "9 days", tone: "warning" },
                  { label: "SPR-3041", sub: "Sprinter", value: "7 days", tone: "warning" },
                  { label: "VAN-2155", sub: "Cargo Van", value: "6 days" },
                  { label: "SPR-3019", sub: "Sprinter", value: "5 days" },
                ]}
              />
              <TopList
                title="Top 10 Highest R&M Cost Vehicles"
                subtitle="Repair spend this month"
                href="/analytics/fleet-revenue"
                items={[
                  { label: "VAN-2102", sub: "Cargo Van · 4 events", value: "$3,840", tone: "destructive" },
                  { label: "SPR-3008", sub: "Sprinter · 2 events", value: "$2,610", tone: "warning" },
                  { label: "VAN-2174", sub: "Cargo Van · 3 events", value: "$1,920", tone: "warning" },
                  { label: "VAN-2090", sub: "Cargo Van · 1 event", value: "$1,480" },
                  { label: "SPR-3052", sub: "Sprinter · 1 event", value: "$1,120" },
                ]}
              />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
