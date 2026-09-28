import { cn } from '@/lib/utils'

type StatusType =
  | 'VALIDATED' | 'NEED_MANUAL_VALIDATION' | 'NEED_DISPUTE' | 'PENDING_VALIDATION'
  | 'SENT_FOR_APPROVAL' | 'LOCKED'
  | 'DRAFT' | 'INPROGRESS' | 'APPROVED' | 'REJECTED'
  | 'UPLOADED' | 'PENDING' | 'MISSING'
  | 'NO_DISPUTE' | 'YET_TO_DISPUTE' | 'SUBMITTED' | 'UNDER_REVIEW'
  | 'PARTIALLY_ACCEPTED' | 'ACCEPTED'

const statusConfig: Record<string, { label: string; className: string }> = {
  VALIDATED:              { label: 'Validated', className: 'bg-green-50 text-green-700 border border-green-200' },
  NEED_MANUAL_VALIDATION: { label: 'Need Manual Validation', className: 'bg-red-50 text-red-700 border border-red-200' },
  NEED_DISPUTE:           { label: 'Need Dispute', className: 'bg-orange-50 text-orange-700 border border-orange-200' },
  PENDING_VALIDATION:     { label: 'Pending', className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  SENT_FOR_APPROVAL:      { label: 'Sent for Approval', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  LOCKED:                 { label: 'Locked', className: 'bg-gray-100 text-gray-500 border border-gray-200' },
  DRAFT:                  { label: 'Draft', className: 'bg-gray-50 text-gray-600 border border-gray-200' },
  INPROGRESS:             { label: 'In Progress', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  APPROVED:               { label: 'Approved', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  REJECTED:               { label: 'Rejected', className: 'bg-red-50 text-red-700 border border-red-200' },
  UPLOADED:               { label: 'Uploaded', className: 'bg-green-50 text-green-700' },
  PENDING:                { label: 'Pending', className: 'bg-yellow-50 text-yellow-700' },
  MISSING:                { label: 'Missing', className: 'bg-red-50 text-red-700' },
  NO_DISPUTE:             { label: 'No Dispute', className: 'bg-gray-50 text-gray-600' },
  YET_TO_DISPUTE:         { label: 'Yet to Dispute', className: 'bg-orange-50 text-orange-700' },
  SUBMITTED:              { label: 'Submitted', className: 'bg-blue-50 text-blue-700' },
  UNDER_REVIEW:           { label: 'Under Review', className: 'bg-yellow-50 text-yellow-700' },
  ACCEPTED:               { label: 'Accepted', className: 'bg-green-50 text-green-700' },
  PARTIALLY_ACCEPTED:     { label: 'Partially Accepted', className: 'bg-orange-50 text-orange-700' },
}

interface StatusChipProps { status: string; className?: string }

export function StatusChip({ status, className }: StatusChipProps) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-gray-50 text-gray-600' }
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium', config.className, className)}>
      {config.label}
    </span>
  )
}
