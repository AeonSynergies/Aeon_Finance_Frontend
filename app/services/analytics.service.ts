import { api, mock, unwrap, USE_MOCKS } from './client'
import { db } from '@/mocks/store'

type Period = string | null | undefined
// ponytail: mock analytics are one fixed snapshot; `period` only matters for the real API.
const get = <T,>(key: keyof typeof db.analytics, url: string, period?: Period): Promise<T> =>
  USE_MOCKS ? mock(db.analytics[key] as T) : unwrap(api.get<T>(url, { params: { period } }))

export const analyticsService = {
  payroll: <T = unknown,>(period?: Period) => get<T>('payroll', '/analytics/payroll', period),
  routes: <T = unknown,>(period?: Period) => get<T>('routes', '/analytics/routes', period),
  fleet: <T = unknown,>(period?: Period) => get<T>('fleet', '/analytics/fleet', period),
  finance: <T = unknown,>(period?: Period) => get<T>('finance', '/analytics/finance', period),
  payrollExceptions: <T = unknown,>() => get<T>('payrollExceptions', '/analytics/payroll-exceptions'),
}
