import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authService } from '@/services/auth.service'
import { useAuthStore, useSession } from '@/stores/auth'
import { can } from '@/lib/permissions'
import type { PermissionAction, PermissionModule } from '@/types/team'
import { qk } from './queryKeys'

/** Signs in and stores the session; `onSuccess` runs after the session is saved. */
export function useLogin(onSuccess?: () => void) {
  const setSession = useAuthStore((s) => s.login)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: authService.login,
    onSuccess: ({ token, user }) => {
      qc.clear() // never show a previous user's cached data
      setSession(token, user)
      onSuccess?.()
    },
  })
}

/**
 * Keeps the stored profile (role + permissions) in sync with GET /auth/me:
 * on mount, on window focus and every 5 minutes. Mounted once in the protected layout.
 */
export function useSyncCurrentUser() {
  const token = useAuthStore((s) => s.token)
  const setUser = useAuthStore((s) => s.setUser)
  const qc = useQueryClient()
  const me = useQuery({
    queryKey: qk.me,
    queryFn: authService.me,
    enabled: !!token,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60_000,
    staleTime: 30_000,
  })
  useEffect(() => {
    if (!me.data) return
    const prev = useAuthStore.getState().user
    setUser(me.data)
    // Role or permissions changed → refetch everything under the new access level.
    if (prev && (prev.roleId !== me.data.roleId || JSON.stringify(prev.permissions) !== JSON.stringify(me.data.permissions))) {
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
    }
  }, [me.data, setUser, qc])
  return me
}

/** `can('JOBS', 'write')` against the signed-in user's role. */
export function usePermissions() {
  const user = useSession().data?.user
  return {
    user,
    isAdmin: !!user?.isSystemRole,
    can: (module: PermissionModule, action: PermissionAction) => can(user?.permissions, module, action),
  }
}
