import { api, mock, mockFail, unwrap, USE_MOCKS } from './client'
import { db, newId } from '@/mocks/store'
import type { RateCard } from '@/types'

export const rateCardsService = {
  list: (params: { module?: string; includeInactive?: boolean } = {}): Promise<RateCard[]> =>
    USE_MOCKS
      ? mock(db.rateCards.filter((r) => (!params.module || r.module === params.module) && (params.includeInactive || r.isActive)))
      : unwrap(api.get('/rate-cards', { params })),

  create: (body: Omit<RateCard, 'id' | 'isActive' | 'surgeRate'> & { surgeRate?: number | null }): Promise<RateCard> => {
    if (!USE_MOCKS) return unwrap(api.post('/rate-cards', body))
    const rc: RateCard = { id: newId(), isActive: true, ...body, surgeRate: body.surgeRate ?? null }
    db.rateCards.unshift(rc)
    return mock(rc)
  },

  update: (id: string, body: Partial<Omit<RateCard, 'id' | 'module' | 'code'>>): Promise<RateCard> => {
    if (!USE_MOCKS) return unwrap(api.patch(`/rate-cards/${id}`, body))
    const rc = db.rateCards.find((r) => r.id === id)
    if (!rc) return mockFail(404, 'Rate card not found')
    return mock(Object.assign(rc, body))
  },
}
