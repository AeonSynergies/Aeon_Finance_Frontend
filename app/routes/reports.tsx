import { useState } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router";
import { ChevronDown, Download, Eye, FileSpreadsheet, FileText, FileType2, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, PageTabs } from "@/components/shared/PageTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { reportsService } from "@/services/reports.service";
import { useJobLists } from "@/hooks/useJobs";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "finance", label: "Finance & Accounts" },
  { key: "payroll", label: "Payroll & Compliance" },
  { key: "fleet", label: "Routes & Fleets" },
];

interface ReportDef {
  id: string;
  name: string;
  desc: string;
  module: string;
  viewHref?: string;
}

interface JobLite {
  id: string;
  jobId: string;
  status: string;
  periodStart: string;
  periodEnd: string;
}

const REPORT_DEFS: Record<string, ReportDef[]> = {
  finance: [
    { id: "revenue-expense-summary", name: "Revenue & Expense Summary", desc: "Monthly P&L roll-up", module: "ROUTE_REVENUE", viewHref: "/analytics" },
    { id: "profitability", name: "Profitability Report", desc: "Margin analysis by route and vehicle class", module: "ROUTE_REVENUE", viewHref: "/analytics" },
  ],
  payroll: [
    { id: "payroll-summary", name: "Payroll Summary", desc: "Gross pay, OT hours and earn codes per employee", module: "TIMECARD", viewHref: "/analytics" },
    { id: "overtime", name: "Overtime Report", desc: "OT hours, CAP triggers and at-risk drivers", module: "TIMECARD", viewHref: "/analytics" },
    { id: "cap-compliance", name: "CAP Compliance", desc: "Consecutive days, rest period and daily limit violations", module: "TIMECARD", viewHref: "/analytics" },
  ],
  fleet: [
    { id: "fleet-utilisation", name: "Fleet Utilization", desc: "Active vs idle vehicles", module: "FLEET_REVENUE", viewHref: "/analytics" },
    { id: "rfs-afs-summary", name: "RFS vs AFS Summary", desc: "Vehicle eligibility reconciliation", module: "RFS_AFS", viewHref: "/analytics" },
    { id: "rental-cost", name: "Rental Cost Report", desc: "Days billed vs used and variance", module: "RENTAL", viewHref: "/analytics" },
    { id: "insurance", name: "Insurance Report", desc: "Premium billed vs expected per vehicle", module: "INSURANCE", viewHref: "/analytics" },
    { id: "rm-report", name: "Repair & Maintenance", desc: "Invoice costs, work orders and exceptions", module: "REPAIR_MAINTENANCE", viewHref: "/analytics" },
  ],
};

