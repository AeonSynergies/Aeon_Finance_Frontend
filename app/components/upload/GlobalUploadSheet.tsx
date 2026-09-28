import { useState } from 'react'
import { useNavigate } from 'react-router'
import * as XLSX from 'xlsx'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CreateJobDialog } from '@/components/validation/CreateJobDialog'
import type { ValidationModule } from '@/components/validation/shared'
import { cn } from '@/lib/utils'
import {
  Clock, Route as RouteIcon, FileText, Truck, DollarSign, Car, Wrench, Shield,
  CheckCircle2, XCircle, Plus, ArrowRight, ArrowLeft, UploadCloud,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiError } from '@/services/client'
import { useCreateJob, useJobs } from '@/hooks/useJobs'
import { useUpload } from '@/hooks/useUpload'
import type { JobModule } from '@/types'

interface FileSpec { key: 'file1' | 'file2'; label: string; required: string[] }
interface Section { value: string; label: string; icon: typeof Clock; files: FileSpec[] }

const SECTIONS: Section[] = [
  { value: 'TIMECARD', label: 'Timecard Validation', icon: Clock, files: [
    { key: 'file1', label: 'Amazon Itinerary (.xlsx)', required: ['Driver name', 'App sign in', 'App sign out', 'Total break time used', 'Delivery Service Type', 'Route code', 'Progress Status'] },
    { key: 'file2', label: 'ADP Payroll Export (.xlsx)', required: ['Payroll Name', 'File Number', 'Pay Date', 'Time In', 'Time Out', 'Hours', 'Earnings Code'] },
  ] },
  { value: 'ROUTE_REVENUE', label: 'Route Revenue', icon: RouteIcon, files: [{ key: 'file1', label: 'WST Weekly Report (.xlsx)', required: ['Service Type', 'Route Type', 'WST Qty', 'Ops Qty'] }] },
  { value: 'ROUTE_INVOICE', label: 'Route Invoice', icon: FileText, files: [{ key: 'file1', label: 'Amazon Invoice (.xlsx)', required: ['Week', 'Service Type', 'Expected Qty', 'Paid Qty', 'Rate'] }] },
  { value: 'RFS_AFS', label: 'RFS/AFS Validation', icon: Truck, files: [{ key: 'file1', label: 'AFS Eligibility Report (.xlsx)', required: ['VIN', 'Op Status', 'AFS Status'] }] },
  { value: 'FLEET_REVENUE', label: 'Fleet Revenue', icon: DollarSign, files: [{ key: 'file1', label: 'Vehicle Revenue Export (.xlsx)', required: ['Vehicle Type', 'Eligible Qty', 'Rate'] }] },
  { value: 'RENTAL', label: 'Rental Validation', icon: Car, files: [{ key: 'file1', label: 'Rental Vendor Invoice (.xlsx)', required: ['VIN', 'Days Billed', 'Days Used', 'Rate'] }] },
  { value: 'REPAIR_MAINTENANCE', label: 'Repair & Maintenance', icon: Wrench, files: [{ key: 'file1', label: 'Shop Invoice (.xlsx)', required: ['Invoice No', 'VIN', 'Work Order', 'Total Invoiced'] }] },
  { value: 'INSURANCE', label: 'Insurance Validation', icon: Shield, files: [{ key: 'file1', label: 'Carrier Statement (.xlsx)', required: ['VIN', 'Premium Billed', 'Premium Expected'] }] },
]

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

interface Preview { headers: string[]; rows: Record<string, unknown>[]; missing: string[] }

