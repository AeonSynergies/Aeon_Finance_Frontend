import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, MessageSquareWarning, Send, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { useApproveTimecardDate, useSubmitTimecardDate, useTimecardDates, useTimecardPermissions } from '@/hooks/useTimecard'
import { DATE_STATUS, dateKey, dateState, formatDateTime, formatDay, isRowResolved, periodDates } from '@/lib/timecard'
import { apiError, apiErrorBody, apiStatus } from '@/services/client'
import { cn } from '@/lib/utils'
import type { DateApproval, SubmitBlockedDetails, TimecardJob, TimecardRow } from '@/types/timecard'
import { RejectDateDialog } from './RejectDateDialog'
import { ToneBadge } from './ToneBadge'

interface Props {
  job: TimecardJob
  rows: TimecardRow[]
  readOnly: boolean
  /** '' = all dates */
  selectedDate: string
  onSelectDate: (date: string) => void
  /** Row ids the backend reported as blocking a submission. */
  onBlocked: (rowIds: string[]) => void
}

export function DateApprovalStrip({ job, rows, readOnly, selectedDate, onSelectDate, onBlocked }: Props) {
  const perms = useTimecardPermissions()
  const approvals = useTimecardDates(job.id, perms.canViewApprovals)
  const submit = useSubmitTimecardDate(job.id)
  const approve = useApproveTimecardDate(job.id)
  const [rejecting, setRejecting] = useState<string | null>(null)

  const byDate = useMemo(() => {
    const m = new Map<string, DateApproval>()
    for (const a of approvals.data ?? []) m.set(dateKey(a.date), a)
    return m
  }, [approvals.data])

  const stats = useMemo(() => {
    const m = new Map<string, { total: number; open: number }>()
    for (const r of rows) {
      const s = m.get(dateKey(r.date)) ?? { total: 0, open: 0 }
      s.total++
      if (!isRowResolved(r)) s.open++
      m.set(dateKey(r.date), s)
    }
    return m
  }, [rows])

  // Rows can exist outside the job period if the payroll export covered more days — show those too.
  const dates = useMemo(() => [...new Set([...periodDates(job), ...stats.keys()])].sort(), [job, stats])

  async function doSubmit(date: string) {
    try {
      await submit.mutateAsync(date)
      onBlocked([])
      toast.success(`${formatDay(date)} submitted for approval`)
    } catch (e) {
      const blocking = (apiErrorBody(e) as Partial<SubmitBlockedDetails> | null)?.blockingRows
      if (apiStatus(e) === 409 && blocking?.length) {
        onBlocked(blocking.map((b) => b.id))
        toast.error(apiError(e), { description: 'Blocking rows are highlighted — override or fix them, then submit again.' })
      } else toast.error(apiError(e, 'Could not submit the date'))
    }
  }

  async function doApprove(date: string) {
    try {
      await approve.mutateAsync(date)
      toast.success(`${formatDay(date)} approved`)
    } catch (e) {
      toast.error(apiError(e, 'Could not approve the date'))
    }
  }

  const sel = selectedDate
  const selApproval = sel ? byDate.get(sel) : undefined
  const selState = dateState(selApproval)
  const selStats = sel ? stats.get(sel) ?? { total: 0, open: 0 } : null
  const busy = submit.isPending || approve.isPending

  return (
    <div className="space-y-3 border-b px-4 py-3">
      {approvals.isError ? (
        <ErrorState compact error={approvals.error} title="Couldn’t load date approvals" onRetry={() => approvals.refetch()} retrying={approvals.isFetching} />
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Dates">
          <DateChip active={!sel} onClick={() => onSelectDate('')} title="All dates" subtitle={`${rows.length} rows`} />
          {dates.map((d) => {
            const s = stats.get(d)
            const st = DATE_STATUS[dateState(byDate.get(d))]
            return (
              <DateChip
                key={d}
                active={sel === d}
                onClick={() => onSelectDate(d)}
                title={formatDay(d)}
                subtitle={s ? `${s.total} rows${s.open ? ` · ${s.open} open` : ''}` : 'No rows'}
                badge={
                  !perms.canViewApprovals ? undefined : approvals.isPending ? (
                    <Skeleton className="h-4 w-16" />
                  ) : (
                    <ToneBadge tone={st.tone}>{st.label}</ToneBadge>
                  )
                }
                warn={!!s?.open}
              />
            )
          })}
        </div>
      )}

      {sel && selStats && perms.canViewApprovals && !approvals.isPending && !approvals.isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2">
          <div className="text-xs">
            <span className="font-semibold">{formatDay(sel)}</span>
            <span className="text-muted-foreground">
              {' '}· {selStats.total} row(s){selStats.open > 0 && ` · ${selStats.open} still need attention`}
              {selApproval?.submittedAt && selState !== 'NOT_SUBMITTED' && ` · submitted ${formatDateTime(selApproval.submittedAt)}`}
              {selApproval?.decidedAt && selState === 'APPROVED' && ` · approved ${formatDateTime(selApproval.decidedAt)}`}
            </span>
            {selState === 'IN_PROGRESS' && selApproval?.rejectionComments && (
              <p className="mt-1 flex items-start gap-1.5 text-destructive">
                <MessageSquareWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Returned by manager: {selApproval.rejectionComments}
              </p>
            )}
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              {perms.canSubmit && (selState === 'NOT_SUBMITTED' || selState === 'IN_PROGRESS') && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => doSubmit(sel)}
                  disabled={busy || selStats.total === 0}
                  title={selStats.total === 0 ? 'No rows for this date — run validation first' : undefined}
                >
                  {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit for approval
                </Button>
              )}
              {perms.canDecide && selState === 'SENT_FOR_APPROVAL' && (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={() => setRejecting(sel)} disabled={busy}>
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                  <Button size="sm" className="gap-1.5" onClick={() => doApprove(sel)} disabled={busy}>
                    {approve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Approve
                  </Button>
                </>
              )}
              {perms.canDecide && selState !== 'SENT_FOR_APPROVAL' && selState !== 'APPROVED' && (
                <span className="text-[11px] text-muted-foreground">Waiting for the executive to submit this date.</span>
              )}
              {perms.canSubmit && selState === 'SENT_FOR_APPROVAL' && (
                <span className="text-[11px] text-muted-foreground">Waiting for manager approval.</span>
              )}
            </div>
          )}
        </div>
      )}

      <RejectDateDialog jobId={job.id} date={rejecting} onClose={() => setRejecting(null)} />
    </div>
  )
}

function DateChip({
  active, onClick, title, subtitle, badge, warn,
}: { active: boolean; onClick: () => void; title: string; subtitle: string; badge?: React.ReactNode; warn?: boolean }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex min-w-[128px] shrink-0 flex-col items-start gap-1 rounded-xl border px-3 py-2 text-left transition-colors',
        active ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'bg-card hover:bg-muted/50',
      )}
    >
      <span className="text-xs font-semibold">{title}</span>
      <span className={cn('text-[11px]', warn ? 'text-warning-foreground' : 'text-muted-foreground')}>{subtitle}</span>
      {badge}
    </button>
  )
}
