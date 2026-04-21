import type { EntityManager } from '@mikro-orm/postgresql'
import { Dictionary, DictionaryEntry } from '@open-mercato/core/modules/dictionaries/data/entities'
import { User } from '@open-mercato/core/modules/auth/data/entities'
import { WARRANTY_DICTIONARY_KEYS } from './constants'
import { Project, ProjectSubcontractor, WarrantyClaim } from '../data/entities'
import type { LookupOption, LookupBundle } from '../types'

type Scope = {
  tenantId: string
  organizationId: string
}

function matchesQuery(text: string | null | undefined, query: string): boolean {
  if (!query.trim()) return true
  return (text ?? '').toLowerCase().includes(query.trim().toLowerCase())
}

export async function getDictionaryOptions(
  em: EntityManager,
  scope: Scope,
  dictionaryKey: string,
): Promise<LookupOption[]> {
  const dictionary = await em.findOne(Dictionary, {
    key: dictionaryKey,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    deletedAt: null,
  })
  if (!dictionary) return []
  const entries = await em.find(
    DictionaryEntry,
    { dictionary, tenantId: scope.tenantId, organizationId: scope.organizationId },
    { orderBy: { label: 'asc' } },
  )
  return entries.map((entry) => ({
    id: entry.value,
    label: entry.label || entry.value,
  }))
}

export async function getProjectOptions(
  em: EntityManager,
  scope: Scope,
  query = '',
  includeInactive = false,
): Promise<LookupOption[]> {
  const rows = await em.find(
    Project,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      ...(includeInactive ? {} : { isActive: true, deletedAt: null }),
    },
    { orderBy: { name: 'asc' } },
  )

  return rows
    .filter((row) => matchesQuery(`${row.name} ${row.code ?? ''}`, query))
    .map((row) => ({
      id: row.id,
      label: row.code ? `${row.name} (${row.code})` : row.name,
      description: row.code ?? null,
    }))
}

export async function getSubcontractorOptions(
  em: EntityManager,
  scope: Scope,
  projectId?: string,
  query = '',
  includeInactive = false,
): Promise<LookupOption[]> {
  const rows = await em.find(
    ProjectSubcontractor,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      ...(projectId ? { projectId } : {}),
      ...(includeInactive ? {} : { isActive: true, deletedAt: null }),
    },
    { orderBy: { name: 'asc' } },
  )

  return rows
    .filter((row) => matchesQuery(`${row.name} ${row.contactPerson ?? ''} ${row.email ?? ''}`, query))
    .map((row) => ({
      id: row.id,
      label: row.name,
      description: row.contactPerson || row.email || row.phone || null,
    }))
}

export async function getUserOptions(em: EntityManager, scope: Scope, query = ''): Promise<LookupOption[]> {
  const rows = await em.find(
    User,
    {
      tenantId: scope.tenantId,
      deletedAt: null,
    },
    { orderBy: { name: 'asc', email: 'asc' } },
  )

  return rows
    .filter((row) => matchesQuery(`${row.name ?? ''} ${row.email}`, query))
    .map((row) => ({
      id: row.id,
      label: row.name?.trim() || row.email,
      description: row.email,
    }))
}

export async function getLookupBundle(em: EntityManager, scope: Scope): Promise<LookupBundle> {
  const [projects, users, statuses, priorities, categories] = await Promise.all([
    getProjectOptions(em, scope),
    getUserOptions(em, scope),
    getDictionaryOptions(em, scope, WARRANTY_DICTIONARY_KEYS.status),
    getDictionaryOptions(em, scope, WARRANTY_DICTIONARY_KEYS.priority),
    getDictionaryOptions(em, scope, WARRANTY_DICTIONARY_KEYS.category),
  ])

  return { projects, users, statuses, priorities, categories }
}

export async function getHistoricalSubcontractorOption(
  em: EntityManager,
  scope: Scope,
  claimId: string,
): Promise<LookupOption | null> {
  const claim = await em.findOne(WarrantyClaim, {
    id: claimId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!claim?.subcontractorId || !claim.subcontractorName) return null
  return {
    id: claim.subcontractorId,
    label: `${claim.subcontractorName} (historyczne)`,
    description: claim.subcontractorEmail || claim.subcontractorPhone || null,
  }
}
