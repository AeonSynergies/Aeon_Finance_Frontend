import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import type { PermissionMap } from '@/types/team'

const modulePermission = z.object({ read: z.boolean(), write: z.boolean(), edit: z.boolean() })

/** Mirrors backend CreateRoleDto; a role must grant at least one permission. */
export const roleFormSchema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(50, 'At most 50 characters'),
  description: z.string().trim().max(200, 'At most 200 characters').optional(),
  permissions: z
    .record(z.string(), modulePermission)
    .refine((p) => Object.values(p).some((m) => m.read || m.write || m.edit), 'Grant at least one permission'),
})
export type RoleFormValues = Omit<z.infer<typeof roleFormSchema>, 'permissions'> & { permissions: PermissionMap }

/** zod sees `permissions` as a string-keyed record; the form types it as the full PermissionMap. */
export const roleFormResolver = zodResolver(roleFormSchema) as unknown as Resolver<RoleFormValues>

/** Mirrors backend CreateInvitationDto. */
export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Email is required').email('Enter a valid email'),
  name: z.union([z.literal(''), z.string().trim().min(2, 'At least 2 characters').max(80, 'At most 80 characters')]).optional(),
  roleId: z.string().min(1, 'Choose a role'),
})
export type InviteValues = z.infer<typeof inviteSchema>

/** Mirrors backend AcceptInvitationDto (+ a confirm field). */
export const acceptInviteSchema = z
  .object({
    name: z.string().trim().min(2, 'At least 2 characters').max(80, 'At most 80 characters'),
    password: z.string().min(8, 'At least 8 characters').max(128, 'At most 128 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords don’t match' })
export type AcceptInviteValues = z.infer<typeof acceptInviteSchema>
