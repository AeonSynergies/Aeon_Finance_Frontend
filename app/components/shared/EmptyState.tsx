import type { LucideIcon } from 'lucide-react'
import { FileX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  /** e.g. a "Create job" button */
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, icon: Icon = FileX, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <Icon className="h-10 w-10 text-muted-foreground mb-3" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
