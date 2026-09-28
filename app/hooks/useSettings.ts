import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsService } from '@/services/settings.service'
import type { AppSettings } from '@/types'
import { qk } from './queryKeys'

export function useSettings() {
  return useQuery({ queryKey: qk.settings, queryFn: settingsService.get, retry: false })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<AppSettings>) => settingsService.update(body),
    onSuccess: (data) => qc.setQueryData(qk.settings, data),
  })
}
