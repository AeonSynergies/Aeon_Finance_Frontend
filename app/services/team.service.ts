import { api, unwrap } from './client'
import type { AuthProfile } from '@/types/team'
import type {
  CreateInvitationInput,
  CreatedInvitation,
  InvitationPreview,
  PermissionModuleDef,
  TeamInvitation,
  RoleInput,
  TeamMember,
  TeamRole,
  UpdateMemberInput,
} from '@/types/team'

const enc = encodeURIComponent

// NestJS team & permissions API (backend/src/{permissions,team}).
export const teamService = {
  /** What Read / Write / Edit mean for each module. */
  modules: () => unwrap(api.get<PermissionModuleDef[]>('/permissions/modules')),

  /* ── Roles (TEAM read / write / edit) ── */
  listRoles: () => unwrap(api.get<TeamRole[]>('/roles')),
  createRole: (body: RoleInput) => unwrap(api.post<TeamRole>('/roles', body)),
  /** Only the modules in `permissions` change; the rest stay as they are. */
  updateRole: (id: string, body: Partial<RoleInput>) => unwrap(api.patch<TeamRole>(`/roles/${enc(id)}`, body)),
  /** 409 while the role still has members. */
  deleteRole: (id: string) => unwrap(api.delete<{ id: string; deleted: true }>(`/roles/${enc(id)}`)),

  /* ── Members ── */
  listMembers: () => unwrap(api.get<TeamMember[]>('/team/members')),
  updateMember: (id: string, body: UpdateMemberInput) =>
    unwrap(api.patch<TeamMember>(`/team/members/${enc(id)}`, body)),

  /* ── Invitations ── */
  listInvitations: () => unwrap(api.get<TeamInvitation[]>('/team/invitations')),
  /** Re-inviting the same email replaces the previous link. The token is only returned here. */
  createInvitation: (body: CreateInvitationInput) => unwrap(api.post<CreatedInvitation>('/team/invitations', body)),
  revokeInvitation: (id: string) => unwrap(api.delete<{ id: string; revoked: true }>(`/team/invitations/${enc(id)}`)),

  /* ── Public: accepting an invite (no session yet) ── */
  /** 404 = invalid / used / revoked, 410 = expired. */
  previewInvitation: (token: string) => unwrap(api.get<InvitationPreview>(`/invitations/${enc(token)}`)),
  acceptInvitation: (token: string, body: { name: string; password: string }) =>
    unwrap(api.post<{ accessToken: string; user: AuthProfile }>(`/invitations/${enc(token)}/accept`, body)),
}

/** The shareable accept link for a freshly created invitation. */
export const inviteLink = (token: string) => `${window.location.origin}/invite/${encodeURIComponent(token)}`
