import { useMemo, useState } from 'react'
import { MailPlus, Search, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { TableSkeleton } from '@/components/shared/Skeletons'
import { ToneBadge } from '@/components/timecard/ToneBadge'
import { useMembers, useTeamAbilities, useUpdateMember } from '@/hooks/useTeam'
import { apiError } from '@/services/client'
import type { TeamInvitation, TeamMember, TeamRole } from '@/types/team'
import { PendingInvitations } from './PendingInvitations'

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || '?'

interface Props {
  roles: TeamRole[]
  /** Open the invite dialog (optionally pre-filled for a resend). */
  onInvite: (prefill?: TeamInvitation) => void
}

export function MembersPanel({ roles, onInvite }: Props) {
  const ab = useTeamAbilities()
  const members = useMembers()
  const update = useUpdateMember()
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const roleById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles])
  const activeAdmins = (members.data ?? []).filter((m) => m.isActive && m.role.isSystem).length

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (members.data ?? []).filter((m) => !q || `${m.name} ${m.email} ${m.role.name}`.toLowerCase().includes(q))
  }, [members.data, search])

  /** Why this member's role / status can't be changed by you, or null. */
  function lockReason(m: TeamMember): string | null {
    if (!ab.canEdit) return 'You need Team edit permission to change members'
    if (m.id === ab.user?.id) return 'You can’t change your own role or deactivate yourself'
    const role = roleById.get(m.role.id)
    if (m.role.isSystem && !ab.isAdmin) return `Only an ${m.role.name} can change another ${m.role.name}`
    if (role && !ab.isAdmin && !ab.canAssignRole(role)) return 'This member has access beyond yours'
    return null
  }

  async function change(m: TeamMember, body: { roleId?: string; isActive?: boolean }, success: string) {
    setBusyId(m.id)
    try {
      await update.mutateAsync({ id: m.id, ...body })
      toast.success(success)
    } catch (e) {
      toast.error(apiError(e, 'Could not update the member'))
    } finally {
      setBusyId(null)
    }
  }

  if (members.isPending) return <TableSkeleton rows={5} cols={4} />
  if (members.isError) return <ErrorState error={members.error} title="Couldn’t load members" onRetry={() => members.refetch()} retrying={members.isFetching} />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members…" className="h-9 w-64 pl-8 text-sm" aria-label="Search members" />
        </div>
        {ab.canCreate && (
          <Button size="sm" className="gap-1.5" onClick={() => onInvite()}>
            <MailPlus className="h-4 w-4" /> Invite member
          </Button>
        )}
      </div>

      <PendingInvitations roles={roles} onResend={onInvite} />

      {visible.length === 0 ? (
        <EmptyState icon={Users} title={search ? 'No members match your search' : 'No members yet'} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-semibold">Member</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Active</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m) => {
                const reason = lockReason(m)
                const lastAdmin = m.role.isSystem && m.isActive && activeAdmins <= 1
                const busy = busyId === m.id
                return (
                  <tr key={m.id} className="border-t">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">{initials(m.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {m.name} {m.id === ab.user?.id && <span className="text-xs text-muted-foreground">(you)</span>}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Select
                        value={m.role.id}
                        disabled={!!reason || busy || lastAdmin}
                        onValueChange={(roleId) => change(m, { roleId }, `${m.name} is now ${roleById.get(roleId)?.name ?? 'updated'}`)}
                      >
                        <SelectTrigger className="h-8 w-48 text-xs" aria-label={`Role for ${m.name}`} title={reason ?? (lastAdmin ? 'The organization needs at least one active Admin' : undefined)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={r.id} disabled={!ab.canAssignRole(r)} className="text-xs">
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-3">
                      <ToneBadge tone={m.isActive ? 'success' : 'muted'}>{m.isActive ? 'Active' : 'Deactivated'}</ToneBadge>
                    </td>
                    <td className="px-3 py-3">
                      <span title={reason ?? (lastAdmin ? 'The organization needs at least one active Admin' : undefined)} className="inline-flex">
                      <Switch
                        checked={m.isActive}
                        disabled={!!reason || busy || (lastAdmin && m.isActive)}
                        onCheckedChange={(isActive) => change(m, { isActive }, isActive ? `${m.name} reactivated` : `${m.name} deactivated — they can no longer sign in`)}
                        aria-label={`${m.isActive ? 'Deactivate' : 'Reactivate'} ${m.name}`}
                      />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
