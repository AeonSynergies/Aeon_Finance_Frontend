import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ACTIONS, ACTION_LABEL, toggleAction } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { PermissionAction, PermissionMap, PermissionModule, PermissionModuleDef } from '@/types/team'

interface Props {
  modules: PermissionModuleDef[]
  value: PermissionMap
  /** Omit for a read-only view. */
  onChange?: (next: PermissionMap) => void
  /** Why an unchecked box can't be ticked (e.g. you don't hold it yourself), or null. */
  grantLockReason?: (module: PermissionModule, action: PermissionAction) => string | null
  /** Highlight rows that differ from this (unsaved changes). */
  original?: PermissionMap
}

/** One role's access: rows = modules, columns = Read / Write / Edit. */
export function RolePermissionsGrid({ modules, value, onChange, grantLockReason, original }: Props) {
  const editable = !!onChange
  return (
    <TooltipProvider delayDuration={150}>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col />
            {ACTIONS.map((a) => (
              <col key={a} className="w-[17%]" />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-muted/40">
              <th scope="col" className="px-5 py-3 text-left font-semibold">Module</th>
              {ACTIONS.map((a) => (
                <th key={a} scope="col" className="px-2 py-3 text-center font-semibold">
                  {ACTION_LABEL[a]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => {
              const p = value[m.module]
              const changed =
                !!original && ACTIONS.some((a) => original[m.module][a] !== p[a])
              return (
                <tr key={m.module} className={cn('border-t', changed && 'bg-primary/[0.04]')}>
                  <th scope="row" className="px-5 py-3.5 text-left font-normal">
                    <div className="flex items-center gap-1.5 font-medium">
                      {m.label}
                      {changed && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Changed" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{m.description}</div>
                  </th>
                  {m.actions.map((a) => {
                    if (!a.applicable) {
                      return (
                        <td key={a.action} className="text-center text-muted-foreground/40" aria-label="Not applicable">
                          —
                        </td>
                      )
                    }
                    const checked = p[a.action]
                    const lock = editable && !checked ? grantLockReason?.(m.module, a.action) ?? null : null
                    const box = (
                      <Checkbox
                        checked={checked}
                        disabled={!editable || !!lock}
                        onCheckedChange={(v) =>
                          onChange?.({ ...value, [m.module]: toggleAction(p, a.action, v === true) })
                        }
                        aria-label={`${ACTION_LABEL[a.action]} ${m.label}`}
                        className={cn(
                          'h-5 w-5 rounded-[5px] border-muted-foreground/30 data-[state=checked]:border-primary [&_svg]:h-3.5 [&_svg]:w-3.5',
                          !editable && 'disabled:cursor-default disabled:opacity-100',
                          lock && 'disabled:cursor-not-allowed disabled:opacity-50',
                        )}
                      />
                    )
                    return (
                      <td key={a.action} className="px-2 py-3.5 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">{box}</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[220px] text-xs">{lock ?? a.description}</TooltipContent>
                        </Tooltip>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  )
}

export function emptyPermissions(modules: PermissionModuleDef[]): PermissionMap {
  return Object.fromEntries(modules.map((m) => [m.module, { read: false, write: false, edit: false }])) as PermissionMap
}

export const grantedCount = (p: PermissionMap) =>
  Object.values(p).reduce((n, m) => n + ACTIONS.filter((a) => m[a]).length, 0)

/** `permissions` array for the API from a full map. */
export const toPermissionInputs = (p: PermissionMap) =>
  (Object.keys(p) as PermissionModule[]).map((module) => ({ module, ...p[module] }))
