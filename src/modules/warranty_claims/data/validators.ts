import { z } from 'zod'

const isoDateStringSchema = z.string().datetime({ offset: true }).or(z.string().date())

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
  claim_number: z.coerce.number().int().min(1).optional(),
  status_key: z.string().optional(),
  priority_key: z.string().optional(),
  category_key: z.string().optional(),
  project_id: z.string().uuid().optional(),
  assigned_user_id: z.string().uuid().optional(),
  subcontractor_id: z.string().uuid().optional(),
  title: z.string().optional(),
  bas_number: z.string().optional(),
  reported_from: isoDateStringSchema.optional(),
  reported_to: isoDateStringSchema.optional(),
})

const warrantyClaimBaseSchema = z.object({
  title: z.string().trim().min(1),
  issue_description: z.string().trim().min(1),
  location_text: z.string().trim().min(1),
  project_id: z.string().uuid(),
  priority_key: z.string().trim().min(1),
  category_key: z.string().trim().min(1),
  bas_number: z.string().trim().min(1),
  status_key: z.string().trim().min(1),
  reported_at: isoDateStringSchema,
  assigned_user_id: z.string().uuid().nullable().optional(),
  resolved_at: isoDateStringSchema.nullable().optional(),
  subcontractor_id: z.string().uuid().nullable().optional(),
}).strict()

export const warrantyClaimCreateSchema = warrantyClaimBaseSchema

export const warrantyClaimUpdateSchema = warrantyClaimBaseSchema.extend({
  id: z.string().uuid(),
})

export type WarrantyClaimCreateInput = z.infer<typeof warrantyClaimCreateSchema>
export type WarrantyClaimUpdateInput = z.infer<typeof warrantyClaimUpdateSchema>
export type WarrantyClaimListQuery = z.infer<typeof warrantyClaimListSchema>
