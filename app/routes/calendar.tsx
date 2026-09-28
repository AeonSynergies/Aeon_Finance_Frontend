import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  Gavel,
  Lock,
  Plus,
  Receipt,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import { useCalendar } from "@/hooks/useCalendar";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageTabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ─────────────────────────  Event model  ───────────────────────── */

type EventCategory =
  | "payroll"
  | "timecard"
  | "route"
  | "invoice"
  | "dispute"
  | "approval"
  | "lock";

type EventPriority = "high" | "normal" | "low";

interface CalEvent {
  id: string;
  day: number; // day-of-month for current month
  time?: string;
  title: string;
  module: string;
  category: EventCategory;
  priority: EventPriority;
  owner?: string;
  status?: "upcoming" | "due" | "overdue" | "done";
}

const CATEGORY_META: Record<
  EventCategory,
  { label: string; icon: typeof Truck; chip: string; dot: string; bar: string }
> = {
  payroll: {
    label: "Payroll",
    icon: Users,
    chip: "bg-primary/10 text-primary border-primary/25",
    dot: "bg-primary",
    bar: "bg-primary",
  },
  timecard: {
    label: "Timecard",
    icon: Clock,
    chip: "bg-secondary/15 text-secondary border-secondary/30",
    dot: "bg-secondary",
    bar: "bg-secondary",
  },
  route: {
    label: "Route",
    icon: Truck,
    chip: "bg-accent/10 text-accent border-accent/25",
    dot: "bg-accent",
    bar: "bg-accent",
  },
  invoice: {
    label: "Invoice",
    icon: Receipt,
    chip: "bg-success/10 text-success border-success/25",
    dot: "bg-success",
    bar: "bg-success",
  },
  dispute: {
    label: "Dispute",
    icon: Gavel,
    chip: "bg-warning/10 text-warning border-warning/30",
    dot: "bg-warning",
    bar: "bg-warning",
  },
  approval: {
    label: "Approval",
    icon: ShieldCheck,
    chip: "bg-info/10 text-[hsl(var(--info))] border-[hsl(var(--info))]/25",
    dot: "bg-[hsl(var(--info))]",
    bar: "bg-[hsl(var(--info))]",
  },
  lock: {
    label: "Lock",
    icon: Lock,
    chip: "bg-destructive/10 text-destructive border-destructive/25",
    dot: "bg-destructive",
    bar: "bg-destructive",
  },
};

const TODAY = 23;
const MONTH_LABEL = "June 2026";
const DAYS_IN_MONTH = 30;
const FIRST_DAY_OFFSET = 1; // June 1, 2026 = Monday (Sun=0)

/* ─────────────────────────  Mock events  ───────────────────────── */

