import { z } from 'zod'

const int = z.number({ error: 'Required' }).int('Must be a whole number').min(0, 'Must be ≥ 0')
const num = z.number({ error: 'Required' }).min(0, 'Must be ≥ 0')

// Mirrors the PATCH /settings server schema.
export const settingsSchema = z.object({
  loginBuffer: int,
  logoutBuffer: int,
  breakBuffer: int,
  dailyOtThreshold: num,
  weeklyOtThreshold: num,
  maxConsecutiveDays: int,
  minRestPeriod: num,
  wstDisputeWindow: int,
  invoiceDisputeWindow: int,
  supportMaxHours: num,
  stationName: z.string(),
  dspName: z.string(),
})

export type SettingsInput = z.infer<typeof settingsSchema>
