import { Check, ShieldCheck, Eye, Lock, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { key: "upload", label: "Upload", icon: UploadCloud },
  { key: "validate", label: "Validate", icon: ShieldCheck },
  { key: "review", label: "Review", icon: Eye },
  { key: "approve", label: "Approve", icon: Check },
  { key: "lock", label: "Lock", icon: Lock },
];

interface StepIndicatorProps {
  current?: number; // index of active step
}

export function StepIndicator({ current = 1 }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = s.icon;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-all",
                done && "border-success/30 bg-success/10 text-success",
                active && "border-primary bg-gradient-brand text-primary-foreground shadow-glow",
                !done && !active && "border-border bg-card text-muted-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{s.label}</span>
              {done && <Check className="h-3 w-3" />}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-px w-6 md:w-10",
                  i < current ? "bg-success/40" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
