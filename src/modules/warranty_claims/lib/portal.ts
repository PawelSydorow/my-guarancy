import { z } from 'zod'
import { formatWarrantyClaimNumber } from './format'
import { WARRANTY_DEFAULT_CREATE_PRIORITY_KEY } from './constants'
import type { WarrantyClaim } from '../data/entities'
import type { LookupBundle } from '../types'

const portalSearchSchema = z.string().trim().max(200).optional().transform((value) => value || undefined)

export const portalClaimSortFields = ['reportedAt', 'resolvedAt', 'statusKey', 'priorityKey', 'claimNumber'] as const

export const portalClaimsListQuerySchema = z.object({
  statusKey: z.string().trim().min(1).optional(),
  priorityKey: z.string().trim().min(1).optional(),
  search: portalSearchSchema,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(portalClaimSortFields).default('reportedAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})

export const portalClaimCreateSchema = z.object({
  title: z.string().trim().min(3).max(200),
  issueDescription: z.string().trim().min(10).max(5000),
  locationText: z.string().trim().min(1).max(300),
  priorityKey: z.string().trim().min(1).optional().default(WARRANTY_DEFAULT_CREATE_PRIORITY_KEY),
  categoryKey: z.string().trim().min(1, 'Category is required'),
}).strict()

export type PortalClaimsListQuery = z.infer<typeof portalClaimsListQuerySchema>
export type PortalClaimCreateInput = z.infer<typeof portalClaimCreateSchema>

export type PortalClaimRecord = {
  id: string
  organizationId: string
  tenantId: string
  projectId: string
  claimNumber: number
  claimNumberFormatted: string
  title: string
  issueDescription: string
  locationText: string
  priorityKey: string
  categoryKey: string
  statusKey: string
  reportedAt: string
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export type PortalLookupBundle = Pick<LookupBundle, 'projects' | 'statuses' | 'priorities' | 'categories'>

export function parsePortalClaimsListQuery(searchParams: URLSearchParams): PortalClaimsListQuery {
  return portalClaimsListQuerySchema.parse(Object.fromEntries(searchParams.entries()))
}

export function toPortalClaimRecord(entity: WarrantyClaim): PortalClaimRecord {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    tenantId: entity.tenantId,
    projectId: entity.projectId,
    claimNumber: entity.claimNumber,
    claimNumberFormatted: formatWarrantyClaimNumber(entity.claimNumber),
    title: entity.title,
    issueDescription: entity.issueDescription,
    locationText: entity.locationText,
    priorityKey: entity.priorityKey,
    categoryKey: entity.categoryKey,
    statusKey: entity.statusKey,
    reportedAt: entity.reportedAt.toISOString(),
    resolvedAt: entity.resolvedAt ? entity.resolvedAt.toISOString() : null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  }
}

export function toPortalLookupBundle(bundle: LookupBundle): PortalLookupBundle {
  return {
    projects: bundle.projects,
    statuses: bundle.statuses,
    priorities: bundle.priorities,
    categories: bundle.categories,
  }
}
