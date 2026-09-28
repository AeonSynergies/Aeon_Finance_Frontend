import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUploadTimecardDocument } from '@/hooks/useTimecard'
import { DOC_TYPES } from '@/lib/timecard'
import { apiError } from '@/services/client'
import { uploadDocumentSchema, type UploadDocumentValues } from '@/schemas/timecard'
import type { TimecardJob, UploadDocType } from '@/types/timecard'
import { FormField } from './FormField'

interface Props {
  job: TimecardJob
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-select a doc type / date (e.g. from a "missing" checklist item). */
  initial?: { docType?: UploadDocType; date?: string }
}

export function UploadDocumentDialog({ job, open, onOpenChange, initial }: Props) {
  const upload = useUploadTimecardDocument(job.id)
  const { control, register, handleSubmit, watch, reset, formState: { errors } } = useForm<UploadDocumentValues>({
    resolver: zodResolver(uploadDocumentSchema),
    defaultValues: { docType: 'PAYROLL_TIMECARD' },
  })

  useEffect(() => {
    if (open) reset({ docType: initial?.docType ?? 'PAYROLL_TIMECARD', date: initial?.date ?? '', file: undefined })
    else upload.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const docType = watch('docType')
  const meta = DOC_TYPES[docType]
  const minDate = job.periodStart.slice(0, 10)
  const maxDate = job.periodEnd.slice(0, 10)

  const onSubmit = handleSubmit(async (values) => {
    try {
      const doc = await upload.mutateAsync({ ...values, date: meta.requiresDate ? values.date : undefined })
      const rows = doc.rowCount != null ? ` · ${doc.rowCount} record(s) parsed` : ''
      toast.success(`${meta.label} uploaded (v${doc.version})${rows}`)
      onOpenChange(false)
    } catch (e) {
      toast.error(apiError(e, 'Upload failed'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !upload.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload source file</DialogTitle>
          <DialogDescription>Uploading an identical file again is ignored; a changed file becomes a new version.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField id="docType" label="File type" error={errors.docType?.message} hint={meta.hint}>
            <Controller
              control={control}
              name="docType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="docType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DOC_TYPES) as UploadDocType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {DOC_TYPES[t].label}
                        {DOC_TYPES[t].required ? '' : ' (optional)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          {meta.requiresDate && (
            <FormField id="date" label="Date covered" error={errors.date?.message}>
              <Input id="date" type="date" min={minDate} max={maxDate} aria-invalid={!!errors.date} {...register('date')} />
            </FormField>
          )}
          <FormField id="file" label="File" error={errors.file?.message} hint={`Accepted: ${meta.accept} · max 20 MB`}>
            <Controller
              control={control}
              name="file"
              render={({ field }) => (
                <Input
                  id="file"
                  type="file"
                  accept={meta.accept}
                  aria-invalid={!!errors.file}
                  onChange={(e) => field.onChange(e.target.files?.[0])}
                />
              )}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={upload.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={upload.isPending} className="gap-1.5">
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {upload.isPending ? 'Uploading…' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
