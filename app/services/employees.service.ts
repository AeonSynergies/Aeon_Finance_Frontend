import { api, mock, unwrap, USE_MOCKS } from './client'
import { db, newId, now } from '@/mocks/store'

type Obj = Record<string, unknown>
const matches = (o: Obj, q: string) =>
  Object.values(o).some((v) => typeof v === 'string' && v.toLowerCase().includes(q.toLowerCase()))

export const employeesService = {
  list: (search?: string): Promise<Obj[]> =>
    USE_MOCKS ? mock(db.employees.filter((e) => !search || matches(e, search))) : unwrap(api.get('/employees', { params: { search } })),
  create: (body: Obj): Promise<Obj> => {
    if (!USE_MOCKS) return unwrap(api.post('/employees', body))
    const e = { id: newId(), status: 'active', createdAt: now(), ...body }
    db.employees.push(e)
    return mock(e)
  },
}
