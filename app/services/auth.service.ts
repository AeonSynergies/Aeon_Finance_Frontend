import { api, unwrap } from './client'
import { decodeJwt, isJwtExpired } from '@/lib/jwt'
import type { SessionUser } from '@/types'
import type { AuthProfile } from '@/types/team'
import type { LoginInput } from '@/schemas/auth'

export const toSessionUser = (p: AuthProfile): SessionUser => ({
  id: p.id,
  email: p.email,
  name: p.name,
  role: p.role.name,
  roleId: p.role.id,
  isSystemRole: p.role.isSystem,
  org: p.org,
  permissions: p.permissions,
  module: null,
})

export const authService = {
  /** POST /auth/login → `{ accessToken, user }` (profile with role + permissions). */
  login: async (body: LoginInput): Promise<{ token: string; user: SessionUser }> => {
    const email = body.email.trim().toLowerCase()
    const { accessToken, user } = await unwrap(
      api.post<{ accessToken: string; user: AuthProfile }>('/auth/login', { email, password: body.password }),
    )
    if (isJwtExpired(decodeJwt(accessToken))) throw new Error('The server returned an invalid session token.')
    return { token: accessToken, user: toSessionUser(user) }
  },

  /** GET /auth/me: current profile, so permission changes apply without re-login. */
  me: async (): Promise<SessionUser> => toSessionUser(await unwrap(api.get<AuthProfile>('/auth/me'))),
}
