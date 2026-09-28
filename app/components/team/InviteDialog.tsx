import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Copy, Loader2, MailPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField } from '@/components/timecard/FormField'
import { useCreateInvitation, useTeamAbilities } from '@/hooks/useTeam'
import { formatDateTime } from '@/lib/timecard'
import { apiError, apiStatus } from '@/services/client'
import { inviteLink } from '@/services/team.service'
import { inviteSchema, type InviteValues } from '@/schemas/team'
import type { CreatedInvitation, TeamRole } from '@/types/team'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: TeamRole[]
  /** Pre-select a role (e.g. right after creating it) and/or pre-fill a resend. */
  initial?: { roleId?: string; email?: string; name?: string | null }
}

export function InviteDialog({ open, onOpenChange, roles, initial }: Props) {
  const invite = useCreateInvitation()
  const { canAssignRole } = useTeamAbilities()
  const assignable = roles.filter(canAssignRole)
  const [created, setCreated] = useState<CreatedInvitation | null>(null)
  const { control, register, handleSubmit, reset, setError, formState: { errors } } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
  })

  useEffect(() => {
    if (!open) return
    setCreated(null)
    const fallback = assignable.find((r) => !r.isSystem)?.id ?? assignable[0]?.id ?? ''
    reset({
      email: initial?.email ?? '',
      name: initial?.name ?? '',
      roleId: initial?.roleId && assignable.some((r) => r.id === initial.roleId) ? initial.roleId : fallback,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const inv = await invite.mutateAsync({ email: values.email, roleId: values.roleId, name: values.name || undefined })
      setCreated(inv)
    } catch (e) {
      if (apiStatus(e) === 409) setError('email', { message: apiError(e) })
      else toast.error(apiError(e, 'Could not create the invitation'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !invite.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        {created ? (
          <InviteCreated invitation={created} onDone={() => onOpenChange(false)} onAnother={() => { setCreated(null); reset({ email: '', name: '', roleId: created.role.id }) }} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invite member</DialogTitle>
              <DialogDescription>Choose their role. They’ll set their own name and password from the invite link.</DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <FormField id="inv-email" label="Email" error={errors.email?.message}>
                <Input id="inv-email" type="email" autoFocus autoComplete="off" placeholder="name@company.com" aria-invalid={!!errors.email} {...register('email')} />
              </FormField>
              <FormField id="inv-name" label="Name (optional)" error={errors.name?.message} hint="Pre-fills their name on the invite page.">
                <Input id="inv-name" {...register('name')} />
              </FormField>
              <FormField id="inv-role" label="Role" error={errors.roleId?.message}>
                <Controller
                  control={control}
                  name="roleId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="inv-role" aria-invalid={!!errors.roleId}>
                        <SelectValue placeholder="Choose a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignable.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={invite.isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={invite.isPending || assignable.length === 0} className="gap-1.5">
                  {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />} Create invite
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function InviteCreated({ invitation, onDone, onAnother }: { invitation: CreatedInvitation; onDone: () => void; onAnother: () => void }) {
  const link = inviteLink(invitation.token)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Couldn’t copy automatically — select the link and copy it')
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Invite ready for {invitation.email}</DialogTitle>
        <DialogDescription>
          Send them this link. It joins them as <strong>{invitation.role.name}</strong> and expires {formatDateTime(invitation.expiresAt)}.
          It’s shown only once — create a new invite if it’s lost.
        </DialogDescription>
      </DialogHeader>
      <div className="flex gap-2">
        <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Invite link" className="font-mono text-xs" />
        <Button type="button" variant="outline" onClick={copy} className="shrink-0 gap-1.5">
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onAnother}>
          Invite another
        </Button>
        <Button onClick={onDone}>Done</Button>
      </DialogFooter>
    </>
  )
}
