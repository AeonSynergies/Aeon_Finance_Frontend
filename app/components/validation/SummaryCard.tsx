import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SummaryCardProps {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon: LucideIcon;
  tone?: "default" | "danger" | "warning" | "info" | "success";
}

const toneMap: Record<NonNullable<SummaryCardProps["tone"]>, string> = {
  default: "from-primary/15 to-secondary/10 text-primary",
  danger: "from-destructive/15 to-destructive/5 text-destructive",
  warning: "from-warning/20 to-warning/5 text-warning-foreground",
  info: "from-accent/20 to-accent/5 text-accent",
  success: "from-success/15 to-success/5 text-success",
};

export function SummaryCard({ label, value, delta, trend = "flat", icon: Icon, tone = "default" }: SummaryCardProps) {
  return (
    <div className="aeon-card group p-4 transition-all hover:-translate-y-0.5 hover:shadow-glow">
      <div className="flex items-start justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        {delta && (
          <span
            className={cn(
              "aeon-stat-pill",
              trend === "up" && "bg-success/10 text-success",
              trend === "down" && "bg-destructive/10 text-destructive",
              trend === "flat" && "bg-muted text-muted-foreground"
            )}
          >
            {trend === "up" ? <TrendingUp className="h-3 w-3" /> : trend === "down" ? <TrendingDown className="h-3 w-3" /> : null}
            {delta}
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-2xl font-extrabold tracking-tight">{value}</div>
        <div className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
