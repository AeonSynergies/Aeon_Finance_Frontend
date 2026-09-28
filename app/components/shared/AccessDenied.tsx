import { ShieldOff } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

/** Shown instead of a page when the signed-in role lacks read access to it. */
export function AccessDenied({ what }: { what: string }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <ShieldOff className="h-10 w-10 text-muted-foreground" aria-hidden />
      <div>
        <p className="text-sm font-semibold">You don’t have access to {what}</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Ask an admin in your organization to add this permission to your role.
        </p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link to="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  )
}
