import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
  Lock,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  ApprovalStatus,
  ValidationDisputeStatus,
  ValidationStatus,
  VendorDisputeStatus,
} from "./shared";

const VAL_MAP: Record<ValidationStatus, { chip: string; icon: typeof CheckCircle2 }> = {
  Validated: { chip: "bg-success/10 text-success border-success/25", icon: CheckCircle2 },
  "Need Manual Validation": { chip: "bg-destructive/10 text-destructive border-destructive/25", icon: FileWarning },
  "Need Dispute": { chip: "bg-warning/10 text-warning-foreground border-warning/30", icon: AlertTriangle },
  "Pending Validation": { chip: "bg-muted text-muted-foreground border-border", icon: Clock },
  "Sent for Approval": { chip: "bg-info/10 text-info border-info/25", icon: Clock },
  Locked: { chip: "bg-muted text-muted-foreground border-border", icon: Lock },
};

export function ValidationStatusChip({ status }: { status: ValidationStatus }) {
  const m = VAL_MAP[status];
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap", m.chip)}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

const APPR_MAP: Record<ApprovalStatus, { chip: string; icon: typeof CheckCircle2 }> = {
  Pending: { chip: "bg-muted text-muted-foreground border-border", icon: Clock },
  Approved: { chip: "bg-success/10 text-success border-success/25", icon: ShieldCheck },
  Rejected: { chip: "bg-destructive/10 text-destructive border-destructive/25", icon: XCircle },
};

export function ApprovalStatusChip({ status }: { status: ApprovalStatus }) {
  const m = APPR_MAP[status];
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap", m.chip)}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

const VAL_DISPUTE_MAP: Record<ValidationDisputeStatus, string> = {
  "Need Dispute": "bg-warning/10 text-warning-foreground border-warning/30",
  "No Dispute": "bg-muted text-muted-foreground border-border",
  "Pending Validation": "bg-info/10 text-info border-info/25",
};

export function ValidationDisputeChip({ status }: { status: ValidationDisputeStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap", VAL_DISPUTE_MAP[status])}>
      {status}
    </span>
  );
}

const VENDOR_DISPUTE_MAP: Record<VendorDisputeStatus, string> = {
  "Yet to Dispute": "bg-muted text-muted-foreground border-border",
  Submitted: "bg-info/10 text-info border-info/25",
  "Under Review": "bg-info/10 text-info border-info/25",
  Accepted: "bg-success/10 text-success border-success/25",
  "Partially Accepted": "bg-accent/10 text-accent border-accent/25",
  Rejected: "bg-destructive/10 text-destructive border-destructive/25",
};

export function VendorDisputeChip({ status }: { status: VendorDisputeStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap", VENDOR_DISPUTE_MAP[status])}>
      {status}
    </span>
  );
}

export function OverrideButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="h-7 gap-1 px-2 text-[11px] border-warning/40 text-warning-foreground hover:bg-warning/10"
    >
      <ShieldAlert className="h-3 w-3" /> Override
    </Button>
  );
}

export function NotesCell({ text, muted = "—" }: { text?: string; muted?: string }) {
  if (!text) return <span className="text-[11px] text-muted-foreground">{muted}</span>;
  return (
    <span className="block max-w-[240px] truncate text-[11.5px]" title={text}>
      {text}
    </span>
  );
}

export function EditableNotesCell({
  value,
  editing,
  onChange,
  placeholder = "—",
  width = 200,
}: {
  value?: string;
  editing: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: number;
}) {
  if (!editing) return <NotesCell text={value} muted={placeholder} />;
  return (
    <input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      placeholder={placeholder}
      style={{ width }}
      className="h-7 rounded border bg-background px-1.5 text-[11.5px] focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );
}
