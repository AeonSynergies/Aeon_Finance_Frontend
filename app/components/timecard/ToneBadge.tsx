import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/timecard'

const TONES: Record<Tone, string> = {
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning-foreground',
  danger: 'border-destructive/25 bg-destructive/10 text-destructive',
  info: 'border-info/25 bg-info/10 text-info',
  primary: 'border-primary/25 bg-primary/10 text-primary',
  muted: 'border-border bg-muted text-muted-foreground',
}

export function ToneBadge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold', TONES[tone], className)}>
      {children}
    </span>
  )
}
