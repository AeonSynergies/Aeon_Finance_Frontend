import { useEffect, useState } from "react";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, PageTabs } from "@/components/shared/PageTabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRateCards, useUpdateRateCard } from "@/hooks/useRateCards";
import type { RateCard } from "@/types";

const TABS = [
  { key: "PAYROLL", label: "Payroll" },
  { key: "ROUTES", label: "Routes" },
  { key: "FLEET", label: "Fleet" },
  { key: "INSURANCE", label: "Insurance" },
  { key: "VENDOR", label: "Vendor" },
];

function fmtRate(value: number | null, unit: string): string {
  if (value == null) return "—";
  return `$${value.toFixed(2)} / ${unit}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

const RateCardPage = () => {
  const [tab, setTab] = useState(TABS[0].key);
  const { data, isLoading: loading, error } = useRateCards(tab);
  const rows = error || !Array.isArray(data) ? [] : data;
  const updateRateCard = useUpdateRateCard();
  const busyId = updateRateCard.isPending ? updateRateCard.variables?.id ?? null : null;

  useEffect(() => {
    if (error) toast.error("Failed to load rate cards");
  }, [error]);

  const deactivate = (rc: RateCard) =>
    updateRateCard.mutate(
      { id: rc.id, body: { isActive: false } },
      {
        // Invalidation refetches the list; the inactive card drops out server-side.
        onSuccess: () => toast.success("Rate card deactivated", { description: rc.name }),
        onError: () => toast.error("Failed to deactivate rate card", { description: rc.name }),
      },
    );

  return (
    <AppLayout title="Rate Card">
      <div className="space-y-6">
        <PageHeader
          title="Rate Card"
          subtitle="Manage operational pricing structures used across validation"
          actions={
            <Button className="h-9 gap-2 rounded-xl bg-gradient-brand text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95">
              <Plus className="h-3.5 w-3.5" /> New Rate
            </Button>
          }
        />

        <PageTabs tabs={TABS} active={tab} onChange={setTab} />

        <div className="aeon-card overflow-hidden p-0">
          <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_0.6fr_auto] gap-3 border-b bg-muted/40 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Code</span>
            <span>Name</span>
            <span>Base</span>
            <span>Surge</span>
            <span>Effective</span>
            <span>Version</span>
            <span className="text-right">Actions</span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading rate cards…</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No rate cards found for this module.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_0.6fr_auto] items-center gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-muted/30"
                >
                  <span className="inline-flex items-center gap-2 font-bold text-primary">
                    <Receipt className="h-4 w-4" />
                    {r.code}
                  </span>
                  <span className="font-semibold">{r.name}</span>
                  <span>{fmtRate(r.baseRate, r.unit)}</span>
                  <span>{fmtRate(r.surgeRate, r.unit)}</span>
                  <span className="text-muted-foreground">{fmtDate(r.effectiveDate)}</span>
                  <span
                    className={cn(
                      "inline-flex w-fit items-center rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground"
                    )}
                  >
                    {r.version}
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deactivate(r)}
                      disabled={busyId === r.id}
                      className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default RateCardPage;