const EVENTS: CalEvent[] = [
  { id: "e1", day: 16, time: "06:00", title: "Week 25 cycle starts", module: "Payroll", category: "payroll", priority: "normal", owner: "System", status: "done" },
  { id: "e2", day: 17, time: "10:30", title: "Timecard validation — Day 1", module: "Validation › Timecard", category: "timecard", priority: "normal", owner: "Sofia P.", status: "done" },
  { id: "e3", day: 18, time: "09:00", title: "Route revenue validation — Day 2", module: "Validation › Routes", category: "route", priority: "normal", owner: "Marcus J.", status: "done" },
  { id: "e4", day: 18, time: "16:00", title: "UPD report upload deadline", module: "Validation › Routes", category: "route", priority: "high", owner: "Dispatch", status: "done" },
  { id: "e5", day: 22, time: "12:00", title: "Mid-week sync — DSE2", module: "Operations", category: "approval", priority: "low", owner: "Aisha B.", status: "done" },
  { id: "e6", day: 23, time: "09:00", title: "Timecard validation due", module: "Validation › Timecard", category: "timecard", priority: "high", owner: "Sofia P.", status: "due" },
  { id: "e7", day: 23, time: "14:00", title: "Route validation — final pass", module: "Validation › Routes", category: "route", priority: "high", owner: "Marcus J.", status: "due" },
  { id: "e8", day: 23, time: "17:00", title: "Invoice reconciliation review", module: "Validation › Routes", category: "invoice", priority: "normal", owner: "Finance", status: "due" },
  { id: "e9", day: 24, time: "10:00", title: "Manager approvals window opens", module: "Approvals", category: "approval", priority: "normal", owner: "L. O'Connor", status: "upcoming" },
  { id: "e10", day: 25, time: "12:00", title: "Dispute prep — Route Count", module: "Disputes", category: "dispute", priority: "high", owner: "Finance", status: "upcoming" },
  { id: "e11", day: 26, time: "18:00", title: "Payroll lock — Week 25", module: "Payroll", category: "lock", priority: "high", owner: "System", status: "upcoming" },
  { id: "e12", day: 27, time: "09:00", title: "Late Cancellation dispute deadline", module: "Disputes", category: "dispute", priority: "high", owner: "Finance", status: "upcoming" },
  { id: "e13", day: 28, time: "17:00", title: "All approvals due", module: "Approvals", category: "approval", priority: "high", owner: "Managers", status: "upcoming" },
  { id: "e14", day: 29, time: "09:00", title: "Week 26 cycle starts", module: "Payroll", category: "payroll", priority: "normal", owner: "System", status: "upcoming" },
  { id: "e15", day: 30, time: "12:00", title: "Toll reimbursement deadline", module: "Disputes", category: "dispute", priority: "normal", owner: "Finance", status: "upcoming" },
  { id: "e16", day: 19, time: "11:00", title: "Training session validation", module: "Validation › Routes", category: "route", priority: "normal", owner: "HR", status: "done" },
  { id: "e17", day: 20, time: "08:00", title: "AMZL cancelled routes review", module: "Validation › Routes", category: "route", priority: "normal", owner: "Marcus J.", status: "done" },
];

const CATEGORIES: EventCategory[] = [
  "payroll",
  "timecard",
  "route",
  "invoice",
  "dispute",
  "approval",
  "lock",
];

/* ─────────────────────────  Helpers  ───────────────────────── */

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dayOfWeek(day: number) {
  return (FIRST_DAY_OFFSET + day - 1) % 7;
}

/* ─────────────────────────  Page  ───────────────────────── */

