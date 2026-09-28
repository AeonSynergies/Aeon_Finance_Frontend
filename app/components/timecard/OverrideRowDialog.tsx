import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useOverrideTimecardRow } from '@/hooks/useTimecard'
import { OVERRIDE_STATUSES, formatDate, statusLabel } from '@/lib/timecard'
import { apiError } from '@/services/client'
import { overrideRowSchema, type OverrideRowValues } from '@/schemas/timecard'
import type { TimecardRow } from '@/types/timecard'
import { FormField } from './FormField'

interface Props {
  jobId: string
  row: TimecardRow | null
  onClose: () => void
}

export function OverrideRowDialog({ jobId, row, onClose }: Props) {
  const override = useOverrideTimecardRow(jobId)
  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<OverrideRowValues>({
    resolver: zodResolver(overrideRowSchema),
    defaultValues: { newStatus: 'GOOD_NO_ERROR', reason: '', note: '' },
  })

  useEffect(() => {
    if (row) reset({ newStatus: 'GOOD_NO_ERROR', reason: '', note: '' })
    else override.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id])

  const onSubmit = handleSubmit(async ({ note, ...values }) => {
    if (!row) return
    try {
      await override.mutateAsync({ rowId: row.id, ...values, ...(note ? { note } : {}) })
      toast.success(`Override saved for ${row.rawPayrollName}`)
      onClose()
    } catch (e) {
      toast.error(apiError(e, 'Could not save the override'))
    }
  })

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && !override.isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Override validation</DialogTitle>
          {row && (
            <DialogDescription>
              {row.rawPayrollName} · {formatDate(row.date)} · currently <strong>{statusLabel(row.validationStatus)}</strong>
              {row.detail ? ` — ${row.detail}` : ''}
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField id="newStatus" label="New status" error={errors.newStatus?.message}>
            <Controller
              control={control}
              name="newStatus"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="newStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {OVERRIDE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="reason" label="Reason (required)" error={errors.reason?.message} hint="Recorded in the audit trail.">
            <Textarea id="reason" rows={3} aria-invalid={!!errors.reason} placeholder="e.g. Driver's explanation verified by dispatch" {...register('reason')} />
          </FormField>
          <FormField id="note" label="Note (optional)" error={errors.note?.message}>
            <Textarea id="note" rows={2} {...register('note')} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={override.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={override.isPending}>
              {override.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save override
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
