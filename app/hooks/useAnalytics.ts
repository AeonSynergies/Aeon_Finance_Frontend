import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '@/services/analytics.service'
import { qk } from './queryKeys'

export function usePayrollExceptions<T = unknown>() {
  return useQuery({ queryKey: qk.analytics('payroll-exceptions'), queryFn: () => analyticsService.payrollExceptions<T>() })
}
