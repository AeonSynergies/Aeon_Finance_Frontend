import * as XLSX from 'xlsx'
import { api, mock, mockFail, unwrap, USE_MOCKS } from './client'
import { UPLOAD_MASTERS } from '@/components/upload/uploadMasters'

type Obj = Record<string, unknown>

// Mock-only: read the chosen sheet so the preview shows the user's real file.
// ponytail: no validation/reconciliation here — that is the backend's job.
async function readSheet(file: FormDataEntryValue | null): Promise<Obj[]> {
  if (!(file instanceof File)) return []
  const wb = XLSX.read(await file.arrayBuffer())
  return XLSX.utils.sheet_to_json<Obj>(wb.Sheets[wb.SheetNames[0]], { defval: '' })
}

const today = () => new Date().toISOString().slice(0, 10)

export const uploadService = {
  /** Quick upload from the header sheet (file1 or amazonFile/adpFile + jobId + section). */
  upload: async <T = unknown,>(form: FormData): Promise<T> => {
    if (!USE_MOCKS) return unwrap(api.post<T>('/upload', form))
    const rows = await readSheet(form.get('file1') ?? form.get('amazonFile'))
    if (form.get('section') === 'TIMECARD') {
      const drivers = new Set(rows.map((r) => r['Name'] ?? r['Driver Name'])).size
      return mock({
        summary: {
          total: rows.length, drivers, deliveryWorkers: drivers, supportWorkers: 0, salaried: 0, noError: rows.length,
          logoutMismatch: 0, supportHoursExceeded: 0, missingPayrollRows: 0, ptoTraining: 0, capFlagged: 0, otDetected: 0,
        },
      } as T)
    }
    const columns = Object.keys(rows[0] ?? {})
    return mock({ summary: { docType: String(form.get('section')), rows: rows.length, columnsFound: columns, columnsMissing: [] } } as T)
  },

  /** Step 1 of the upload wizard: parse + preview. */
  process: async <T = unknown,>(form: FormData): Promise<T> => {
    if (!USE_MOCKS) return unwrap(api.post<T>('/upload/process', form))
    const rows = await readSheet(form.get('file'))
    if (!rows.length) return mockFail(422, 'No data rows found in the file')
    const master = UPLOAD_MASTERS.find((m) => m.id === form.get('masterId'))
    const detectedColumns = Object.keys(rows[0])
    const missing = (master?.requiredColumns ?? []).filter((c) => !detectedColumns.includes(c))
    const date = String(form.get('reportDate') || today())
    return mock({
      success: missing.length === 0,
      rowCount: rows.length, validRows: rows.length, errorRows: 0, warningRows: 0,
      detectedColumns, sampleRows: rows.slice(0, 50),
      errors: missing.map((c) => `Missing required column: ${c}`), warnings: [],
      processedRowsByDate: { [date]: rows },
      detectedDateRange: { start: date, end: date },
    } as T)
  },

  /** Final step of the upload wizard: import into the job. */
  submit: async <T = unknown,>(form: FormData): Promise<T> => {
    if (!USE_MOCKS) return unwrap(api.post<T>('/upload/submit', form))
    const byDate = JSON.parse(String(form.get('processedRowsByDate') ?? '{}')) as Record<string, Obj[]>
    const master = UPLOAD_MASTERS.find((m) => m.id === form.get('masterId'))
    const total = Object.values(byDate).reduce((n, r) => n + r.length, 0)
    const dates = Object.keys(byDate).sort()
    return mock({
      success: true, rowsProcessed: total, rowsImported: total, rowsSkipped: 0,
      module: master?.module ?? '', jobId: (form.get('jobId') as string) || null, issues: [],
      summary: dates.map((date) => ({ date, total: byDate[date].length, validated: byDate[date].length, needsReview: 0, reconciled: true })),
      message: 'Mock upload: rows were not persisted.',
      reconciliation: { total, validated: total, needsReview: 0 },
      ...(dates.length ? { dateRange: { start: dates[0], end: dates[dates.length - 1] } } : {}),
    } as T)
  },
}
