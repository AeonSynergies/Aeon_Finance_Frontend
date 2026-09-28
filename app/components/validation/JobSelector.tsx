import { Plus, Trash2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import type { ModuleJob } from "@/hooks/useModuleJobs"

interface JobSelectorProps {
  jobs: ModuleJob[]
  selectedJobId: string
  onSelect: (id: string) => void
  onCreateJob: () => void
  onDeleteJob?: () => void
  loading?: boolean
}

function periodLabel(job: ModuleJob): string {
  const fmt = (iso: string) => {
    const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })
  }
  return `${job.jobId} · ${fmt(job.periodStart)}–${fmt(job.periodEnd)}${
    job.status === "LOCKED" ? " (Locked)" : ""
  }`
}

/** Shared job dropdown + "New Job" button used across all validation modules. */
export function JobSelector({
  jobs,
  selectedJobId,
  onSelect,
  onCreateJob,
  onDeleteJob,
  loading,
}: JobSelectorProps) {
  const selected = jobs.find((j) => j.id === selectedJobId)
  const canDelete = !!onDeleteJob && !!selected && selected.status !== "LOCKED"
  return (
    <div className="flex items-center gap-2">
      <Select value={selectedJobId} onValueChange={onSelect} disabled={loading}>
        <SelectTrigger className="h-8 w-[280px] rounded-lg border-border/70 bg-card text-xs shadow-soft">
          <SelectValue placeholder={loading ? "Loading jobs..." : "Select job..."} />
        </SelectTrigger>
        <SelectContent>
          {jobs.length === 0 ? (
            <SelectItem value="__none__" disabled className="text-xs text-muted-foreground">
              No jobs yet — create one first
            </SelectItem>
          ) : (
            jobs.map((j) => (
              <SelectItem key={j.id} value={j.id} className="text-xs">
                {periodLabel(j)}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        onClick={onCreateJob}
        className="h-8 gap-1.5 rounded-lg text-xs font-semibold"
      >
        <Plus className="h-3.5 w-3.5" /> New Job
      </Button>
      {canDelete && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onDeleteJob}
          className="h-8 gap-1 rounded-lg border border-destructive/30 text-xs font-semibold text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      )}
    </div>
  )
}