const Calendar = () => {
  const [selected, setSelected] = useState<number>(TODAY);
  const [activeFilters, setActiveFilters] = useState<Set<EventCategory>>(
    new Set(CATEGORIES)
  );
  const { data: calData } = useCalendar<{ date: string; type: string; label: string; module: string }[]>();
  const apiEvents = useMemo<CalEvent[]>(() => {
    if (!Array.isArray(calData)) return [];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return calData
      .filter((d) => {
        const dt = new Date(d.date);
        return dt.getUTCFullYear() === year && dt.getUTCMonth() === month;
      })
      .map((d, i) => {
        const dt = new Date(d.date);
        const category: EventCategory =
          d.type === "invoice"
            ? "invoice"
            : d.type === "dispute"
            ? "dispute"
            : "payroll";
        return {
          id: `api-${i}`,
          day: dt.getUTCDate(),
          time: "00:00",
          title: d.label,
          module: d.module,
          category,
          priority: "high",
          owner: "System",
          status: "upcoming",
        };
      });
  }, [calData]);

  const allEvents = useMemo(() => [...EVENTS, ...apiEvents], [apiEvents]);

  const filteredEvents = useMemo(
    () => allEvents.filter((e) => activeFilters.has(e.category)),
    [allEvents, activeFilters]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalEvent[]>();
    for (const e of filteredEvents) {
      if (!map.has(e.day)) map.set(e.day, []);
      map.get(e.day)!.push(e);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
    }
    return map;
  }, [filteredEvents]);

  const cells: (number | null)[] = useMemo(() => {
    const c: (number | null)[] = Array(FIRST_DAY_OFFSET).fill(null);
    for (let i = 1; i <= DAYS_IN_MONTH; i++) c.push(i);
    while (c.length % 7 !== 0) c.push(null);
    return c;
  }, []);

  /* Agenda buckets (compact) */
  const upcoming7 = useMemo(() => {
    return filteredEvents
      .filter((e) => e.day >= TODAY && e.day <= TODAY + 7)
      .sort((a, b) => a.day - b.day || (a.time ?? "").localeCompare(b.time ?? ""));
  }, [filteredEvents]);

  const overdue = filteredEvents.filter((e) => e.status === "overdue");
  const dueToday = filteredEvents.filter((e) => e.day === TODAY);
  const stats = {
    today: dueToday.length,
    week: upcoming7.length,
    deadlines: filteredEvents.filter(
      (e) => (e.category === "lock" || e.category === "dispute") && e.day >= TODAY
    ).length,
    done: filteredEvents.filter((e) => e.status === "done").length,
  };

  const selectedEvents = eventsByDay.get(selected) ?? [];

  const toggleFilter = (c: EventCategory) =>
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });

  return (
    <AppLayout title="Calendar" subtitle="Payroll, validation & route deadlines" showAlert={false}>
      <div className="space-y-5">
        {/* Header */}
        <PageHeader
          title="Calendar"
          subtitle="Payroll cycles, validation jobs, dispute deadlines & approvals"
          actions={
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-xl border bg-card p-1 shadow-soft">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-xs font-bold">{MONTH_LABEL}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Download className="h-4 w-4" /> Export
              </Button>
              <Button size="sm" className="h-9 gap-1.5 bg-gradient-brand text-primary-foreground">
                <Plus className="h-4 w-4" /> New Event
              </Button>
            </div>
          }
        />

        {/* Compact stat strip */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatPill label="Due Today" value={stats.today} icon={Clock} tone="warning" />
          <StatPill label="Next 7 Days" value={stats.week} icon={CalendarDays} tone="default" />
          <StatPill label="Deadlines Ahead" value={stats.deadlines} icon={AlertTriangle} tone="destructive" />
          <StatPill label="Completed" value={stats.done} icon={CheckCircle2} tone="success" />
        </div>

        {/* Filter chips */}
        <div className="aeon-soft flex flex-wrap items-center gap-1.5 px-3 py-2">
          <span className="mr-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
            Filter
          </span>
          {CATEGORIES.map((c) => {
            const meta = CATEGORY_META[c];
            const Icon = meta.icon;
            const active = activeFilters.has(c);
            return (
              <button
                key={c}
                onClick={() => toggleFilter(c)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all",
                  active ? meta.chip : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-3 w-3" />
                {meta.label}
              </button>
            );
          })}
          <span className="ml-auto text-[11px] text-muted-foreground">
            {filteredEvents.length} events
          </span>
        </div>

        {/* Calendar + Agenda */}
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          {/* Month grid */}
          <div className="aeon-card p-4">
            <div className="grid grid-cols-7 gap-1.5 border-b pb-2 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              {DAY_LABELS.map((d) => (
                <span key={d} className="text-center">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5 pt-2">
              {cells.map((d, i) => {
                if (d === null)
                  return <div key={i} className="min-h-[96px] rounded-lg border border-transparent" />;
                const dayEvents = eventsByDay.get(d) ?? [];
                const isToday = d === TODAY;
                const isSelected = d === selected;
                const isWeekend = i % 7 === 0 || i % 7 === 6;
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(d)}
                    className={cn(
                      "group relative flex min-h-[96px] flex-col rounded-lg border p-1.5 text-left transition-all",
                      "hover:border-primary/40 hover:shadow-soft",
                      isWeekend ? "bg-muted/30" : "bg-card",
                      isToday && "border-primary/60 bg-primary/[0.06]",
                      isSelected && !isToday && "border-primary/50 ring-1 ring-primary/30",
                      !isToday && !isSelected && "border-border/60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "inline-flex h-5 min-w-[20px] items-center justify-center rounded-md px-1 text-[11px] font-extrabold",
                          isToday
                            ? "bg-primary text-primary-foreground"
                            : isSelected
                            ? "text-primary"
                            : "text-foreground"
                        )}
                      >
                        {d}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[9.5px] font-semibold text-muted-foreground">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 3).map((e) => {
                        const meta = CATEGORY_META[e.category];
                        return (
                          <div
                            key={e.id}
                            className={cn(
                              "flex items-center gap-1 truncate rounded px-1 py-0.5 text-[9.5px] font-semibold",
                              meta.chip
                            )}
                            title={`${e.time ?? ""} ${e.title}`}
                          >
                            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
                            <span className="truncate">{e.title}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="px-1 text-[9.5px] font-semibold text-muted-foreground">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Compact agenda */}
          <div className="space-y-3">
            {/* Selected day card */}
            <div className="aeon-card overflow-hidden">
              <div className="flex items-center justify-between border-b bg-gradient-header px-4 py-3">
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    {selected === TODAY ? "Today" : "Selected"}
                  </div>
                  <div className="text-sm font-extrabold">
                    {DAY_LONG[dayOfWeek(selected)]}, Jun {selected}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10.5px]",
                    selectedEvents.length > 0
                      ? "border-primary/30 bg-primary/5 text-primary"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {selectedEvents.length} event{selectedEvents.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="max-h-[340px] divide-y overflow-y-auto">
                {selectedEvents.length === 0 && (
                  <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                    No events scheduled
                  </div>
                )}
                {selectedEvents.map((e) => (
                  <AgendaRow key={e.id} ev={e} />
                ))}
              </div>
            </div>

            {/* Upcoming 7 days */}
            <div className="aeon-card overflow-hidden">
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
                <div className="text-sm font-bold">Upcoming · Next 7 Days</div>
                <span className="text-[10.5px] font-semibold text-muted-foreground">
                  {upcoming7.length} items
                </span>
              </div>
              <div className="max-h-[300px] divide-y overflow-y-auto">
                {upcoming7.length === 0 && (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                    Nothing scheduled
                  </div>
                )}
                {upcoming7.map((e) => (
                  <AgendaRow key={e.id} ev={e} showDate />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="aeon-soft flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
            Legend
          </span>
          {CATEGORIES.map((c) => {
            const meta = CATEGORY_META[c];
            return (
              <span key={c} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                {meta.label}
              </span>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default Calendar;

/* ─────────────────────────  Bits  ───────────────────────── */

function StatPill({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: typeof CalendarDays;
  tone?: "default" | "success" | "warning" | "destructive";
}) {
  const toneMap = {
    default: "from-primary/10 to-secondary/5 text-primary",
    success: "from-success/10 to-success/5 text-success",
    warning: "from-warning/10 to-warning/5 text-warning",
    destructive: "from-destructive/10 to-destructive/5 text-destructive",
  } as const;
  return (
    <div className="aeon-soft flex items-center gap-3 p-3">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br", toneMap[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-lg font-extrabold leading-none tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function AgendaRow({ ev, showDate = false }: { ev: CalEvent; showDate?: boolean }) {
  const meta = CATEGORY_META[ev.category];
  const Icon = meta.icon;
  return (
    <div className="group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-primary/5">
      <div className={cn("mt-0.5 h-9 w-1 shrink-0 rounded-full", meta.bar)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate text-[12.5px] font-semibold">{ev.title}</span>
          {ev.priority === "high" && (
            <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-destructive">
              High
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-muted-foreground">
          <span className="font-semibold tabular-nums">
            {showDate ? `Jun ${ev.day} · ` : ""}
            {ev.time ?? "All day"}
          </span>
          <span>·</span>
          <span className="truncate">{ev.module}</span>
          {ev.owner && (
            <>
              <span>·</span>
              <span className="truncate">{ev.owner}</span>
            </>
          )}
        </div>
      </div>
      <span className={cn("aeon-stat-pill border self-center", meta.chip)}>{meta.label}</span>
    </div>
  );
}
