import { z } from 'zod'

// Shape of JobDraft (components/validation/shared.ts), with the old "valid" rule.
export const jobDraftSchema = z.object({
  jobId: z.string().trim().min(1),
  frequency: z.enum(['Daily', 'Weekly', 'Bi-Weekly', 'Monthly']),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  processDate: z.string().min(1),
  validationType: z.string(),
  payrollCycle: z.enum(['Weekly', 'Bi-Weekly']).optional(),
  payrollProcessDate: z.string().optional(),
  payDate: z.string().optional(),
  weekNumber: z.string().optional(),
  invoiceExpectedDate: z.string().optional(),
  fleetBillingMonth: z.string().optional(),
  reconciliationMonth: z.string().optional(),
})
