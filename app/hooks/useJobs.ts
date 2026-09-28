// Job queries + mutations (lists, detail, rows, documents, create/delete).
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Job } from '@/types'
import { jobsService, type CreateJobInput } from '@/services/jobs.service'
import { qk } from './queryKeys'

export function useJobs(params: { module?: string; status?: string } = {}, enabled = true) {
  return useQuery({ queryKey: qk.jobs.list(params), queryFn: () => jobsService.list(params), enabled })
}

export function useJob(id: string | undefined) {
  return useQuery({ queryKey: qk.jobs.detail(id ?? ''), queryFn: () => jobsService.get(id!), enabled: !!id })
}

export function useJobRows(id: string | undefined, rowType?: string) {
  return useQuery({ queryKey: qk.jobs.rows(id ?? '', rowType), queryFn: () => jobsService.rows(id!, rowType), enabled: !!id,
    // Keep the previous job's rows on screen while the next job loads (matches old behaviour).
    placeholderData: keepPreviousData })
}

export function useJobDocuments(id: string | undefined) {
  return useQuery({ queryKey: qk.jobs.documents(id ?? ''), queryFn: () => jobsService.documents(id!), enabled: !!id })
}

export function usePayrollSummary<T = unknown>(id: string | undefined) {
  return useQuery({ queryKey: qk.jobs.payrollSummary(id ?? ''), queryFn: () => jobsService.payrollSummary<T>(id!), enabled: !!id })
}

/** Invalidate everything job-related (lists, rows, docs). Cheap with mock data. */
export function useInvalidateJobs() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: qk.jobs.all })
}

// Create/delete only refresh job lists: other cached rows are untouched, so
// pages keep their local (optimistic) row edits.
export function useCreateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateJobInput) => jobsService.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs', 'list'] }),
  })
}

export function useDeleteJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jobsService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs', 'list'] }),
  })
}

/** One jobs list query per param set (shares cache with useJobs). */
export function useJobLists(paramsList: { module?: string; status?: string }[]) {
  return useQueries({
    queries: paramsList.map((params) => ({ queryKey: qk.jobs.list(params), queryFn: () => jobsService.list(params) })),
  })
}

/** Payroll summaries for the given jobs (shares cache with usePayrollSummary). */
export function usePayrollSummaries<T = unknown>(jobs: Pick<Job, 'id'>[]) {
  return useQueries({
    queries: jobs.map((j) => ({
      queryKey: qk.jobs.payrollSummary(j.id),
      queryFn: () => jobsService.payrollSummary<T>(j.id),
    })),
  })
}

export function useUpdateDocument(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ docId, body }: { docId: string; body: Record<string, unknown> }) =>
      jobsService.updateDocument(jobId, docId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.jobs.documents(jobId) }),
  })
}

/** Imperative, cached job-list fetch (for event handlers); shares cache with useJobs. */
export function useFetchJobs() {
  const qc = useQueryClient()
  return (module: string) =>
    qc.fetchQuery({ queryKey: qk.jobs.list({ module }), queryFn: () => jobsService.list({ module }) })
}
