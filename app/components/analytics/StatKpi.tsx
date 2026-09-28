import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowUp, ArrowDown, ArrowRight, type LucideIcon } from 'lucide-react'

export interface TrendInfo {
  pct: number
  direction: 'up' | 'down' | 'flat'
}

interface StatKpiProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: TrendInfo
  color?: 'blue' | 'green' | 'red' | 'orange' | 'gray'
}

const ICON_COLORS = {
  blue: 'text-blue-600 bg-blue-50',
  green: 'text-green-600 bg-green-50',
  red: 'text-red-600 bg-red-50',
  orange: 'text-orange-600 bg-orange-50',
  gray: 'text-gray-600 bg-gray-50',
}

export function StatKpi({ label, value, icon: Icon, trend, color = 'blue' }: StatKpiProps) {
  const TrendIcon = trend?.direction === 'up' ? ArrowUp : trend?.direction === 'down' ? ArrowDown : ArrowRight
  const trendColor =
    trend?.direction === 'up' ? 'text-green-600' : trend?.direction === 'down' ? 'text-red-600' : 'text-muted-foreground'

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
            {trend && (
              <p className={cn('mt-1 flex items-center gap-1 text-xs font-medium', trendColor)}>
                <TrendIcon className="h-3 w-3" />
                {Math.abs(trend.pct)}% vs prior
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn('rounded-lg p-2 shrink-0', ICON_COLORS[color])}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
