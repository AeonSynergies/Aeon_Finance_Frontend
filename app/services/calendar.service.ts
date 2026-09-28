import { api, mock, unwrap, USE_MOCKS } from './client'
import { db } from '@/mocks/store'

export const calendarService = {
  get: <T = unknown,>(): Promise<T> => (USE_MOCKS ? mock(db.calendar as T) : unwrap(api.get<T>('/calendar'))),
}
