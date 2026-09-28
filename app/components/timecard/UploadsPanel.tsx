import { useMemo, useState } from 'react'
import { CheckCircle2, CircleDashed, FileSpreadsheet, Loader2, PlayCircle, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { TableSkeleton } from '@/components/shared/Skeletons'
import { useTimecardPermissions, useTimecardUploads, useValidateTimecardJob } from '@/hooks/useTimecard'
import { DOC_TYPES, dateKey, formatDate, formatDateTime, formatDay, latestUploads, periodDates, validationBlocker } from '@/lib/timecard'
import { apiError } from '@/services/client'
import { cn } from '@/lib/utils'
import type { TimecardJob, UploadDocType } from '@/types/timecard'
import { UploadDocumentDialog } from './UploadDocumentDialog'

interface Props {
  job: TimecardJob
  readOnly: boolean
  /** Called after a successful validation run (e.g. to switch to the rows tab). */
  onValidated?: () => void
}

export function UploadsPanel({ job, readOnly, onValidated }: Props) {
  const perms = useTimecardPermissions()
  const uploads = useTimecardUploads(job.id)
  const validate = useValidateTimecardJob(job.id)
  const [dialog, setDialog] = useState<{ docType?: UploadDocType; date?: string } | null>(null)

  const docs = uploads.data ?? []
  const latest = useMemo(() => latestUploads(docs), [docs])
  const dates = useMemo(() => periodDates(job), [job])
  const has = (t: UploadDocType, d?: string) => latest.some((x) => x.docType === t && (!d || (x.date && dateKey(x.date) === d)))
  const blocker = validationBlocker(latest)
  const canUpload = perms.canUpload && !readOnly

  async function runValidation() {
    try {
      const rows = await validate.mutateAsync()
      if (rows.length === 0) toast.warning('Validation ran but produced no rows — check the payroll export dates match the job period.')
      else toast.success(`Validated ${rows.length} row(s)`)
      onValidated?.()
    } catch (e) {
      toast.error(apiError(e, 'Validation failed'))
    }
  }

  if (uploads.isPending) return <TableSkeleton rows={5} cols={5} />
  if (uploads.isError) return <ErrorState error={uploads.error} onRetry={() => uploads.refetch()} retrying={uploads.isFetching} />

  const itineraryMissing = dates.filter((d) => !has('AMAZON_ACTIVITY', d))

  return (
    <div className="space-y-5 p-4">
      {/* Checklist + actions */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2 text-sm">
          <ChecklistItem done={has('PAYROLL_TIMECARD')} label="Payroll export" detail="One file for the whole period"
            onUpload={canUpload ? () => setDialog({ docType: 'PAYROLL_TIMECARD' }) : undefined} />
          <ChecklistItem
            done={itineraryMissing.length === 0}
            partial={itineraryMissing.length < dates.length}
            label="Amazon itinerary"
            detail={itineraryMissing.length === 0 ? `All ${dates.length} day(s)` : `Missing: ${itineraryMissing.map(formatDay).join(', ')}`}
            onUpload={canUpload ? () => setDialog({ docType: 'AMAZON_ACTIVITY', date: itineraryMissing[0] }) : undefined}
          />
          <ChecklistItem
            done={dates.every((d) => has('AMAZON_BREAK', d))}
            partial={dates.some((d) => has('AMAZON_BREAK', d))}
            optional
            label="Amazon break report"
            detail="Improves meal-break checks"
            onUpload={canUpload ? () => setDialog({ docType: 'AMAZON_BREAK' }) : undefined}
          />
        </div>
        {!readOnly && (perms.canUpload || perms.canValidate) && (
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex gap-2">
              {perms.canUpload && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialog({})}>
                  <UploadCloud className="h-4 w-4" /> Upload file
                </Button>
              )}
              {perms.canValidate && (
                <Button size="sm" className="gap-1.5" onClick={runValidation} disabled={!!blocker || validate.isPending}>
                  {validate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                  {validate.isPending ? 'Validating…' : 'Run validation'}
                </Button>
              )}
            </div>
            {perms.canValidate && blocker && <p className="text-[11px] text-muted-foreground">{blocker}</p>}
            {perms.canValidate && !blocker && (
              <p className="text-[11px] text-muted-foreground">Re-run after uploading new versions; overrides are kept per row.</p>
            )}
          </div>
        )}
      </div>

      {/* History */}
      {docs.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No files uploaded yet"
          description={canUpload ? 'Start with the payroll export, then add an Amazon itinerary for each day.' : 'The executive hasn’t uploaded any source files for this job.'}
          action={canUpload && <Button size="sm" onClick={() => setDialog({ docType: 'PAYROLL_TIMECARD' })}>Upload payroll export</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-semibold">File</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Version</th>
                <th className="px-3 py-2 font-semibold text-right">Records</th>
                <th className="px-3 py-2 font-semibold">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => {
                const isLatest = latest.some((l) => l.id === d.id)
                return (
                  <tr key={d.id} className={cn('border-t', !isLatest && 'text-muted-foreground')}>
                    <td className="max-w-[240px] truncate px-3 py-2 font-medium" title={d.fileName}>{d.fileName}</td>
                    <td className="px-3 py-2">{DOC_TYPES[d.docType]?.label ?? d.docType}</td>
                    <td className="px-3 py-2">{d.date ? formatDate(d.date) : '—'}</td>
                    <td className="px-3 py-2">
                      v{d.version}
                      {!isLatest && <span className="ml-1 text-[11px]">(superseded)</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.rowCount ?? '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(d.uploadedAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <UploadDocumentDialog job={job} open={!!dialog} onOpenChange={(o) => !o && setDialog(null)} initial={dialog ?? undefined} />
    </div>
  )
}

function ChecklistItem({
  done, partial, optional, label, detail, onUpload,
}: { done: boolean; partial?: boolean; optional?: boolean; label: string; detail: string; onUpload?: () => void }) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-success" aria-label="Uploaded" />
      ) : (
        <CircleDashed className={cn('h-4 w-4', partial ? 'text-warning' : 'text-muted-foreground')} aria-label="Missing" />
      )}
      <span className="font-semibold">{label}</span>
      {optional && <span className="text-[11px] text-muted-foreground">(optional)</span>}
      <span className="text-xs text-muted-foreground">— {detail}</span>
      {!done && onUpload && (
        <button type="button" onClick={onUpload} className="text-xs font-semibold text-primary hover:underline">
          Upload
        </button>
      )}
    </div>
  )
}
