import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, BadgeDollarSign, Clock, DollarSign, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { useJobs, usePayrollSummary } from "@/hooks/useJobs";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, PageTabs } from "@/components/shared/PageTabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OtDriver {
  employeeName: string;
  fileNumber: string;
  position: string;
  otHours: number;
}
interface CapDriver {
  employeeName: string;
  fileNumber: string;
  position: string;
  capCount: number;
}

interface PayrollSummary {
  job: { id: string; jobId: string; status: string; periodStart: string; periodEnd: string };
  hasData: boolean;
  hours: {
    totalGrossHours: number;
    totalOtHours: number;
    totalDayOtCount: number;
    weekOtDriverCount: number;
    topOtDrivers: OtDriver[];
    driverCount: number;
  };
  cap: {
    dayCapViolations: number;
    totalCapViolations: number;
    complianceScore: number;
    topCapDrivers: CapDriver[];
  };
  payroll: {
    grossPay: number;
    employerTax: number;
    workerComp: number;
    employeeInsurance: number;
    employee401k: number;
    totalLiability: number;
  };
  revenue: { routeRevenue: number; routeJobId: string | null; isActual: boolean };
  profitLoss: number;
}

const fmtUSD = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtH = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const fmtPeriod = (start: string, end: string) => {
  try {
    const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    return `${new Date(start).toLocaleDateString("en-US", o)} – ${new Date(end).toLocaleDateString("en-US", o)}`;
  } catch {
    return "—";
  }
};

const DETAIL_TABS = [
  { key: "pay", label: "Pay Breakdown" },
  { key: "hours", label: "Hours Breakdown" },
];

function PayrollRevenueDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get("job");

  const { data: summary, isLoading: loading } = usePayrollSummary<PayrollSummary>(jobId ?? undefined);
  const data = summary ?? null;
  const [tab, setTab] = useState(DETAIL_TABS[0].key);
  const { data: allJobs } = useJobs({ module: "TIMECARD" });
  const availableJobs = (allJobs ?? [])
    .filter((j) => ["INPROGRESS", "SENT_FOR_APPROVAL", "APPROVED", "LOCKED"].includes(j.status))
    .sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime());

  if (!jobId) {
    return (
      <AppLayout title="Payroll vs Revenue">
        <div className="space-y-6">
          <PageHeader
            title="Payroll vs Revenue"
            subtitle="Select a job from the Analytics → Payroll & Compliance tab to view its breakdown"
          />
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 py-16 text-center">
            <BadgeDollarSign className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <div className="text-sm font-semibold text-muted-foreground">No job selected</div>
            <div className="mt-1 max-w-xs text-xs text-muted-foreground/70">
              Open Analytics → Payroll &amp; Compliance and click “View” on a job to see its payroll cost and revenue breakdown.
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/analytics")}
              className="mt-4 h-9 gap-1.5 rounded-xl text-xs font-semibold"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Analytics
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const p = data?.payroll;
  const h = data?.hours;
  const c = data?.cap;

  const payRows = p
    ? [
        { label: "Gross Pay", value: fmtUSD(p.grossPay), tone: "" },
        { label: "Employer Tax (9.3%)", value: fmtUSD(p.employerTax), tone: "" },
        { label: "Worker Comp (5.66%)", value: fmtUSD(p.workerComp), tone: "" },
        { label: "Employee Insurance", value: fmtUSD(p.employeeInsurance), tone: "" },
        { label: "401k Match (1.25%)", value: fmtUSD(p.employee401k), tone: "" },
        { label: "Total Payroll Liability", value: fmtUSD(p.totalLiability), tone: "text-primary font-extrabold" },
      ]
    : [];

  return (
    <AppLayout title="Payroll vs Revenue">
      <div className="space-y-6">
        <PageHeader
          title={data ? `Payroll vs Revenue · ${data.job.jobId}` : "Payroll vs Revenue"}
          subtitle={
            data
              ? `${fmtPeriod(data.job.periodStart, data.job.periodEnd)} · ${data.job.status}`
              : "Loading job payroll breakdown…"
          }
          actions={
            <div className="flex items-center gap-2">
              <select
                value={jobId ?? ""}
                onChange={(e) => navigate(`/analytics/payroll-revenue?job=${e.target.value}`)}
                className="h-9 rounded-xl border border-border/70 bg-card px-2 text-xs shadow-soft focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select job…</option>
                {availableJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.jobId} · {fmtPeriod(j.periodStart, j.periodEnd)}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                onClick={() => navigate("/analytics")}
                className="h-9 gap-1.5 rounded-xl text-xs font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            </div>
          }
        />

        {loading ? (
          <div className="aeon-card p-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !data || !data.hasData ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 py-16 text-center">
            <BadgeDollarSign className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <div className="text-sm font-semibold text-muted-foreground">No payroll data for this job</div>
          </div>
        ) : (
          <>
            {/* KPI strip */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Total Liability", value: fmtUSD(p!.totalLiability), icon: DollarSign, color: "text-primary" },
                { label: "Route Revenue", value: fmtUSD(data.revenue.routeRevenue), icon: TrendingUp, color: "text-success" },
                {
                  label: "Profit / Loss",
                  value: fmtUSD(data.profitLoss),
                  icon: data.profitLoss >= 0 ? TrendingUp : TrendingDown,
                  color: data.profitLoss >= 0 ? "text-success" : "text-destructive",
                },
                { label: "Compliance", value: fmtPct(c!.complianceScore), icon: ShieldAlert, color: "text-warning" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="aeon-card p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", color)} />
                    <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                  </div>
                  <div className={cn("text-2xl font-extrabold tabular-nums", color)}>{value}</div>
                </div>
              ))}
            </div>

            {!data.revenue.isActual && (
              <div className="rounded-xl border border-warning/30 bg-warning/[0.06] px-4 py-2.5 text-xs font-medium text-warning">
                No matching route revenue job found for this period — revenue shown as $0.00.
              </div>
            )}

            <PageTabs tabs={DETAIL_TABS} active={tab} onChange={setTab} />

            {tab === "pay" ? (
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="aeon-card overflow-hidden p-0">
                  <div className="border-b px-5 py-3 text-sm font-bold">Payroll Cost Breakdown</div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-border/60">
                      {payRows.map((r) => (
                        <tr key={r.label} className="hover:bg-muted/20">
                          <td className="px-5 py-2.5 text-xs text-muted-foreground">{r.label}</td>
                          <td className={cn("px-5 py-2.5 text-right font-bold tabular-nums", r.tone)}>{r.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="aeon-card overflow-hidden p-0">
                  <div className="border-b px-5 py-3 text-sm font-bold">Payroll vs Revenue</div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-border/60">
                      <tr className="hover:bg-muted/20">
                        <td className="px-5 py-2.5 text-xs text-muted-foreground">Route Revenue</td>
                        <td className="px-5 py-2.5 text-right font-bold tabular-nums text-success">
                          {fmtUSD(data.revenue.routeRevenue)}
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-5 py-2.5 text-xs text-muted-foreground">Total Payroll Liability</td>
                        <td className="px-5 py-2.5 text-right font-bold tabular-nums text-destructive">
                          {fmtUSD(p!.totalLiability)}
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-5 py-2.5 text-xs font-semibold">Profit / Loss</td>
                        <td
                          className={cn(
                            "px-5 py-2.5 text-right font-extrabold tabular-nums",
                            data.profitLoss >= 0 ? "text-success" : "text-destructive"
                          )}
                        >
                          {fmtUSD(data.profitLoss)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="aeon-card overflow-hidden p-0">
                  <div className="border-b px-5 py-3 text-sm font-bold">Hours Summary</div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-border/60">
                      <tr className="hover:bg-muted/20">
                        <td className="px-5 py-2.5 text-xs text-muted-foreground">Total Gross Hours</td>
                        <td className="px-5 py-2.5 text-right font-bold tabular-nums">{fmtH(h!.totalGrossHours)}</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-5 py-2.5 text-xs text-muted-foreground">Total OT Hours</td>
                        <td className="px-5 py-2.5 text-right font-bold tabular-nums text-warning">{fmtH(h!.totalOtHours)}</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-5 py-2.5 text-xs text-muted-foreground">Day OT Count</td>
                        <td className="px-5 py-2.5 text-right font-bold tabular-nums">{h!.totalDayOtCount}</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-5 py-2.5 text-xs text-muted-foreground">OT Drivers</td>
                        <td className="px-5 py-2.5 text-right font-bold tabular-nums">{h!.weekOtDriverCount}</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-5 py-2.5 text-xs text-muted-foreground">Driver Count</td>
                        <td className="px-5 py-2.5 text-right font-bold tabular-nums">{h!.driverCount}</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-5 py-2.5 text-xs text-muted-foreground">CAP Violations</td>
                        <td className="px-5 py-2.5 text-right font-bold tabular-nums text-destructive">
                          {c!.totalCapViolations}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="aeon-card overflow-hidden p-0">
                  <div className="border-b px-5 py-3 text-sm font-bold">
                    <Clock className="mr-1.5 inline h-4 w-4 text-warning" /> Top Overtime Drivers
                  </div>
                  <div className="max-h-72 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/40">
                        <tr>
                          {["Driver", "File #", "Position", "OT Hrs"].map((hd) => (
                            <th key={hd} className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-muted-foreground">
                              {hd}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {h!.topOtDrivers.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                              No overtime recorded.
                            </td>
                          </tr>
                        ) : (
                          h!.topOtDrivers.map((d, i) => (
                            <tr key={i} className="hover:bg-muted/20">
                              <td className="px-4 py-2.5 font-semibold">{d.employeeName}</td>
                              <td className="px-4 py-2.5 font-mono text-muted-foreground">{d.fileNumber}</td>
                              <td className="px-4 py-2.5">{d.position}</td>
                              <td className="px-4 py-2.5 text-right font-bold tabular-nums text-warning">{fmtH(d.otHours)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default PayrollRevenueDetail;
