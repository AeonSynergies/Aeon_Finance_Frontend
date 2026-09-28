import { useMemo, useState } from 'react'
import { Lock, Plus, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { useMembers, useTeamAbilities } from '@/hooks/useTeam'
import { cn } from '@/lib/utils'
import type { PermissionModuleDef, TeamRole } from '@/types/team'
import { CreateRoleDialog } from './CreateRoleDialog'
import { DeleteRoleDialog } from './DeleteRoleDialog'
import { RoleDetail } from './RoleDetail'
import { grantedCount } from './RolePermissionsGrid'

interface Props {
  roles: TeamRole[]
  modules: PermissionModuleDef[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Open the invite dialog with this role pre-selected. */
  onInvite: (roleId: string) => void
}

export function RolesPanel({ roles, modules, selectedId, onSelect, onInvite }: Props) {
  const ab = useTeamAbilities()
  const members = useMembers(ab.canView)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<TeamRole | null>(null)
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null)
  const [offerInvite, setOfferInvite] = useState<TeamRole | null>(null)

  const selected = roles.find((r) => r.id === selectedId) ?? roles[0]
  const defaults = roles.filter((r) => r.isSystem || r.isDefault)
  const custom = roles.filter((r) => !r.isSystem && !r.isDefault)
  const roleMembers = useMemo(
    () => members.data?.filter((m) => m.role.id === selected?.id),
    [members.data, selected?.id],
  )

  function select(id: string) {
    if (id === selected?.id) return
    if (editing && dirty) return setPendingSwitch(id) // confirm before losing edits
    setEditing(false)
    onSelect(id)
  }

  const RoleItem = ({ role }: { role: TeamRole }) => (
    <button
      type="button"
      onClick={() => select(role.id)}
      aria-current={role.id === selected?.id}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
        role.id === selected?.id ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted/60',
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {role.isSystem && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Built-in" />}
        <span className="truncate">{role.name}</span>
      </span>
      <span className="shrink-0 text-[11px] font-normal text-muted-foreground">
        {role.memberCount} · {grantedCount(role.permissions)} perms
      </span>
    </button>
  )

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      {/* Role list */}
      <aside className="space-y-4 rounded-2xl border bg-card p-3 lg:self-start">
        {ab.canCreate && (
          <Button size="sm" className="w-full gap-1.5" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Create role
          </Button>
        )}
        <nav aria-label="Default roles" className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Default roles</p>
          {defaults.map((r) => <RoleItem key={r.id} role={r} />)}
        </nav>
        <nav aria-label="Custom roles" className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Custom roles</p>
          {custom.length === 0 ? (
            <p className="px-3 text-xs text-muted-foreground">None yet.{ab.canCreate ? ' Create one for a specific job function.' : ''}</p>
          ) : (
            custom.map((r) => <RoleItem key={r.id} role={r} />)
          )}
        </nav>
      </aside>

      {/* Selected role */}
      <section className="rounded-2xl border bg-card p-5" aria-live="polite">
        {selected ? (
          <RoleDetail
            key={selected.id}
            role={selected}
            modules={modules}
            members={roleMembers}
            editing={editing}
            onEditingChange={setEditing}
            onDirtyChange={setDirty}
            onInvite={() => onInvite(selected.id)}
            onDelete={() => setDeleting(selected)}
          />
        ) : (
          <EmptyState icon={ShieldCheck} title="No roles yet" />
        )}
      </section>

      <CreateRoleDialog
        open={creating}
        onOpenChange={setCreating}
        modules={modules}
        roles={roles}
        onCreated={(role) => {
          setEditing(false)
          onSelect(role.id)
          if (ab.canCreate) setOfferInvite(role)
        }}
      />
      <DeleteRoleDialog
        role={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => onSelect(roles.find((r) => r.id !== deleting?.id)?.id ?? '')}
      />

      {/* Unsaved edits when switching roles */}
      <Dialog open={!!pendingSwitch} onOpenChange={(o) => !o && setPendingSwitch(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>You have unsaved edits to {selected?.name}.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingSwitch(null)}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setEditing(false)
                onSelect(pendingSwitch!)
                setPendingSwitch(null)
              }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Next step after creating a role */}
      <Dialog open={!!offerInvite} onOpenChange={(o) => !o && setOfferInvite(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite someone as {offerInvite?.name}?</DialogTitle>
            <DialogDescription>The role is ready. Invite a teammate to it now, or do it later from the Members tab.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferInvite(null)}>
              Later
            </Button>
            <Button
              onClick={() => {
                onInvite(offerInvite!.id)
                setOfferInvite(null)
              }}
            >
              Invite member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
