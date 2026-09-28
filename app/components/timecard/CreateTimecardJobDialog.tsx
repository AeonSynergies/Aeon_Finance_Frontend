import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateTimecardJob } from '@/hooks/useTimecard'
import { apiError, apiStatus } from '@/services/client'
import { createTimecardJobSchema, type CreateTimecardJobValues } from '@/schemas/timecard'
import type { TimecardJob } from '@/types/timecard'
import { FormField } from './FormField'

const addDays = (key: string, n: number) => {
  const t = Date.parse(`${key}T00:00:00Z`)
  return Number.isNaN(t) ? '' : new Date(t + n * 86_400_000).toISOString().slice(0, 10)
}
const SPAN = { DAILY: 0, WEEKLY: 6, BIWEEKLY: 13 } as const

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (job: TimecardJob) => void
}

export function CreateTimecardJobDialog({ open, onOpenChange, onCreated }: Props) {
  const create = useCreateTimecardJob()
  const form = useForm<CreateTimecardJobValues>({
    resolver: zodResolver(createTimecardJobSchema),
    defaultValues: { frequency: 'WEEKLY', periodStart: '', periodEnd: '', processDate: '' },
  })
  const { register, control, handleSubmit, setValue, watch, reset, setError, formState } = form
  const { errors } = formState

  const [frequency, periodStart] = watch(['frequency', 'periodStart'])

  // Pre-fill the period end (and a process date 3 days later) from the start + frequency.
  useEffect(() => {
    if (!periodStart) return
    const end = addDays(periodStart, SPAN[frequency])
    setValue('periodEnd', end, { shouldValidate: formState.isSubmitted })
    setValue('processDate', addDays(end, 3), { shouldValidate: formState.isSubmitted })
  }, [frequency, periodStart, setValue, formState.isSubmitted])

  useEffect(() => {
    if (!open) {
      reset()
      create.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const job = await create.mutateAsync(values)
      toast.success(`Job ${job.jobId} created`)
      onCreated(job)
      onOpenChange(false)
    } catch (e) {
      // 409 = a job for this period already exists → show it on the period field.
      if (apiStatus(e) === 409) setError('periodStart', { message: apiError(e) })
      else toast.error(apiError(e, 'Could not create the job'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New timecard job</DialogTitle>
          <DialogDescription>The job ID is generated from the frequency and period start.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField id="frequency" label="Frequency" error={errors.frequency?.message}>
            <Controller
              control={control}
              name="frequency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="periodStart" label="Period start" error={errors.periodStart?.message}>
              <Input id="periodStart" type="date" aria-invalid={!!errors.periodStart} {...register('periodStart')} />
            </FormField>
            <FormField id="periodEnd" label="Period end" error={errors.periodEnd?.message}>
              <Input id="periodEnd" type="date" aria-invalid={!!errors.periodEnd} {...register('periodEnd')} />
            </FormField>
          </div>
          <FormField id="processDate" label="Process date" error={errors.processDate?.message} hint="When payroll will be processed.">
            <Input id="processDate" type="date" aria-invalid={!!errors.processDate} {...register('processDate')} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create job
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
