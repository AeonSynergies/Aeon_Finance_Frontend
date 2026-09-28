import { useMemo, useState } from "react";
import { Filter, Pin, PinOff, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ColumnFilterProps {
  columnKey: string;
  values: string[];
  selected: Set<string>;
  onApply: (values: Set<string>) => void;
  onReset: () => void;
  frozen: boolean;
  onToggleFreeze: () => void;
  active: boolean;
}

export function ColumnFilter({
  values,
  selected,
  onApply,
  onReset,
  frozen,
  onToggleFreeze,
  active,
}: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(new Set(selected));
  const [q, setQ] = useState("");

  const unique = useMemo(
    () => Array.from(new Set(values.filter(Boolean))).sort(),
    [values]
  );
  const filtered = useMemo(
    () => unique.filter((v) => v.toLowerCase().includes(q.toLowerCase())),
    [unique, q]
  );

  const toggle = (v: string) => {
    setDraft((p) => {
      const n = new Set(p);
      n.has(v) ? n.delete(v) : n.add(v);
      return n;
    });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setDraft(new Set(selected));
      }}
    >
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "ml-1 inline-flex h-4 w-4 items-center justify-center rounded transition-colors",
            active
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
          )}
          aria-label="Filter column"
        >
          <Filter className="h-2.5 w-2.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-60 p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-[11px] font-bold uppercase tracking-wider">Filter</span>
          <button
            onClick={onToggleFreeze}
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold",
              frozen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
            title={frozen ? "Unfreeze column" : "Freeze till here"}
          >
            {frozen ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
            {frozen ? "Unfreeze" : "Freeze"}
          </button>
        </div>
        <div className="border-b px-2 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="h-7 pl-7 text-xs"
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto px-2 py-1">
          {filtered.length === 0 && (
            <div className="px-2 py-3 text-center text-[11px] text-muted-foreground">No values</div>
          )}
          {filtered.map((v) => (
            <label
              key={v}
              className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted"
            >
              <Checkbox
                checked={draft.has(v)}
                onCheckedChange={() => toggle(v)}
              />
              <span className="truncate">{v || "(empty)"}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-2 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-[11px]"
            onClick={() => {
              setDraft(new Set());
              onReset();
              setOpen(false);
            }}
          >
            <X className="h-3 w-3" /> Reset
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => {
              onApply(draft);
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
