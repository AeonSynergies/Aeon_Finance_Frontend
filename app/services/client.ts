import axios, { AxiosError } from 'axios'
import { useAuthStore, hasValidSession } from '@/stores/auth'

/**
 * For services not yet backed by the NestJS API (everything except auth and
 * timecard validation): true → they return the mock data in app/mocks.
 */
export const USE_MOCKS = true

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' })

/** Only the login call goes out without a token (and its 401 means "wrong password", not "session over"). */
const isLoginCall = (url?: string) => !!url && url.startsWith('/auth/login')

function endSession() {
  useAuthStore.getState().logout()
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    const next = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.assign(`/login?next=${next}&expired=1`)
  }
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token && !isLoginCall(config.url)) {
    // Don't send a token we already know is expired — the backend would 401.
    if (!hasValidSession()) {
      endSession()
      return Promise.reject(new AxiosError('Your session has expired. Please sign in again.', 'ERR_SESSION_EXPIRED', config))
    }
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

api.interceptors.response.use(undefined, (error: AxiosError) => {
  if (error.response?.status === 401 && !isLoginCall(error.config?.url)) endSession()
  return Promise.reject(error)
})

/** Unwraps `response.data` from an axios call. */
export const unwrap = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data)

/** Resolves a mock value after a short fake latency (deep-copied, like a real response). */
export const mock = <T,>(value: T, ms = 150): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms))

/** Rejects like a failed API call, so `apiError()` and onError handlers behave the same. */
export const mockFail = (status: number, error: string): Promise<never> =>
  Promise.reject(
    new AxiosError(error, 'ERR_BAD_REQUEST', undefined, undefined, {
      status, statusText: error, data: { error }, headers: {}, config: {} as never,
    }),
  )

/**
 * Error body shapes: the NestJS API sends `{ error: { code, message, fields?, ...extra } }`
 * (see backend HttpExceptionFilter); the mock services send `{ error: string }`.
 */
export interface ApiErrorBody {
  code?: string
  message?: string
  fields?: string[]
  [extra: string]: unknown
}

/** The structured `error` object from a failed API call, if there is one. */
export function apiErrorBody(e: unknown): ApiErrorBody | null {
  if (!(e instanceof AxiosError)) return null
  const err = (e.response?.data as { error?: unknown } | undefined)?.error
  if (typeof err === 'string') return { message: err }
  return err && typeof err === 'object' ? (err as ApiErrorBody) : null
}

/** HTTP status of a failed API call (undefined for network errors). */
export const apiStatus = (e: unknown) => (e instanceof AxiosError ? e.response?.status : undefined)

/** Human-readable message from an API error, including field-level validation messages. */
export function apiError(e: unknown, fallback = 'Something went wrong'): string {
  const body = apiErrorBody(e)
  if (body?.fields?.length) return `${body.message ?? 'Validation failed'}: ${body.fields.join('; ')}`
  if (body?.message) return body.message
  if (e instanceof AxiosError) {
    if (!e.response) return e.code === 'ERR_SESSION_EXPIRED' ? e.message : 'Cannot reach the server. Check your connection and try again.'
    if (e.response.status === 403) return 'You don’t have permission to do that.'
    if (e.response.status >= 500) return 'The server ran into a problem. Please try again.'
    return e.message || fallback
  }
  return e instanceof Error ? e.message || fallback : fallback
}
