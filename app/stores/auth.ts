import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { decodeJwt, isJwtExpired } from '@/lib/jwt'
import type { SessionUser } from '@/types'

interface AuthState {
  token: string | null
  user: SessionUser | null
  login: (token: string, user: SessionUser) => void
  setUser: (user: SessionUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'aeon-auth',
      version: 2, // v2: user carries org + role + permissions
      migrate: () => ({ token: null, user: null }),
    },
  ),
)

/** True when there is a stored token that hasn't expired yet. */
export function hasValidSession(): boolean {
  const { token, user } = useAuthStore.getState()
  return !!token && !!user?.permissions && !isJwtExpired(decodeJwt(token))
}

/** Drop-in for next-auth's useSession(): `{ data: { user } | null, status }`. */
export function useSession() {
  const user = useAuthStore((s) => s.user)
  return { data: user ? { user } : null, status: user ? 'authenticated' : 'unauthenticated' } as const
}

/** Clear the session, drop cached queries and go to the login page. */
export async function signOut({ callbackUrl = '/login' }: { callbackUrl?: string } = {}) {
  useAuthStore.getState().logout()
  const { queryClient } = await import('@/lib/queryClient')
  queryClient.clear()
  window.location.assign(callbackUrl)
}
