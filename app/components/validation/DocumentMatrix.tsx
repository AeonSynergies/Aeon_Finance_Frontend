import { StatusChip } from './StatusChip'
import { toast } from 'sonner'
import { useJobDocuments, useUpdateDocument } from '@/hooks/useJobs'

interface DocItem {
  id: string
  docType: string
  date: string | null
  status: string
  fileName: string | null
}

interface DocumentMatrixProps { jobId: string }

export function DocumentMatrix({ jobId }: DocumentMatrixProps) {
  const { data: docs = [], isLoading: loading } = useJobDocuments(jobId)
  const updateDoc = useUpdateDocument(jobId)

  const markUploaded = async (docId: string) => {
    try {
      await updateDoc.mutateAsync({ docId, body: { status: 'UPLOADED' } })
      toast.success('Document marked as uploaded')
    } catch {
      toast.error('Failed to update document')
    }
  }

  if (loading) return <div className="text-xs text-muted-foreground p-2">Loading documents...</div>
  if (docs.length === 0) return <div className="text-xs text-muted-foreground p-2">No documents configured</div>

  // Group by document type, preserving first-seen order, and sort each group by date.
  const groups = new Map<string, DocItem[]>()
  for (const doc of docs) {
    const arr = groups.get(doc.docType) ?? []
    arr.push(doc)
    groups.set(doc.docType, arr)
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">Document Type</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody>
          {[...groups.entries()].map(([docType, items]) => (
            <tr key={docType} className="border-b align-top hover:bg-muted/30">
              <td className="px-3 py-2 font-medium whitespace-nowrap">{docType}</td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1.5">
                  {items.map(doc => {
                    const canUpload = doc.status !== 'UPLOADED'
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        disabled={!canUpload}
                        onClick={() => canUpload && markUploaded(doc.id)}
                        title={canUpload ? 'Click to mark uploaded' : (doc.fileName ?? 'Uploaded')}
                        className={canUpload ? 'cursor-pointer' : 'cursor-default'}
                      >
                        <span className="inline-flex flex-col items-center gap-0.5">
                          {doc.date && (
                            <span className="text-[10px] leading-none text-muted-foreground">{doc.date.slice(5)}</span>
                          )}
                          <StatusChip status={doc.status} />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
