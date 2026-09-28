// Plain mock data: arrays and objects loaded from ./data/*.json.
// Kept in memory so create/update/delete show up in the UI; a reload resets it.
import type { AppSettings, Job, JobDocument, RateCard, ValidationRow } from '@/types'
import settings from './data/settings.json'
import rateCards from './data/rateCards.json'
import employees from './data/employees.json'
import vehicles from './data/vehicles.json'
import jobs from './data/jobs.json'
import documents from './data/documents.json'
import rows from './data/rows.json'
import auditEntries from './data/auditEntries.json'
import payrollSummaries from './data/payrollSummaries.json'
import analytics from './data/analytics.json'
import calendar from './data/calendar.json'
import reports from './data/reports.json'

type Obj = Record<string, unknown>

const clone = <T,>(v: unknown) => structuredClone(v) as T

export const db = {
  settings: clone<AppSettings>(settings),
  rateCards: clone<RateCard[]>(rateCards),
  employees: clone<Obj[]>(employees),
  vehicles: clone<Obj[]>(vehicles),
  jobs: clone<Job[]>(jobs),
  documents: clone<JobDocument[]>(documents),
  rows: clone<ValidationRow[]>(rows),
  auditEntries: clone<(Obj & { jobId: string })[]>(auditEntries),
  payrollSummaries: payrollSummaries as Record<string, unknown>,
  analytics: analytics as Record<'payroll' | 'routes' | 'fleet' | 'finance' | 'payrollExceptions', unknown>,
  calendar: calendar as unknown,
  reports: reports as Record<string, string>,
}

export const newId = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
export const now = () => new Date().toISOString()
