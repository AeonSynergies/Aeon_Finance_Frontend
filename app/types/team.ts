// DTOs for the NestJS team & permissions API.

export type PermissionModule = 'JOBS' | 'UPLOADS' | 'VALIDATION' | 'APPROVALS' | 'AUDIT' | 'SETTINGS' | 'TEAM'
export type PermissionAction = 'read' | 'write' | 'edit'
export type ModulePermission = Record<PermissionAction, boolean>
export type PermissionMap = Record<PermissionModule, ModulePermission>

/** GET /permissions/modules */
export interface PermissionModuleDef {
  module: PermissionModule
  label: string
  description: string
  actions: { action: PermissionAction; applicable: boolean; description: string | null }[]
}

export interface TeamRole {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  /** Created with the organization (Admin / Manager / Executive). */
  isDefault: boolean
  memberCount: number
  permissions: PermissionMap
  createdAt: string
  updatedAt: string
}

export interface PermissionInput {
  module: PermissionModule
  read?: boolean
  write?: boolean
  edit?: boolean
}

export interface RoleInput {
  name: string
  description?: string
  permissions?: PermissionInput[]
}

export interface TeamMember {
  id: string
  name: string
  email: string
  isActive: boolean
  createdAt: string
  role: { id: string; name: string; isSystem: boolean }
}

export interface CreateMemberInput {
  name: string
  email: string
  password: string
  roleId: string
}

export interface UpdateMemberInput {
  name?: string
  roleId?: string
  isActive?: boolean
}

/** Login / me profile from the backend. */
export interface AuthProfile {
  id: string
  name: string
  email: string
  org: { id: string; name: string; slug: string }
  role: { id: string; name: string; isSystem: boolean }
  permissions: PermissionMap
}

export interface TeamInvitation {
  id: string
  email: string
  name: string | null
  expiresAt: string
  createdAt: string
  status: 'PENDING' | 'EXPIRED'
  role: { id: string; name: string; isSystem: boolean }
  invitedBy: { id: string; name: string }
}

/** POST /team/invitations also returns the one-time token for the invite link. */
export type CreatedInvitation = TeamInvitation & { token: string }

export interface CreateInvitationInput {
  email: string
  name?: string
  roleId: string
}

/** GET /invitations/:token (public) */
export interface InvitationPreview {
  email: string
  name: string | null
  expiresAt: string
  org: { name: string }
  role: { name: string }
}
