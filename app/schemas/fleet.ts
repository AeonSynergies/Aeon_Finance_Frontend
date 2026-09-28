import { z } from 'zod'

/** RFS vs AFS vehicle override dialog. Status change date is required only for Operational overrides. */
export const rfsOverrideSchema = z
  .object({
    type: z.enum(['AFS Status', 'Operational Status']),
    afsNew: z.enum(['Eligible', 'Not Eligible']),
    opNew: z.enum(['Operational', 'Grounded', 'Inactive']),
    opDate: z.string(),
    reason: z.string().refine((s) => s.trim().length > 0, 'Reason required'),
  })
  .refine((v) => v.type === 'AFS Status' || v.opDate.trim().length > 0, {
    path: ['opDate'],
    message: 'Status change date required',
  })

export type RfsOverrideValues = z.infer<typeof rfsOverrideSchema>
