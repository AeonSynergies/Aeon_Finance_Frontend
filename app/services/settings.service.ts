import { api, mock, unwrap, USE_MOCKS } from './client'
import { db } from '@/mocks/store'
import type { AppSettings } from '@/types'

export const settingsService = {
  get: (): Promise<AppSettings> => (USE_MOCKS ? mock(db.settings) : unwrap(api.get('/settings'))),
  update: (body: Partial<AppSettings>): Promise<AppSettings> =>
    USE_MOCKS ? mock(Object.assign(db.settings, body)) : unwrap(api.patch('/settings', body)),
}
