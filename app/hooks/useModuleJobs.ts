import { useEffect, useMemo, useState } from "react"
import { useJobs } from "@/hooks/useJobs"
import type { Job } from "@/types"

export type ModuleJob = Pick<Job, "id" | "jobId" | "status" | "periodStart" | "periodEnd" | "frequency">

/**
 * Jobs for a validation module, keeping a selected job (defaulting to the
 * most-recent non-locked job). Shared by every module page so the job dropdown
 * always reflects the (mock) API.
 */
export function useModuleJobs(module: string) {
  const query = useJobs({ module })
  const [selectedJobId, setSelectedJobId] = useState<string>("")

  const jobs = useMemo(
    () =>
      [...(query.data ?? [])].sort(
        (a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
      ),
    [query.data]
  )

  // Auto-select the most-recent non-locked job (fallback: newest).
  useEffect(() => {
    setSelectedJobId((cur) => {
      if (cur && jobs.some((j) => j.id === cur)) return cur
      const first = jobs.find((j) => j.status !== "LOCKED") ?? jobs[0]
      return first?.id ?? ""
    })
  }, [jobs])

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null
  const readOnly = selectedJob?.status === "LOCKED"

  return {
    jobs,
    selectedJobId,
    setSelectedJobId,
    selectedJob,
    readOnly,
    loading: query.isLoading,
    reload: () => void query.refetch(),
  }
}
