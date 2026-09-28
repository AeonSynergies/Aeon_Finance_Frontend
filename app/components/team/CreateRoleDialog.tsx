import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/timecard/FormField'
import { useCreateRole, useTeamAbilities } from '@/hooks/useTeam'
import { apiError, apiStatus } from '@/services/client'
import { roleFormResolver, type RoleFormValues } from '@/schemas/team'
import type { PermissionModuleDef, TeamRole } from '@/types/team'
import { RolePermissionsGrid, emptyPermissions, grantedCount, toPermissionInputs } from './RolePermissionsGrid'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  modules: PermissionModuleDef[]
  roles: TeamRole[]
  /** After creating: the page selects the role and can offer to invite someone with it. */
  onCreated: (role: TeamRole) => void
}

export function CreateRoleDialog({ open, onOpenChange, modules, roles, onCreated }: Props) {
  const create = useCreateRole()
  const { canAssignRole, canGrant } = useTeamAbilities()
  const [template, setTemplate] = useState('none')
  const { control, register, handleSubmit, reset, setValue, setError, watch, formState: { errors } } = useForm<RoleFormValues>({
    resolver: roleFormResolver,
  })

  useEffect(() => {
    if (open) {
      reset({ name: '', description: '', permissions: emptyPermissions(modules) })
      setTemplate('none')
    }
  }, [open, modules, reset])

  // Starting points: only roles whose access you hold yourself (the API rejects escalation).
  const templates = roles.filter(canAssignRole)
  function applyTemplate(id: string) {
    setTemplate(id)
    const src = roles.find((r) => r.id === id)
    setValue('permissions', src ? structuredClone(src.permissions) : emptyPermissions(modules), { shouldValidate: true })
  }

  const permissions = watch('permissions')

  const onSubmit = handleSubmit(async (values) => {
    try {
      const role = await create.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        permissions: toPermissionInputs(values.permissions),
      })
      toast.success(`Role “${role.name}” created`)
      onOpenChange(false)
      onCreated(role)
    } catch (e) {
      if (apiStatus(e) === 409) setError('name', { message: apiError(e) })
      else toast.error(apiError(e, 'Could not create the role'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create role</DialogTitle>
          <DialogDescription>Name the role, then tick what it can do in each module. You can only grant permissions you have.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="role-name" label="Role name" error={errors.name?.message}>
              <Input id="role-name" autoFocus placeholder="e.g. Payroll Reviewer" aria-invalid={!!errors.name} {...register('name')} />
            </FormField>
            <FormField id="role-template" label="Start from (optional)">
              <Select value={template} onValueChange={applyTemplate}>
                <SelectTrigger id="role-template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Blank — no access</SelectItem>
                  {templates.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      Copy {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField id="role-description" label="Description (optional)" error={errors.description?.message}>
            <Textarea id="role-description" rows={2} placeholder="What is this role for?" {...register('description')} />
          </FormField>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold">Permissions</span>
              <span className="text-[11px] text-muted-foreground">
                {permissions ? grantedCount(permissions) : 0} granted · Write or Edit also grants Read
              </span>
            </div>
            {permissions && (
              <Controller
                control={control}
                name="permissions"
                render={({ field }) => (
                  <RolePermissionsGrid
                    modules={modules}
                    value={field.value}
                    onChange={field.onChange}
                    grantLockReason={(m, a) => (canGrant(m, a) ? null : 'You can only grant permissions you have yourself')}
                  />
                )}
              />
            )}
            {errors.permissions && <p className="text-xs text-destructive">{errors.permissions.message ?? errors.permissions.root?.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
