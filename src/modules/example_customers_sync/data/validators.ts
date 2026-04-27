import { z } from 'zod'

export const mappingListQuerySchema = z.object({
  cursor: z.string().optional(),
  interactionId: z.string().uuid().optional(),
  todoId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
})

export const reconcileSchema = z.object({
  tenantId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})
