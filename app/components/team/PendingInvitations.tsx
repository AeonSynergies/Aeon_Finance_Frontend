import { useState } from 'react'
import { Clock, MailPlus, RotateCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { ToneBadge } from '@/components/timecard/ToneBadge'
import { useInvitations, useRevokeInvitation, useTeamAbilities } from '@/hooks/useTeam'
import { formatDateTime } from '@/lib/timecard'
import { apiError } from '@/services/client'
import type { TeamInvitation, TeamRole } from '@/types/team'

interface Props {
  roles: TeamRole[]
  /** Re-invite: opens the invite dialog pre-filled (the old link can't be shown again). */
  onResend: (inv: TeamInvitation) => void
}

export function PendingInvitations({ roles, onResend }: Props) {
  const ab = useTeamAbilities()
  const invitations = useInvitations(ab.canView)
  const revoke = useRevokeInvitation()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function doRevoke(inv: TeamInvitation) {
    setBusyId(inv.id)
    try {
      await revoke.mutateAsync(inv.id)
      toast.success(`Invitation for ${inv.email} revoked`)
    } catch (e) {
      toast.error(apiError(e, 'Could not revoke the invitation'))
    } finally {
      setBusyId(null)
    }
  }

  if (invitations.isPending) return <Skeleton className="h-20 w-full rounded-2xl" />
  if (invitations.isError) {
    return <ErrorState compact error={invitations.error} title="Couldn’t load invitations" onRetry={() => invitations.refetch()} retrying={invitations.isFetching} />
  }
  if (invitations.data.length === 0) return null

  return (
    <section className="rounded-2xl border bg-card" aria-label="Pending invitations">
      <h3 className="flex items-center gap-1.5 border-b px-5 py-3 text-sm font-semibold">
        <MailPlus className="h-4 w-4 text-muted-foreground" /> Pending invitations ({invitations.data.length})
      </h3>
      <ul className="divide-y">
        {invitations.data.map((inv) => {
          const role = roles.find((r) => r.id === inv.role.id)
          const canAct = !!role && ab.canAssignRole(role)
          return (
            <li key={inv.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{inv.name ? `${inv.name} · ${inv.email}` : inv.email}</div>
                <div className="text-xs text-muted-foreground">
                  {inv.role.name} · invited by {inv.invitedBy.name} {formatDateTime(inv.createdAt)}
                </div>
              </div>
              {inv.status === 'EXPIRED' ? (
                <ToneBadge tone="danger">Expired</ToneBadge>
              ) : (
                <ToneBadge tone="warning">
                  <Clock className="h-3 w-3" /> Expires {formatDateTime(inv.expiresAt)}
                </ToneBadge>
              )}
              {ab.canCreate && canAct && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onResend(inv)}>
                  <RotateCw className="h-3.5 w-3.5" /> {inv.status === 'EXPIRED' ? 'Re-invite' : 'New link'}
                </Button>
              )}
              {ab.canEdit && canAct && (
                <Button size="sm" variant="ghost" className="h-8 gap-1 text-destructive" onClick={() => doRevoke(inv)} disabled={busyId === inv.id}>
                  <X className="h-3.5 w-3.5" /> Revoke
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
