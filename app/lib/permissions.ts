import type { ModulePermission, PermissionAction, PermissionMap, PermissionModule } from '@/types/team'

export const ACTIONS: PermissionAction[] = ['read', 'write', 'edit']
export const ACTION_LABEL: Record<PermissionAction, string> = { read: 'Read', write: 'Write', edit: 'Edit' }

export function can(perms: PermissionMap | undefined | null, module: PermissionModule, action: PermissionAction): boolean {
  return !!perms?.[module]?.[action]
}

/** Toggle one action, keeping the backend rule: write / edit imply read; no read → nothing. */
export function toggleAction(p: ModulePermission, action: PermissionAction, on: boolean): ModulePermission {
  if (action === 'read') return on ? { ...p, read: true } : { read: false, write: false, edit: false }
  return { ...p, [action]: on, read: on ? true : p.read }
}

/** Every granted action in `wanted` is also granted in `held`. */
export function isSubset(wanted: PermissionMap, held: PermissionMap): boolean {
  return (Object.keys(wanted) as PermissionModule[]).every((m) =>
    ACTIONS.every((a) => !wanted[m]?.[a] || held[m]?.[a]),
  )
}

export const samePermission = (a: ModulePermission, b: ModulePermission) =>
  a.read === b.read && a.write === b.write && a.edit === b.edit
