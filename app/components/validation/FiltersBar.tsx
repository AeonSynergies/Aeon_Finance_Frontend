import { Calendar, ChevronDown, Download, Filter, MessageSquare, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FiltersBarProps {
  selectedCount: number;
}

export function FiltersBar({ selectedCount }: FiltersBarProps) {
  return (
    <div className="aeon-card flex flex-wrap items-center gap-2 p-3">
      <div className="flex items-center gap-1.5 pl-1 text-xs font-semibold text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        Filters
      </div>

      <div className="relative">
        <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Apr 20 – Apr 26"
          className="h-8 w-40 rounded-lg border-border/70 bg-card pl-8 text-xs"
        />
      </div>

      <Select defaultValue="all">
        <SelectTrigger className="h-8 w-32 rounded-lg text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="error">Errors</SelectItem>
          <SelectItem value="warning">Warnings</SelectItem>
          <SelectItem value="valid">Valid</SelectItem>
          <SelectItem value="overridden">Overridden</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs">
        <Shield className="h-3.5 w-3.5 text-destructive" />
        CAP
        <ChevronDown className="h-3 w-3" />
      </Button>
      <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs">
        <Zap className="h-3.5 w-3.5 text-info" />
        Overtime
        <ChevronDown className="h-3 w-3" />
      </Button>

      <Select defaultValue="any">
        <SelectTrigger className="h-8 w-32 rounded-lg text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any priority</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-2">
        {selectedCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {selectedCount} selected
          </div>
        )}
        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs">
          <MessageSquare className="h-3.5 w-3.5" />
          Bulk message
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs">
          Bulk override
        </Button>
        <Button size="sm" className="h-8 gap-1.5 rounded-lg bg-gradient-brand text-xs font-semibold text-primary-foreground">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>
    </div>
  );
}
