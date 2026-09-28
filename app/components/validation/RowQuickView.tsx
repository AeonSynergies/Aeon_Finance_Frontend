import { useState, type ReactNode } from "react";
import { ClipboardList, FileText, History, ShieldCheck } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { AuditEntry, ApprovalMeta, OverrideMeta, ValidationStatus } from "./shared";
import { ApprovalStatusChip, ValidationStatusChip } from "./StatusCells";

export interface QuickViewTab {
  key: string;
  label: string;
  icon?: typeof FileText;
  content: ReactNode;
}

interface RowQuickViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  validationStatus?: ValidationStatus;
  approval?: ApprovalMeta;
  override?: OverrideMeta;
  audit?: AuditEntry[];
  /** Module-specific tabs rendered BEFORE the common tabs */
  extraTabs?: QuickViewTab[];
  /** Module-specific Details body (rendered inside Details tab) */
  detailsBody?: ReactNode;
  /** Module-specific Validation body */
  validationBody?: ReactNode;
}

export function RowQuickView({
  open,
  onOpenChange,
  title,
  subtitle,
  validationStatus,
  approval,
  override,
  audit,
  extraTabs = [],
  detailsBody,
  validationBody,
}: RowQuickViewProps) {
  const commonTabs: QuickViewTab[] = [
    {
      key: "details",
      label: "Details",
      icon: FileText,
      content: detailsBody ?? <Empty label="No details" />,
    },
    {
      key: "validation",
      label: "Validation",
      icon: ClipboardList,
      content: (
        <div className="space-y-3">
          <Pair label="Status">{validationStatus ? <ValidationStatusChip status={validationStatus} /> : "—"}</Pair>
          <Pair label="Validation Notes">{validationBody ?? <Empty label="No validation notes" />}</Pair>
          <Pair label="Override Notes">
            {override?.notes ? (
              <div className="rounded-md border bg-warning/5 p-2 text-[12px]">
                <div>{override.notes}</div>
                <div className="mt-1 text-[10.5px] text-muted-foreground">
                  by {override.by} · {new Date(override.at).toLocaleString()}
                </div>
              </div>
            ) : (
              <Empty label="No overrides" />
            )}
          </Pair>
        </div>
      ),
    },
    {
      key: "approval",
      label: "Approval",
      icon: ShieldCheck,
      content: (
        <div className="space-y-3">
          <Pair label="Approval Status">
            <ApprovalStatusChip status={approval?.status ?? "Pending"} />
          </Pair>
          <Pair label="Approver Notes">
            {approval?.approverNotes ? (
              <div className="rounded-md border bg-muted/30 p-2 text-[12px]">{approval.approverNotes}</div>
            ) : (
              <Empty label="No approver notes" />
            )}
          </Pair>
          {approval?.by && (
            <Pair label="Approved/Rejected by">
              <span className="text-[12px]">
                {approval.by} · {approval.at ? new Date(approval.at).toLocaleString() : ""}
              </span>
            </Pair>
          )}
        </div>
      ),
    },
    {
      key: "audit",
      label: "Audit Trail",
      icon: History,
      content: (
        <div className="space-y-2">
          {(audit ?? []).length === 0 ? (
            <Empty label="No activity recorded" />
          ) : (
            audit!.map((a) => (
              <div key={a.id} className="rounded-md border bg-muted/20 p-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{a.action}</span>
                  <span className="text-[10.5px] text-muted-foreground">{new Date(a.at).toLocaleString()}</span>
                </div>
                <div className="text-[11.5px] text-muted-foreground">{a.detail}</div>
                <div className="mt-0.5 text-[10.5px] text-muted-foreground">by {a.who}</div>
              </div>
            ))
          )}
        </div>
      ),
    },
  ];

  const tabs = [...extraTabs, ...commonTabs];
  const [active, setActive] = useState<string>(tabs[0]?.key ?? "details");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b bg-muted/30 p-4">
          <SheetTitle className="text-base">{title}</SheetTitle>
          {subtitle && <SheetDescription className="text-xs">{subtitle}</SheetDescription>}
        </SheetHeader>

        <div className="flex gap-1 overflow-x-auto border-b px-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[11.5px] font-semibold border-b-2 -mb-px transition-colors",
                  active === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-4">{tabs.find((t) => t.key === active)?.content}</div>
      </SheetContent>
    </Sheet>
  );
}

function Pair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[12px]">{children}</div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <span className="text-[11.5px] italic text-muted-foreground">{label}</span>;
}
