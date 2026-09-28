import { CheckCircle2, Pencil, Send, ShieldAlert, Trash2, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkActionToolbarProps {
  count: number;
  onClear: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSubmit?: () => void;
  onSendException?: () => void;
  onOverride?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  /** Show approver-only actions (Approve / Reject) */
  isApprover?: boolean;
  /** Role-gate for approver-only actions (Approve / Reject). Defaults to false. */
  canApprove?: boolean;
  className?: string;
}

/**
 * Sticky bulk action toolbar shown above any validation table
 * when one or more rows are selected.
 */
export function BulkActionToolbar({
  count,
  onClear,
  onEdit,
  onDelete,
  onSubmit,
  onSendException,
  onOverride,
  onApprove,
  onReject,
  isApprover,
  canApprove = false,
  className,
}: BulkActionToolbarProps) {
  if (count === 0) return null;
  const showApprover = canApprove || isApprover;
  return (
    <div
      className={cn(
        "sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 bg-primary/5 px-3 py-2 backdrop-blur",
        className
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
        <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
          {count}
        </span>
        row{count > 1 ? "s" : ""} selected
        <button
          onClick={onClear}
          className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {onEdit && (
          <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]" onClick={onEdit}>
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        )}
        {onSendException && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={onSendException}
          >
            <Send className="h-3 w-3" /> Send Exceptions
          </Button>
        )}
        {onOverride && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-[11px] border-warning/40 text-warning-foreground hover:bg-warning/10"
            onClick={onOverride}
          >
            <ShieldAlert className="h-3 w-3" /> Override
          </Button>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-[11px] border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
        )}
        {onSubmit && (
          <Button
            size="sm"
            className="h-7 gap-1 bg-gradient-brand px-2 text-[11px] text-primary-foreground"
            onClick={onSubmit}
          >
            <Send className="h-3 w-3" /> Submit for Approval
          </Button>
        )}
        {showApprover && onApprove && (
          <Button
            size="sm"
            className="h-7 gap-1 bg-success px-2 text-[11px] text-success-foreground hover:bg-success/90"
            onClick={onApprove}
          >
            <CheckCircle2 className="h-3 w-3" /> Approve
          </Button>
        )}
        {showApprover && onReject && (
          <Button
            size="sm"
            variant="destructive"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={onReject}
          >
            <XCircle className="h-3 w-3" /> Reject
          </Button>
        )}
      </div>
    </div>
  );
}
