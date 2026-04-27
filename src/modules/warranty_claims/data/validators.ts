import { z } from 'zod'
import { WARRANTY_STATUS_KEYS } from '../lib/constants'

const isoDateStringSchema = z.string().datetime({ offset: true }).or(z.string().date())

const requiredTextSchema = (message: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value : ''),
    z.string().trim().min(1, message),
  )

const requiredUuidSchema = (message: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value : ''),
    z.string().trim().min(1, message).uuid(message),
  )

const optionalNullableIsoDateStringSchema = z.preprocess(
  (value) => {
    if (value == null) return null
    if (typeof value === 'string' && value.trim() === '') return null
    return value
  },
  isoDateStringSchema.nullable(),
)

export const lookupQuerySchema = z.object({
  q: z.string().optional().default(''),
  query: z.string().optional(),
  projectId: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  claimId: z.string().uuid().optional(),
  includeInactive: z.coerce.boolean().optional(),
  include_inactive: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export const warrantyClaimListSchema = z.object({
  id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  sortField: z.string().default('updated_at'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  withDeleted: z.coerce.boolean().optional().default(false),
  claim_number: z.string().optional(),
  status_key: z.string().optional(),
  priority_key: z.string().optional(),
  category_key: z.string().optional(),
  project_id: z.string().uuid().optional(),
  assigned_user_id: z.string().uuid().optional(),
  subcontractor_id: z.string().uuid().optional(),
  search: z.string().optional(),
  title: z.string().optional(),
  bas_number: z.string().optional(),
  reported_from: isoDateStringSchema.optional(),
  reported_to: isoDateStringSchema.optional(),
})

const warrantyClaimBaseSchema = z.object({
  title: requiredTextSchema('To pole jest wymagane'),
  issue_description: requiredTextSchema('To pole jest wymagane'),
  location_text: requiredTextSchema('To pole jest wymagane'),
  project_id: requiredUuidSchema('Wybierz projekt'),
  priority_key: requiredTextSchema('Wybierz pilność'),
  category_key: requiredTextSchema('Wybierz kategorię'),
  bas_number: requiredTextSchema('To pole jest wymagane'),
  status_key: requiredTextSchema('Wybierz status'),
  reported_at: isoDateStringSchema,
  assigned_user_id: requiredUuidSchema('Wybierz osobę przypisaną'),
  resolved_at: optionalNullableIsoDateStringSchema,
  rejection_reason: z.string().nullable().optional(),
  subcontractor_id: z.string().uuid().nullable().optional(),
}).strict()

export const warrantyClaimCreateSchema = warrantyClaimBaseSchema

export const warrantyClaimUpdateSchema = warrantyClaimBaseSchema.extend({
  id: z.string().uuid(),
  assigned_user_id: z.string().uuid().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.status_key === WARRANTY_STATUS_KEYS.rejected && !data.rejection_reason?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rejection_reason'],
      message: 'Podaj powód odrzucenia',
    })
  }
})

export type WarrantyClaimCreateInput = z.infer<typeof warrantyClaimCreateSchema>
export type WarrantyClaimUpdateInput = z.infer<typeof warrantyClaimUpdateSchema>
export type WarrantyClaimListQuery = z.infer<typeof warrantyClaimListSchema>
