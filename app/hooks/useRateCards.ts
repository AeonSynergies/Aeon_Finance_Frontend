import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rateCardsService } from '@/services/rateCards.service'
import type { RateCard } from '@/types'
import { qk } from './queryKeys'

export function useRateCards(module: string) {
  return useQuery({ queryKey: qk.rateCards(module), queryFn: () => rateCardsService.list({ module }) })
}

export function useUpdateRateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Omit<RateCard, 'id' | 'module' | 'code'>> }) =>
      rateCardsService.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rate-cards'] }),
  })
}
