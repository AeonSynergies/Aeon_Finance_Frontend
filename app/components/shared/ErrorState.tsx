import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiError, apiStatus } from '@/services/client'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  error: unknown
  title?: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
  compact?: boolean
}

/** Standard error block for failed queries: message from the API + retry. */
export function ErrorState({ error, title, onRetry, retrying, className, compact }: ErrorStateProps) {
  const status = apiStatus(error)
  const heading = title ?? (status === 404 ? 'Not found' : status === 403 ? 'Access denied' : 'Something went wrong')
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 py-6' : 'gap-3 py-14',
        className,
      )}
    >
      <AlertTriangle className={cn('text-destructive', compact ? 'h-6 w-6' : 'h-9 w-9')} aria-hidden />
      <div>
        <p className="text-sm font-semibold">{heading}</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">{apiError(error)}</p>
      </div>
      {onRetry && status !== 403 && status !== 404 && (
        <Button size="sm" variant="outline" onClick={onRetry} disabled={retrying} className="gap-1.5">
          <RefreshCw className={cn('h-3.5 w-3.5', retrying && 'animate-spin')} /> {retrying ? 'Retrying…' : 'Try again'}
        </Button>
      )}
    </div>
  )
}
