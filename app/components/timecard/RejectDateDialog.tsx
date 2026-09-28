import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useRejectTimecardDate } from '@/hooks/useTimecard'
import { formatDay } from '@/lib/timecard'
import { apiError } from '@/services/client'
import { rejectDateSchema, type RejectDateValues } from '@/schemas/timecard'
import { FormField } from './FormField'

interface Props {
  jobId: string
  date: string | null
  onClose: () => void
}

export function RejectDateDialog({ jobId, date, onClose }: Props) {
  const reject = useRejectTimecardDate(jobId)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RejectDateValues>({
    resolver: zodResolver(rejectDateSchema),
    defaultValues: { rejectionComments: '' },
  })

  useEffect(() => {
    if (date) reset({ rejectionComments: '' })
    else reject.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const onSubmit = handleSubmit(async ({ rejectionComments }) => {
    if (!date) return
    try {
      await reject.mutateAsync({ date, comments: rejectionComments })
      toast.success(`${formatDay(date)} sent back to the executive`)
      onClose()
    } catch (e) {
      toast.error(apiError(e, 'Could not reject the date'))
    }
  })

  return (
    <Dialog open={!!date} onOpenChange={(o) => !o && !reject.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject {date ? formatDay(date) : ''}</DialogTitle>
          <DialogDescription>The date goes back to the executive with your comments.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField id="rejectionComments" label="What needs fixing?" error={errors.rejectionComments?.message}>
            <Textarea id="rejectionComments" rows={4} autoFocus aria-invalid={!!errors.rejectionComments} {...register('rejectionComments')} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={reject.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={reject.isPending}>
              {reject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reject date
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