export function GlobalUploadSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [section, setSection] = useState<Section | null>(null)
  const [jobId, setJobId] = useState('')
  const [files, setFiles] = useState<Record<string, File>>({})
  const [previews, setPreviews] = useState<Record<string, Preview>>({})
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  // Job list for the chosen section, fetched once step 2 opens.
  const { data: jobsData } = useJobs({ module: section?.value }, step >= 2 && !!section)
  const jobs = Array.isArray(jobsData) ? jobsData : []
  const upload = useUpload<{ summary: Record<string, unknown> }>('upload')
  const loading = upload.isPending
  const createJob = useCreateJob()

  const reset = () => { setStep(1); setSection(null); setJobId(''); setFiles({}); setPreviews({}); setSummary(null) }
  const close = (o: boolean) => { if (!o) reset(); onOpenChange(o) }

  const goStep2 = () => { if (!section) return; setStep(2) }

  const onFile = async (spec: FileSpec, file: File | null) => {
    if (!file) return
    setFiles((f) => ({ ...f, [spec.key]: file }))
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const sh = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sh, { defval: '' })
      const headers = json.length ? Object.keys(json[0]) : []
      const missing = spec.required.filter((req) => !headers.some((h) => norm(h) === norm(req) || norm(h).includes(norm(req))))
      setPreviews((p) => ({ ...p, [spec.key]: { headers, rows: json.slice(0, 3), missing } }))
    } catch {
      toast.error('Could not read file')
    }
  }

  const allFilesReady = section?.files.every((f) => files[f.key]) ?? false

  const process = () => {
    if (!section || !jobId) { toast.error('Select a job'); return }
    const fd = new FormData()
    fd.append('section', section.value)
    fd.append('jobId', jobId)
    for (const f of section.files) if (files[f.key]) fd.append(f.key, files[f.key])
    upload.mutate(fd, {
      onSuccess: (json) => { setSummary(json.summary); setStep(3) },
      onError: (e) => toast.error(apiError(e, 'Upload failed')),
    })
  }

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[580px]">
        <SheetHeader className="bg-gradient-header border-b px-6 pb-4 pt-5">
          <SheetTitle>Upload Excel</SheetTitle>
          <p className="text-xs text-muted-foreground">Step {step} of 3 — {step === 1 ? 'Select destination' : step === 2 ? 'Select job & files' : 'Summary'}</p>
        </SheetHeader>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {SECTIONS.map((s) => {
                const Icon = s.icon
                const active = section?.value === s.value
                return (
                  <button key={s.value} onClick={() => setSection(s)}
                    className={cn('flex flex-col items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                      active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground')}>
                    <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="text-xs font-medium">{s.label}</span>
                  </button>
                )
              })}
            </div>
            <Button className="bg-gradient-brand shadow-glow rounded-xl h-11 w-full" disabled={!section} onClick={goStep2}>Next <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && section && (
          <div className="mt-4 space-y-4">
            <div className="space-y-1">
              <Label>Select job to upload to</Label>
              <div className="flex gap-2">
                <Select value={jobId} onValueChange={setJobId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select job" /></SelectTrigger>
                  <SelectContent>{jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.jobId}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            {section.files.map((spec) => {
              const preview = previews[spec.key]
              return (
                <div key={spec.key} className="space-y-2">
                  <div className="bg-gradient-card rounded-2xl border-2 border-dashed border-border/70 p-6 text-center space-y-3">
                    <div className="mx-auto bg-gradient-brand shadow-glow h-14 w-14 rounded-2xl flex items-center justify-center">
                      <UploadCloud className="h-6 w-6 text-white" />
                    </div>
                    <Label>{spec.label}</Label>
                    <Input type="file" accept=".xlsx" className="h-9 text-xs" onChange={(e) => onFile(spec, e.target.files?.[0] ?? null)} />
                    {files[spec.key] && <p className="text-[11px] text-muted-foreground">{files[spec.key].name} · {(files[spec.key].size / 1024).toFixed(0)} KB</p>}
                  </div>
                  {preview && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {spec.required.map((req) => {
                          const ok = !preview.missing.includes(req)
                          return (
                            <span key={req} className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px]',
                              ok ? 'border-success/25 bg-success/10 text-success' : 'border-destructive/25 bg-destructive/10 text-destructive')}>
                              {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{req}{ok ? '' : ' · Not found'}
                            </span>
                          )
                        })}
                      </div>
                      {preview.missing.length > 0 && (
                        <div className="rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning-foreground">
                          {preview.missing.length} required column(s) not auto-detected. The processor also fuzzy-matches headers; if these are truly missing the upload will report them.
                        </div>
                      )}
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-[10px]">
                          <thead className="bg-muted/50"><tr>{preview.headers.slice(0, 6).map((h) => <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>)}</tr></thead>
                          <tbody>{preview.rows.map((r, i) => <tr key={i} className="border-t">{preview.headers.slice(0, 6).map((h) => <td key={h} className="px-2 py-1 truncate max-w-[90px]">{String(r[h] ?? '')}</td>)}</tr>)}</tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
              <Button className="bg-gradient-brand shadow-glow rounded-xl h-11 flex-1" disabled={!jobId || !allFilesReady || loading} onClick={process}>
                {loading ? 'Processing…' : 'Process & Validate'} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && summary && section && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2 text-success"><CheckCircle2 className="h-5 w-5" /><span className="font-semibold">Processing complete</span></div>
            <div className="rounded-xl border p-3 text-xs space-y-1">
              {section.value === 'TIMECARD' ? (
                <>
                  <Row label="Total records" value={summary.total} />
                  <Row label="Drivers" value={summary.drivers} />
                  <Row label="Delivery workers" value={summary.deliveryWorkers} />
                  <Row label="Support workers" value={summary.supportWorkers} />
                  <Row label="Salaried" value={summary.salaried} />
                  <div className="my-1 border-t" />
                  <Row label="✅ No error" value={summary.noError} />
                  <Row label="⚠️ Logout mismatch" value={summary.logoutMismatch} />
                  <Row label="🔴 Support hours exceeded" value={summary.supportHoursExceeded} />
                  <Row label="🔴 Missing payroll" value={summary.missingPayrollRows} />
                  <Row label="📋 PTO / Training" value={summary.ptoTraining} />
                  <div className="my-1 border-t" />
                  <Row label="CAP flagged" value={summary.capFlagged} />
                  <Row label="Overtime detected" value={summary.otDetected} />
                </>
              ) : (
                <>
                  <Row label="Document" value={String(summary.docType)} />
                  <Row label="Rows parsed" value={summary.rows} />
                  <Row label="Columns found" value={(summary.columnsFound as string[])?.length ?? 0} />
                  <Row label="Columns missing" value={(summary.columnsMissing as string[])?.length ?? 0} />
                  {(summary.columnsMissing as string[])?.length > 0 && (
                    <p className="text-destructive">Missing: {(summary.columnsMissing as string[]).join(', ')}</p>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button className="bg-gradient-brand shadow-glow rounded-xl h-11 flex-1" onClick={() => { close(false); navigate(section.value === 'TIMECARD' ? '/validation/timecard' : '/validation') }}>
                View in Validation
              </Button>
              <Button variant="outline" onClick={reset}>Upload Another</Button>
            </div>
          </div>
        )}

        <CreateJobDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          module={section ? sectionToModule(section.value) : "payroll"}
          validationType={section?.label ?? "Validation"}
          onCreate={async (draft) => {
            if (!section) return
            try {
              await createJob.mutateAsync({
                module: section.value as JobModule,
                frequency: draft.frequency,
                periodStart: draft.periodStart,
                periodEnd: draft.periodEnd,
                processDate: draft.processDate,
              })
              toast.success('Job created')
            } catch (e) {
              toast.error(apiError(e, 'Failed to create job'))
            }
          }}
        />
      </SheetContent>
    </Sheet>
  )
}

function sectionToModule(v: string): ValidationModule {
  if (v === 'TIMECARD') return 'payroll'
  if (v === 'ROUTE_REVENUE' || v === 'ROUTE_INVOICE' || v === 'RFS_AFS') return 'route'
  return 'fleet'
}

function Row({ label, value }: { label: string; value: unknown }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{String(value ?? 0)}</span></div>
}
