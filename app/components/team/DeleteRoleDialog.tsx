import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useDeleteRole } from '@/hooks/useTeam'
import { apiError } from '@/services/client'
import type { TeamRole } from '@/types/team'

export function DeleteRoleDialog({ role, onClose, onDeleted }: { role: TeamRole | null; onClose: () => void; onDeleted?: () => void }) {
  const del = useDeleteRole()

  async function confirm() {
    if (!role) return
    try {
      await del.mutateAsync(role.id)
      toast.success(`Role “${role.name}” deleted`)
      onDeleted?.()
      onClose()
    } catch (e) {
      toast.error(apiError(e, 'Could not delete the role'))
    }
  }

  return (
    <Dialog open={!!role} onOpenChange={(o) => !o && !del.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete “{role?.name}”?</DialogTitle>
          <DialogDescription>This can’t be undone. Roles with members or pending invitations can’t be deleted.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={del.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={del.isPending}>
            {del.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
