import { api, mock, unwrap, USE_MOCKS } from './client'
import { db, newId, now } from '@/mocks/store'

type Obj = Record<string, unknown>

export const vehiclesService = {
  list: (opStatus?: string): Promise<Obj[]> =>
    USE_MOCKS ? mock(db.vehicles.filter((v) => !opStatus || v.opStatus === opStatus)) : unwrap(api.get('/vehicles', { params: { opStatus } })),
  create: (body: Obj): Promise<Obj> => {
    if (!USE_MOCKS) return unwrap(api.post('/vehicles', body))
    const v = { id: newId(), opStatus: 'Operational', createdAt: now(), ...body }
    db.vehicles.push(v)
    return mock(v)
  },
}
