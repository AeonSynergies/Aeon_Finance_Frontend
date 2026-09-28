import { useState } from "react";
import { CalendarIcon, FileSpreadsheet, UploadCloud, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fileTypes = [
  { name: "Payroll Report", desc: "ADP / Paychex export" },
  { name: "Amazon Activity Report", desc: "On-Road system export" },
  { name: "Break Report", desc: "Mentor / Lytx feed" },
  { name: "Employee Master", desc: "Roster CSV" },
  { name: "Physical Timesheet", desc: "Manual paper sheet" },
];

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const [dragOver, setDragOver] = useState(false);
  const [activeType, setActiveType] = useState(fileTypes[0].name);
  const [tab, setTab] = useState("upload");

  const handleSubmit = () => {
    toast.success("Job created", { description: "The new job is ready for validation." });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl p-0">
        <div className="border-b bg-gradient-header px-6 pb-4 pt-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Upload payroll data</DialogTitle>
            <DialogDescription>
              Drop weekly exports to begin a new validation cycle.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 pt-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="upload" className="rounded-lg">Upload Files</TabsTrigger>
              <TabsTrigger value="job" className="rounded-lg">Create New Job</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {fileTypes.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => setActiveType(f.name)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      activeType === f.name
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  toast.success(`${activeType} uploaded`);
                }}
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-gradient-card px-6 py-10 text-center transition-all",
                  dragOver ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow">
                  <UploadCloud className="h-7 w-7 text-primary-foreground" />
                </div>
                <div className="text-sm font-semibold">
                  Drop your <span className="text-primary">{activeType}</span> here
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  XLSX, XLS, or CSV up to 25 MB
                </p>
                <Button
                  variant="outline"
                  className="mt-4 h-9 gap-2 rounded-xl"
                  onClick={() => toast.success(`${activeType} uploaded`)}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Browse files
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Already uploaded:</span>
                <Badge variant="outline" className="border-success/30 bg-success/10 text-success">Payroll Report ✓</Badge>
                <Badge variant="outline" className="border-success/30 bg-success/10 text-success">Amazon Activity ✓</Badge>
                <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">Break Report (pending)</Badge>
              </div>
            </TabsContent>

            <TabsContent value="job" className="mt-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Payroll period">
                  <div className="relative">
                    <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="h-10 rounded-xl pl-9" placeholder="Apr 27 – May 03, 2026" />
                  </div>
                </Field>
                <Field label="Payroll process date">
                  <Input type="date" className="h-10 rounded-xl" />
                </Field>
                <Field label="Pay date">
                  <Input type="date" className="h-10 rounded-xl" />
                </Field>
                <Field label="Payroll cycle">
                  <Select defaultValue="weekly">
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Button
                onClick={handleSubmit}
                className="mt-6 h-11 w-full gap-2 rounded-xl bg-gradient-brand font-semibold shadow-glow"
              >
                <Plus className="h-4 w-4" />
                Create Job
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
