import { raw } from '@mikro-orm/core'
import type { EntityManager } from '@mikro-orm/postgresql'
import type { Where } from '@open-mercato/shared/lib/query/types'
import { Project } from '../data/entities'
import type { WarrantyClaimListQuery } from '../data/validators'

type Scope = {
  tenantId: string
  organizationId: string
}

const claimNumberTextExpr = raw((alias) => `lpad(cast(${alias}.claim_number as text), 3, '0')`)

function normalizeSearchValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function buildClaimNumberContainsClause(term: string): Where<Record<string, unknown>> {
  return {
    [claimNumberTextExpr as unknown as string]: { $ilike: `%${term}%` },
  }
}

async function findMatchingProjectIds(em: EntityManager, scope: Scope, term: string): Promise<string[]> {
  const projects = await em.find(Project, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    $or: [
      { name: { $ilike: `%${term}%` } },
      { code: { $ilike: `%${term}%` } },
    ],
  })
  return projects.map((project) => project.id)
}

export async function buildWarrantyClaimListFilters(
  query: WarrantyClaimListQuery,
  em: EntityManager,
  scope: Scope,
): Promise<Where<Record<string, unknown>>> {
  const filters: Record<string, unknown> = {}

  if (query.id) filters.id = query.id
  const claimNumberTerm = normalizeSearchValue(query.claim_number)
  if (claimNumberTerm) Object.assign(filters, buildClaimNumberContainsClause(claimNumberTerm))
  if (query.status_key) filters.statusKey = query.status_key
  if (query.priority_key) filters.priorityKey = query.priority_key
  if (query.category_key) filters.categoryKey = query.category_key
  if (query.project_id) filters.projectId = query.project_id
  if (query.assigned_user_id) filters.assignedUserId = query.assigned_user_id
  if (query.subcontractor_id) filters.subcontractorId = query.subcontractor_id
  if (query.bas_number) filters.basNumber = { $ilike: `%${query.bas_number}%` }

  const searchTerm = normalizeSearchValue(query.search ?? query.title)
  if (searchTerm) {
    const projectIds = await findMatchingProjectIds(em, scope, searchTerm)
    filters.$or = [
      { title: { $ilike: `%${searchTerm}%` } },
      buildClaimNumberContainsClause(searchTerm),
      ...(projectIds.length > 0 ? [{ projectId: { $in: projectIds } }] : []),
    ]
  }

  if (query.reported_from || query.reported_to) {
    const range: { $gte?: Date; $lte?: Date } = {}
    if (query.reported_from) {
      range.$gte = query.reported_from.includes('T')
        ? new Date(query.reported_from)
        : new Date(`${query.reported_from}T00:00:00.000Z`)
    }
    if (query.reported_to) {
      range.$lte = query.reported_to.includes('T')
        ? new Date(query.reported_to)
        : new Date(`${query.reported_to}T23:59:59.999Z`)
    }
    filters.reportedAt = range
  }

  return filters
}
