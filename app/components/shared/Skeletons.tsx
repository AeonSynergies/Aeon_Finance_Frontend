import { Skeleton } from '@/components/ui/skeleton'

/** Placeholder rows for a data table while it loads. */
export function TableSkeleton({ rows = 8, cols = 8 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-2 p-4" aria-busy="true" aria-label="Loading">
      <div className="flex gap-3">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className="h-8 flex-1 opacity-70" />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Placeholder for a row of KPI / summary cards. */
export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
  )
}
