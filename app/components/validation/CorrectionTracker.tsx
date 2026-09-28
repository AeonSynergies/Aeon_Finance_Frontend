import { CheckCircle2, FileWarning, Inbox, Mail, Send, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const issues = [
  { driver: "Marcus Johnson", type: "CAP exceeded", date: "Apr 22", attempts: 2, last: "2h ago", status: "Pending", escalated: true },
  { driver: "Diego Rivera", type: "Missing app data", date: "Apr 23", attempts: 1, last: "5h ago", status: "Pending", escalated: false },
  { driver: "Carlos Mendoza", type: "Multiple violations", date: "Apr 25", attempts: 3, last: "1h ago", status: "Escalated", escalated: true },
  { driver: "Aisha Brown", type: "OT > scheduled", date: "Apr 23", attempts: 1, last: "Yesterday", status: "Corrected", escalated: false },
];

const tabs = [
  { key: "all", label: "All Issues", count: 12, icon: Inbox },
  { key: "pending", label: "Pending", count: 7, icon: FileWarning },
  { key: "corrected", label: "Corrected", count: 4, icon: CheckCircle2 },
  { key: "escalated", label: "Escalated", count: 1, icon: ShieldAlert },
];

export function CorrectionTracker() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="aeon-card flex flex-wrap items-center gap-2 p-2">
        {tabs.map((t, i) => {
          const Icon = t.icon;
          const active = i === 1;
          return (
            <button
              key={t.key}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                active ? "bg-gradient-brand text-primary-foreground shadow-glow" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-muted"}`}>{t.count}</span>
            </button>
          );
        })}
      </div>

      <div className="aeon-card overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10 border-b bg-gradient-header text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
            <tr>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Issue Type</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Attempts</th>
              <th className="px-4 py-3">Last Contacted</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Escalation</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {issues.map((i) => (
              <tr key={i.driver} className="border-b border-border/60 hover:bg-muted/40">
                <td className="px-4 py-3 font-semibold">{i.driver}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.type}</td>
                <td className="px-4 py-3">{i.date}</td>
                <td className="px-4 py-3 font-bold">{i.attempts}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.last}</td>
                <td className="px-4 py-3">
                  <Badge
                    className={
                      i.status === "Pending"
                        ? "bg-warning/15 text-warning-foreground"
                        : i.status === "Escalated"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-success/15 text-success"
                    }
                  >
                    {i.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {i.escalated ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" className="h-7 gap-1 rounded-lg text-[11px]">
                    <Mail className="h-3 w-3" /> Contact
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
