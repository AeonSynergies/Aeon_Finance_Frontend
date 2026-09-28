import { describe, it, expect } from 'vitest'
import { can, isSubset, toggleAction } from '@/lib/permissions'
import type { PermissionMap } from '@/types/team'

const none = { read: false, write: false, edit: false }
const map = (over: Partial<PermissionMap> = {}): PermissionMap => ({
  JOBS: none, UPLOADS: none, VALIDATION: none, APPROVALS: none, AUDIT: none, SETTINGS: none, TEAM: none, ...over,
})

describe('permission helpers', () => {
  it('write / edit switch read on; clearing read clears everything (backend rule)', () => {
    expect(toggleAction(none, 'edit', true)).toEqual({ read: true, write: false, edit: true })
    expect(toggleAction({ read: true, write: true, edit: true }, 'read', false)).toEqual(none)
    expect(toggleAction({ read: true, write: true, edit: false }, 'write', false)).toEqual({ read: true, write: false, edit: false })
  })

  it('checks grants and subsets', () => {
    const held = map({ JOBS: { read: true, write: true, edit: false } })
    expect(can(held, 'JOBS', 'write')).toBe(true)
    expect(can(held, 'JOBS', 'edit')).toBe(false)
    expect(can(undefined, 'JOBS', 'read')).toBe(false)
    expect(isSubset(map({ JOBS: { read: true, write: false, edit: false } }), held)).toBe(true)
    expect(isSubset(map({ JOBS: { read: true, write: false, edit: true } }), held)).toBe(false)
  })
})
