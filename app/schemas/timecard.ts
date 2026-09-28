import { z } from 'zod'
import { DOC_TYPES, MAX_UPLOAD_BYTES } from '@/lib/timecard'
import type { UploadDocType } from '@/types/timecard'

const isoDate = z.string().min(1, 'Required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')

/** Mirrors backend CreateJobDto (IsIn frequency, IsOnOrAfter chain). */
export const createTimecardJobSchema = z
  .object({
    frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY']),
    periodStart: isoDate,
    periodEnd: isoDate,
    processDate: isoDate,
  })
  .refine((v) => v.periodEnd >= v.periodStart, { path: ['periodEnd'], message: 'Period end must be on or after the start' })
  .refine((v) => v.processDate >= v.periodEnd, { path: ['processDate'], message: 'Process date must be on or after the period end' })

export type CreateTimecardJobValues = z.infer<typeof createTimecardJobSchema>

const DOC_TYPE_KEYS = Object.keys(DOC_TYPES) as [UploadDocType, ...UploadDocType[]]

export const uploadDocumentSchema = z
  .object({
    docType: z.enum(DOC_TYPE_KEYS),
    date: z.string().optional(),
    file: z
      .instanceof(File, { message: 'Choose a file' })
      .refine((f) => f.size > 0, 'The file is empty')
      .refine((f) => f.size <= MAX_UPLOAD_BYTES, 'Files must be 20 MB or smaller'),
  })
  .superRefine((v, ctx) => {
    const meta = DOC_TYPES[v.docType]
    if (meta.requiresDate && !v.date) ctx.addIssue({ code: 'custom', path: ['date'], message: 'Pick the date this file covers' })
    const ext = v.file.name.slice(v.file.name.lastIndexOf('.')).toLowerCase()
    if (!meta.accept.split(',').includes(ext)) {
      ctx.addIssue({ code: 'custom', path: ['file'], message: `${meta.label} must be a ${meta.accept.replace(/,/g, ' / ')} file` })
    }
  })

export type UploadDocumentValues = z.infer<typeof uploadDocumentSchema>

/** Mirrors backend OverrideRowDto (reason mandatory). */
export const overrideRowSchema = z.object({
  newStatus: z.string().min(1, 'Choose a status'),
  reason: z.string().trim().min(3, 'Give a reason (at least 3 characters)').max(500, 'Keep the reason under 500 characters'),
  note: z.string().trim().max(1000, 'Keep the note under 1000 characters').optional(),
})

export type OverrideRowValues = z.infer<typeof overrideRowSchema>

/** Mirrors backend RejectDateDto. */
export const rejectDateSchema = z.object({
  rejectionComments: z.string().trim().min(3, 'Explain what needs fixing (at least 3 characters)').max(1000, 'Keep comments under 1000 characters'),
})

export type RejectDateValues = z.infer<typeof rejectDateSchema>
