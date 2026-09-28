import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { timecardService } from '@/services/timecard.service'
import { usePermissions } from './useAuth'
import type { CreateTimecardJobInput, OverrideRowInput, TimecardRow, UploadDocType } from '@/types/timecard'
import { qk } from './queryKeys'

const k = qk.timecard

/* ── Permissions (from the role's permission map; the API enforces the same) ── */
export function useTimecardPermissions() {
  const { can } = usePermissions()
  return {
    canViewJobs: can('JOBS', 'read'),
    canCreateJob: can('JOBS', 'write'),
    canLock: can('JOBS', 'edit'),
    canViewUploads: can('UPLOADS', 'read'),
    canUpload: can('UPLOADS', 'write'),
    canViewRows: can('VALIDATION', 'read'),
    canValidate: can('VALIDATION', 'write'),
    canOverride: can('VALIDATION', 'edit'),
    canViewApprovals: can('APPROVALS', 'read'),
    canSubmit: can('APPROVALS', 'write'),
    canDecide: can('APPROVALS', 'edit'),
    canViewAudit: can('AUDIT', 'read'),
  }
}

/* ── Queries ── */
export function useTimecardJobs(enabled = true) {
  return useQuery({ queryKey: k.jobs, queryFn: timecardService.listJobs, enabled })
}

export function useTimecardUploads(jobId: string | undefined, enabled = true) {
  return useQuery({ queryKey: k.uploads(jobId ?? ''), queryFn: () => timecardService.listUploads(jobId!), enabled: !!jobId && enabled })
}

export function useTimecardRows(jobId: string | undefined, params: { date?: string; status?: string } = {}, enabled = true) {
  return useQuery({
    queryKey: k.rows(jobId ?? '', params),
    queryFn: () => timecardService.listRows(jobId!, params),
    enabled: !!jobId && enabled,
    placeholderData: keepPreviousData, // keep the table while filters change
  })
}

export function useTimecardDates(jobId: string | undefined, enabled = true) {
  return useQuery({ queryKey: k.dates(jobId ?? ''), queryFn: () => timecardService.listDates(jobId!), enabled: !!jobId && enabled })
}

export function useTimecardAudit(jobId: string | undefined, enabled = true) {
  return useQuery({ queryKey: k.audit(jobId ?? ''), queryFn: () => timecardService.listAudit(jobId!), enabled: !!jobId && enabled })
}

/* ── Mutations ── */
function useInvalidate() {
  const qc = useQueryClient()
  return (...keys: readonly (readonly unknown[])[]) => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })))
}

export function useCreateTimecardJob() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: CreateTimecardJobInput) => timecardService.createJob(body),
    onSuccess: () => invalidate(k.jobs),
  })
}

export function useLockTimecardJob(jobId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: () => timecardService.lockJob(jobId),
    onSuccess: () => invalidate(k.jobs, k.job(jobId), k.audit(jobId)),
  })
}

export function useUploadTimecardDocument(jobId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { file: File; docType: UploadDocType; date?: string }) => timecardService.upload(jobId, input),
    onSuccess: () => invalidate(k.uploads(jobId), k.audit(jobId)),
  })
}

export function useValidateTimecardJob(jobId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: () => timecardService.validate(jobId),
    onSuccess: () => invalidate(k.rowsAll(jobId), k.audit(jobId)),
  })
}

export function useOverrideTimecardRow(jobId: string) {
  const qc = useQueryClient()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ rowId, ...body }: OverrideRowInput & { rowId: string }) => timecardService.overrideRow(jobId, rowId, body),
    onSuccess: (updated) => {
      // Patch the row in every cached list right away, then refetch in the background.
      qc.setQueriesData<TimecardRow[]>({ queryKey: k.rowsAll(jobId) }, (rows) =>
        rows?.map((r) => (r.id === updated.id ? updated : r)),
      )
      return invalidate(k.rowsAll(jobId), k.audit(jobId))
    },
  })
}

/** Submit / approve / reject all change the date, the job's computed status and row approval flags. */
function useDateDecision<V>(jobId: string, fn: (vars: V) => Promise<unknown>) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidate(k.dates(jobId), k.job(jobId), k.jobs, k.rowsAll(jobId), k.audit(jobId)),
  })
}

export const useSubmitTimecardDate = (jobId: string) =>
  useDateDecision(jobId, (date: string) => timecardService.submitDate(jobId, date))

export const useApproveTimecardDate = (jobId: string) =>
  useDateDecision(jobId, (date: string) => timecardService.approveDate(jobId, date))

export const useRejectTimecardDate = (jobId: string) =>
  useDateDecision(jobId, ({ date, comments }: { date: string; comments: string }) =>
    timecardService.rejectDate(jobId, date, comments),
  )
