import { z } from 'zod'

export const customerPrioritySchema = z.enum(['low', 'normal', 'high', 'critical'])

export const customerPriorityListSchema = z.object({
  id: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  sortField: z.string().default('created_at'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  withDeleted: z.coerce.boolean().optional().default(false),
})

export const customerPriorityCreateSchema = z.object({
  customerId: z.string().uuid(),
  priority: customerPrioritySchema.default('normal'),
})

export const customerPriorityUpdateSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  priority: customerPrioritySchema.optional(),
})
