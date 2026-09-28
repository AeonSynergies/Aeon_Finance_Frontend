import { useEffect, useRef } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDate, formatDateTime, isRowResolved, ruleLabel, statusLabel, statusTone } from '@/lib/timecard'
import { cn } from '@/lib/utils'
import type { BreakSegment, TimecardRow } from '@/types/timecard'
import { ToneBadge } from './ToneBadge'

const t = (v: string | null | undefined) => v || '—'
const breaks = (segs: BreakSegment[] | null | undefined) =>
  Array.isArray(segs) && segs.length ? segs.map((b) => `${t(b.breakOut)}–${t(b.breakIn)}`).join(', ') : '—'

interface Props {
  rows: TimecardRow[]
  /** Rows the backend reported as blocking a date submission. */
  highlightIds: Set<string>
  canOverride: boolean
  onOverride: (row: TimecardRow) => void
}

const HEAD = [
  'Date', 'Payroll name', 'Amazon match', 'Earn code',
  'Pay login', 'App login', 'Physical login',
  'Pay break', 'Amazon breaks',
  'Pay logout', 'App logout', 'Last stop',
  'Status', 'Rule', 'Detail', 'Override',
]

export function TimecardRowsTable({ rows, highlightIds, canOverride, onOverride }: Props) {
  const firstBlocked = useRef<HTMLTableRowElement>(null)

  // Bring the first blocking row into view after a rejected submit.
  useEffect(() => {
    if (highlightIds.size) firstBlocked.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightIds])

  let seenBlocked = false
  return (
    <TooltipProvider delayDuration={200}>
      <div className="aeon-table-scroll max-h-[65vh]">
        <table className="w-full min-w-[1500px] text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              {HEAD.map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>
              ))}
              {canOverride && <th className="px-3 py-2" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const blocked = highlightIds.has(r.id)
              const ref = blocked && !seenBlocked ? ((seenBlocked = true), firstBlocked) : undefined
              const extra = Array.isArray(r.additionalTriggeredRules) ? r.additionalTriggeredRules : []
              return (
                <tr
                  key={r.id}
                  ref={ref}
                  className={cn(
                    'border-t align-top hover:bg-muted/40',
                    blocked && 'bg-destructive/5 outline outline-1 -outline-offset-1 outline-destructive/40',
                  )}
                >
                  <td className="whitespace-nowrap px-3 py-2">{formatDate(r.date)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold">{r.rawPayrollName}</td>
                  <td className="whitespace-nowrap px-3 py-2">{t(r.rawAmazonName)}</td>
                  <td className="px-3 py-2">{t(r.earnCode)}</td>
                  <td className="px-3 py-2 tabular-nums">{t(r.payLogin)}</td>
                  <td className="px-3 py-2 tabular-nums">{t(r.appLogin)}</td>
                  <td className="px-3 py-2 tabular-nums">{t(r.physicalLogin)}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {r.payBreakOut || r.payBreakIn ? `${t(r.payBreakOut)}–${t(r.payBreakIn)}` : '—'}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{breaks(r.amazonBreaks)}</td>
                  <td className="px-3 py-2 tabular-nums">{t(r.payLogout)}</td>
                  <td className="px-3 py-2 tabular-nums">{t(r.appLogout)}</td>
                  <td className="px-3 py-2 tabular-nums">{t(r.lastStop)}</td>
                  <td className="px-3 py-2">
                    <ToneBadge tone={statusTone(r.validationStatus)}>{statusLabel(r.validationStatus)}</ToneBadge>
                    {r.approvalStatus === 'APPROVED' && <div className="mt-1 text-[10px] font-semibold text-success">Approved</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {ruleLabel(r.triggeredRule)}
                    {extra.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="ml-1 rounded bg-muted px-1 text-[10px] font-semibold">+{extra.length}</button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          {extra.map((x) => (
                            <div key={x.rule}>
                              {ruleLabel(x.rule)}: {x.outcome?.status ? statusLabel(x.outcome.status) : ''} {x.outcome?.detail ?? ''}
                            </div>
                          ))}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </td>
                  <td className="max-w-[260px] px-3 py-2 text-muted-foreground">{t(r.detail)}</td>
                  <td className="max-w-[220px] px-3 py-2">
                    {r.overriddenAt ? (
                      <span title={r.overriddenAt ? `Overridden ${formatDateTime(r.overriddenAt)}` : undefined}>
                        <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-success" />
                        {t(r.overrideNote)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  {canOverride && (
                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        variant={isRowResolved(r) ? 'ghost' : 'outline'}
                        className="h-7 px-2 text-[11px]"
                        onClick={() => onOverride(r)}
                        disabled={r.approvalStatus === 'APPROVED'}
                        title={r.approvalStatus === 'APPROVED' ? 'Approved rows can’t be changed' : undefined}
                      >
                        Override
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  )
}
