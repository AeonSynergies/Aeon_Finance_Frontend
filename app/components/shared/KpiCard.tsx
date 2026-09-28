import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  hint?: string;
  icon?: ReactNode;
  accent?: "primary" | "secondary" | "accent" | "success" | "warning" | "destructive";
}

const accentMap: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/15 text-secondary",
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/15 text-destructive",
};

export function KpiCard({ label, value, delta, hint, icon, accent = "primary" }: KpiCardProps) {
  return (
    <div className="aeon-card flex flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {icon && (
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", accentMap[accent])}>
            {icon}
          </div>
        )}
      </div>
      <div className="text-2xl font-extrabold tracking-tight text-foreground">{value}</div>
      <div className="flex items-center justify-between text-xs">
        {delta ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
              delta.positive
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {delta.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta.value}
          </span>
        ) : (
          <span />
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