async function downloadReport(id: string, name: string, format: "csv" | "pdf" | "xls", jobId?: string) {
  try {
    // ponytail: the mock report handler filters by `period`, not job; the old `?job=` param was ignored too.
    const { blob } = await reportsService.download(id);
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${id}${jobId ? `-${jobId}` : ""}.${format}`;
    a.click();
    URL.revokeObjectURL(blobUrl);
    toast.success(`${name} downloaded`);
  } catch (e) {
    if (isAxiosError(e) && e.response) toast.error("No data available — complete and lock a job first");
    else toast.error("Download failed");
  }
}

const fmtPeriod = (s: string, e: string) => {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${fmt(s)} – ${fmt(e)}`;
};

function ReportRow({
  report,
  jobs,
  selected,
  onToggle,
}: {
  report: ReportDef;
  jobs: JobLite[];
  selected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-card shadow-soft transition-all",
        selected && "border-primary/30 ring-1 ring-primary/20"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <input type="checkbox" checked={selected} onChange={onToggle} className="h-4 w-4 rounded" />
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{report.name}</div>
          <div className="truncate text-xs text-muted-foreground">{report.desc}</div>
        </div>
        <div className="flex items-center gap-1.5">
          {report.viewHref && (
            <Link
              to={report.viewHref}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border/70 px-2.5 text-[11px] font-semibold transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Eye className="h-3.5 w-3.5" /> View
            </Link>
          )}
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-lg border-border/70 pr-2 text-[11px] font-semibold"
              onClick={() => setExpanded((v) => !v)}
            >
              <Download className="h-3.5 w-3.5" /> Export <ChevronDown className="ml-0.5 h-3 w-3" />
            </Button>
            {expanded && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[120px] rounded-xl border border-border/70 bg-card p-1 shadow-card">
                {(["csv", "pdf", "xls"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => {
                      downloadReport(report.id, report.name, fmt);
                      setExpanded(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-muted/50"
                  >
                    {fmt === "csv" ? (
                      <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
                    ) : fmt === "pdf" ? (
                      <FileType2 className="h-3.5 w-3.5 text-destructive" />
                    ) : (
                      <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                    )}
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {jobs.length > 0 && (
        <div className="divide-y divide-border/40 border-t">
          {jobs.slice(0, 5).map((j) => (
            <div key={j.id} className="flex items-center gap-3 bg-muted/20 px-4 py-2 transition-colors hover:bg-muted/40">
              <div className="w-4" />
              <div className="flex-1">
                <span className="text-xs font-bold text-primary">{j.jobId}</span>
                <span className="mx-2 text-[10px] text-muted-foreground">·</span>
                <span className="text-[11px] text-muted-foreground">{fmtPeriod(j.periodStart, j.periodEnd)}</span>
              </div>
              <div className="flex items-center gap-1">
                {(["csv", "xls"] as const).map((fmt) => (
                  <Button
                    key={fmt}
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 rounded-lg px-2 text-[10px] font-semibold"
                    onClick={() => downloadReport(report.id, report.name, fmt, j.jobId)}
                  >
                    <FileSpreadsheet className="h-3 w-3" /> {fmt.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const REPORT_MODULES = ["TIMECARD", "ROUTE_REVENUE", "FLEET_REVENUE", "RFS_AFS", "RENTAL", "REPAIR_MAINTENANCE", "INSURANCE"];

export default function Reports() {
  const [tab, setTab] = useState(TABS[0].key);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);

  const moduleLists = useJobLists(REPORT_MODULES.map((module) => ({ module })));
  const jobsByModule: Record<string, JobLite[]> = Object.fromEntries(
    REPORT_MODULES.map((m, i) => [
      m,
      (moduleLists[i].data ?? []).filter((j) => ["APPROVED", "LOCKED"].includes(j.status)).slice(0, 5),
    ])
  );

  const reports = REPORT_DEFS[tab] ?? [];
  const filtered = reports.filter(
    (r) => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.desc.toLowerCase().includes(search.toLowerCase())
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function exportAll(format: "csv" | "pdf" | "xls") {
    setExportOpen(false);
    const toExport = filtered.filter((r) => selected.has(r.id));
    for (const r of toExport) {
      await downloadReport(r.id, r.name, format);
      await new Promise((res) => setTimeout(res, 300));
    }
  }

  return (
    <AppLayout title="Reports">
      <div className="space-y-6">
        <PageHeader
          title="Reports"
          subtitle="Generate and download reports — approved and locked jobs"
          actions={
            <div className="relative">
              <Button
                disabled={selected.size === 0}
                onClick={() => setExportOpen((v) => !v)}
                className="h-9 gap-2 rounded-xl bg-gradient-brand text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95 disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                Export All ({selected.size}) <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              {exportOpen && selected.size > 0 && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[130px] rounded-xl border border-border/70 bg-card p-1 shadow-card">
                  {(["csv", "pdf", "xls"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => exportAll(fmt)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-muted/50"
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          }
        />
        <PageTabs
          tabs={TABS}
          active={tab}
          onChange={(t) => {
            setTab(t);
            setSelected(new Set());
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-xl border-border/70 bg-card pl-9 text-sm shadow-soft"
            />
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} reports</span>
        </div>
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="aeon-card p-10 text-center">
              <p className="text-sm text-muted-foreground">No reports match your search.</p>
            </div>
          ) : (
            filtered.map((r) => (
              <ReportRow
                key={r.id}
                report={r}
                jobs={jobsByModule[r.module] ?? []}
                selected={selected.has(r.id)}
                onToggle={() => toggleSelect(r.id)}
              />
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
