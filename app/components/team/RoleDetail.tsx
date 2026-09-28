import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Loader2, Lock, MailPlus, Pencil, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/timecard/FormField'
import { ToneBadge } from '@/components/timecard/ToneBadge'
import { useTeamAbilities, useUpdateRole } from '@/hooks/useTeam'
import { samePermission } from '@/lib/permissions'
import { apiError, apiStatus } from '@/services/client'
import { roleFormResolver, type RoleFormValues } from '@/schemas/team'
import type { PermissionModule, PermissionModuleDef, TeamMember, TeamRole } from '@/types/team'
import { RolePermissionsGrid, grantedCount } from './RolePermissionsGrid'

interface Props {
  role: TeamRole
  modules: PermissionModuleDef[]
  /** Members holding this role (undefined while loading / not permitted). */
  members?: TeamMember[]
  editing: boolean
  onEditingChange: (editing: boolean) => void
  onDirtyChange: (dirty: boolean) => void
  onInvite: () => void
  onDelete: () => void
}

export function RoleDetail({ role, modules, members, editing, onEditingChange, onDirtyChange, onInvite, onDelete }: Props) {
  const ab = useTeamAbilities()
  const update = useUpdateRole()
  const manageable = ab.canManageRole(role)
  const isOwnRole = role.id === ab.user?.roleId
  const canInvite = ab.canCreate && ab.canAssignRole(role)

  const form = useForm<RoleFormValues>({
    resolver: roleFormResolver,
    values: { name: role.name, description: role.description ?? '', permissions: role.permissions },
  })
  const { control, register, handleSubmit, reset, setError, formState: { errors, isDirty } } = form

  useEffect(() => onDirtyChange(editing && isDirty), [editing, isDirty, onDirtyChange])

  const cancel = () => {
    reset()
    onEditingChange(false)
  }

  const onSubmit = handleSubmit(async (values) => {
    // Only send the modules that changed (and none for your own role — the API forbids it).
    const changed = isOwnRole
      ? []
      : (Object.keys(values.permissions) as PermissionModule[]).filter(
          (m) => !samePermission(values.permissions[m], role.permissions[m]),
        )
    try {
      await update.mutateAsync({
        id: role.id,
        name: values.name,
        description: values.description ?? '',
        ...(changed.length ? { permissions: changed.map((module) => ({ module, ...values.permissions[module] })) } : {}),
      })
      toast.success(`Role “${values.name}” saved`)
      onEditingChange(false)
    } catch (e) {
      if (apiStatus(e) === 409) setError('name', { message: apiError(e) })
      else toast.error(apiError(e, 'Could not save the role'))
    }
  })

  const deleteBlocked = role.memberCount > 0 ? `Reassign its ${role.memberCount} member(s) first` : null

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {editing ? (
          <div className="grid w-full max-w-xl gap-3">
            <FormField id="edit-role-name" label="Role name" error={errors.name?.message}>
              <Input id="edit-role-name" aria-invalid={!!errors.name} {...register('name')} />
            </FormField>
            <FormField id="edit-role-desc" label="Description (optional)" error={errors.description?.message}>
              <Textarea id="edit-role-desc" rows={2} {...register('description')} />
            </FormField>
          </div>
        ) : (
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              {role.name}
              {role.isSystem && (
                <ToneBadge tone="muted">
                  <Lock className="h-3 w-3" /> Built-in
                </ToneBadge>
              )}
              {isOwnRole && <ToneBadge tone="primary">Your role</ToneBadge>}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{role.description || 'No description.'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {role.memberCount} member{role.memberCount === 1 ? '' : 's'} · {grantedCount(role.permissions)} permission(s) granted
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {editing ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={cancel} disabled={update.isPending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={update.isPending || !isDirty}>
                {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
              </Button>
            </>
          ) : (
            <>
              {canInvite && (
                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onInvite}>
                  <MailPlus className="h-4 w-4" /> Invite with this role
                </Button>
              )}
              {manageable && (
                <>
                  <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => onEditingChange(true)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  <span title={deleteBlocked ?? undefined}>
                    <Button type="button" size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={onDelete} disabled={!!deleteBlocked}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {role.isSystem && (
        <p className="rounded-xl border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {role.name} is built in: it always has every permission and can’t be edited or deleted.
        </p>
      )}
      {!role.isSystem && !manageable && ab.canEdit && (
        <p className="rounded-xl border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          This role has access beyond yours, so you can view it but not change it.
        </p>
      )}
      {editing && isOwnRole && (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs">
          This is your own role: you can rename it, but not change its permissions.
        </p>
      )}

      {/* Permissions */}
      <Controller
        control={control}
        name="permissions"
        render={({ field }) => (
          <RolePermissionsGrid
            modules={modules}
            value={field.value}
            original={editing ? role.permissions : undefined}
            onChange={editing && !isOwnRole ? field.onChange : undefined}
            grantLockReason={(m, a) => (ab.canGrant(m, a) ? null : 'You can only grant permissions you have yourself')}
          />
        )}
      />
      {errors.permissions && <p className="text-xs text-destructive">{errors.permissions.message ?? errors.permissions.root?.message}</p>}

      {/* Members with this role */}
      {!editing && members && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Members with this role
          </h3>
          {members.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nobody has this role yet.{canInvite ? ' Invite someone to get started.' : ''}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {members.map((m) => (
                <li key={m.id} className="rounded-full border bg-card px-3 py-1 text-xs">
                  {m.name}
                  {!m.isActive && <span className="ml-1 text-muted-foreground">(deactivated)</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  )
}
