import { History } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { useTimecardAudit } from '@/hooks/useTimecard'
import { formatDateTime, type Tone } from '@/lib/timecard'
import { useSession } from '@/stores/auth'
import { ToneBadge } from './ToneBadge'

const ACTION_TONE: Record<string, Tone> = {
  UPLOAD: 'info', OVERRIDE: 'warning', SUBMIT: 'primary', APPROVE: 'success', REJECT: 'danger', LOCK: 'muted',
}

export function AuditTrail({ jobId }: { jobId: string }) {
  const audit = useTimecardAudit(jobId)
  const me = useSession().data?.user.id

  if (audit.isPending) {
    return (
      <div className="space-y-3 p-4" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    )
  }
  if (audit.isError) return <ErrorState error={audit.error} onRetry={() => audit.refetch()} retrying={audit.isFetching} />
  if (audit.data.length === 0) {
    return <EmptyState icon={History} title="No activity yet" description="Uploads, overrides, submissions and approvals will appear here." />
  }

  return (
    <ol className="divide-y">
      {audit.data.map((a) => (
        <li key={a.id} className="flex items-start gap-3 px-4 py-3 text-sm">
          <ToneBadge tone={ACTION_TONE[a.action] ?? 'muted'} className="mt-0.5 w-20 justify-center">{a.action}</ToneBadge>
          <div className="min-w-0 flex-1">
            <p className="break-words">{a.detail}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {formatDateTime(a.createdAt)} · {a.userId === me ? 'You' : `User ${a.userId.slice(-6)}`}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
