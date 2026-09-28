// Central query keys so mutations can invalidate precisely.
export const qk = {
  jobs: {
    all: ['jobs'] as const,
    list: (params: { module?: string; status?: string } = {}) => ['jobs', 'list', params] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
    rows: (id: string, rowType?: string) => ['jobs', 'rows', id, rowType ?? 'all'] as const,
    documents: (id: string) => ['jobs', 'documents', id] as const,
    audit: (id: string) => ['jobs', 'audit', id] as const,
    disputes: (id: string) => ['jobs', 'disputes', id] as const,
    payrollSummary: (id: string) => ['jobs', 'payroll-summary', id] as const,
  },
  /** NestJS timecard API (real backend). */
  timecard: {
    all: ['timecard'] as const,
    jobs: ['timecard', 'jobs'] as const,
    job: (id: string) => ['timecard', 'job', id] as const,
    uploads: (id: string) => ['timecard', 'uploads', id] as const,
    rowsAll: (id: string) => ['timecard', 'rows', id] as const,
    rows: (id: string, params: { date?: string; status?: string } = {}) => ['timecard', 'rows', id, params] as const,
    dates: (id: string) => ['timecard', 'dates', id] as const,
    audit: (id: string) => ['timecard', 'audit', id] as const,
  },
  me: ['me'] as const,
  team: {
    all: ['team'] as const,
    modules: ['team', 'modules'] as const,
    roles: ['team', 'roles'] as const,
    members: ['team', 'members'] as const,
    invitations: ['team', 'invitations'] as const,
  },
  settings: ['settings'] as const,
  rateCards: (module?: string) => ['rate-cards', module ?? 'all'] as const,
  analytics: (kind: string, period?: string | null) => ['analytics', kind, period ?? 'all'] as const,
  calendar: ['calendar'] as const,
}
