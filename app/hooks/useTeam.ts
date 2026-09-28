// Team & permissions (NestJS API): roles, their permissions, and org members.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { teamService } from '@/services/team.service'
import { isSubset } from '@/lib/permissions'
import type { CreateInvitationInput, PermissionModule, RoleInput, TeamRole, UpdateMemberInput } from '@/types/team'
import { toSessionUser } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth'
import { usePermissions } from './useAuth'
import { qk } from './queryKeys'

const k = qk.team

export function usePermissionModules() {
  return useQuery({ queryKey: k.modules, queryFn: teamService.modules, staleTime: Infinity })
}

export function useRoles(enabled = true) {
  return useQuery({ queryKey: k.roles, queryFn: teamService.listRoles, enabled })
}

export function useMembers(enabled = true) {
  return useQuery({ queryKey: k.members, queryFn: teamService.listMembers, enabled })
}

/** Role or membership changes may change the signed-in user's own access → refresh /auth/me too. */
function useInvalidateTeam() {
  const qc = useQueryClient()
  return () => Promise.all([qc.invalidateQueries({ queryKey: k.all }), qc.invalidateQueries({ queryKey: qk.me })])
}

export function useCreateRole() {
  const invalidate = useInvalidateTeam()
  return useMutation({ mutationFn: (body: RoleInput) => teamService.createRole(body), onSuccess: invalidate })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  const invalidate = useInvalidateTeam()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<RoleInput> & { id: string }) => teamService.updateRole(id, body),
    onSuccess: (role) => {
      qc.setQueryData<TeamRole[]>(k.roles, (roles) => roles?.map((r) => (r.id === role.id ? role : r)))
      return invalidate()
    },
  })
}

export function useDeleteRole() {
  const invalidate = useInvalidateTeam()
  return useMutation({ mutationFn: (id: string) => teamService.deleteRole(id), onSuccess: invalidate })
}

export function useInvitations(enabled = true) {
  return useQuery({ queryKey: k.invitations, queryFn: teamService.listInvitations, enabled })
}

export function useCreateInvitation() {
  const invalidate = useInvalidateTeam()
  return useMutation({ mutationFn: (body: CreateInvitationInput) => teamService.createInvitation(body), onSuccess: invalidate })
}

export function useRevokeInvitation() {
  const invalidate = useInvalidateTeam()
  return useMutation({ mutationFn: (id: string) => teamService.revokeInvitation(id), onSuccess: invalidate })
}

/** Public accept page. No retries: 404 / 410 are final answers. */
export function useInvitationPreview(token: string | undefined) {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: () => teamService.previewInvitation(token!),
    enabled: !!token,
    retry: false,
  })
}

/** Accept → the API returns a session, so the new member is signed in straight away. */
export function useAcceptInvitation(token: string) {
  const qc = useQueryClient()
  const login = useAuthStore((s) => s.login)
  return useMutation({
    mutationFn: (body: { name: string; password: string }) => teamService.acceptInvitation(token, body),
    onSuccess: ({ accessToken, user }) => {
      qc.clear()
      login(accessToken, toSessionUser(user))
    },
  })
}

export function useUpdateMember() {
  const invalidate = useInvalidateTeam()
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateMemberInput & { id: string }) => teamService.updateMember(id, body),
    onSuccess: invalidate,
  })
}

/**
 * What the signed-in user may do on the team page. Mirrors the backend rules so
 * the UI never offers an action the API would reject (it still enforces them).
 */
export function useTeamAbilities() {
  const { user, isAdmin, can } = usePermissions()
  const perms = user?.permissions
  /** Roles with more access than yours (or the Admin role) are off-limits unless you're an Admin. */
  const canManageRole = (role: Pick<TeamRole, 'isSystem' | 'permissions'>) =>
    can('TEAM', 'edit') && !role.isSystem && (isAdmin || (!!perms && isSubset(role.permissions, perms)))
  const canAssignRole = (role: Pick<TeamRole, 'isSystem' | 'permissions'>) =>
    isAdmin || (!role.isSystem && !!perms && isSubset(role.permissions, perms))
  return {
    user,
    isAdmin,
    canView: can('TEAM', 'read'),
    canCreate: can('TEAM', 'write'),
    canEdit: can('TEAM', 'edit'),
    canManageRole,
    canAssignRole,
    /** You can only grant permissions you hold yourself. */
    canGrant: (module: PermissionModule, action: 'read' | 'write' | 'edit') => isAdmin || can(module, action),
  }
}
