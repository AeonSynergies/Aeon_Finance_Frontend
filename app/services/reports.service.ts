import { api, mock, mockFail, USE_MOCKS } from './client'
import { db } from '@/mocks/store'

type Period = string | null | undefined

export const reportsService = {
  /** Report CSV as a Blob plus the server-suggested filename. */
  download: async (report: string, period?: Period) => {
    if (USE_MOCKS) {
      const csv = db.reports[report]
      if (!csv) return mockFail(404, `Unknown report: ${report}`)
      await mock(null)
      return { blob: new Blob([csv], { type: 'text/csv' }), filename: `${report}.csv` } // Blob isn't cloned by mock()
    }
    const res = await api.get<Blob>(`/reports/${report}`, { params: { period }, responseType: 'blob' })
    const cd = String(res.headers['content-disposition'] ?? '')
    const filename = /filename="?([^";]+)"?/.exec(cd)?.[1] ?? `${report}.csv`
    return { blob: res.data, filename }
  },
}
