import type { EntityManager } from '@mikro-orm/postgresql'
import { CrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { Dictionary, DictionaryEntry } from '@open-mercato/core/modules/dictionaries/data/entities'
import { User } from '@open-mercato/core/modules/auth/data/entities'
import { WARRANTY_DEFAULT_CREATE_PRIORITY_KEY, WARRANTY_DICTIONARY_KEYS, WARRANTY_STATUS_KEYS } from './constants'
import { formatWarrantyClaimNumber } from './format'
import type { WarrantyClaimCreateInput, WarrantyClaimUpdateInput } from '../data/validators'
import { Project, ProjectSubcontractor, WarrantyClaim } from '../data/entities'

type Scope = {
  tenantId: string
  organizationId: string
}

type ClaimMutationInput = WarrantyClaimCreateInput | WarrantyClaimUpdateInput

export type PortalPreparedClaimInput = {
  title: string
  issueDescription: string
  locationText: string
  priorityKey?: string
  categoryKey: string
}

type ClaimEntityInput = {
  project_id: string
  claim_number: number
  title: string
  issue_description: string
  location_text: string
  priority_key: string
  category_key: string
  bas_number: string
  status_key: string
  reported_at: string
  assigned_user_id?: string | null
  resolved_at?: string | null
  subcontractor_id?: string | null
  subcontractor_name?: string | null
  subcontractor_address?: string | null
  subcontractor_email?: string | null
  subcontractor_phone?: string | null
  subcontractor_contact_person?: string | null
}

export function formatClaimNumber(value: number | null | undefined): string {
  return formatWarrantyClaimNumber(value)
}

export type PreparedClaimInput<T extends ClaimMutationInput = ClaimMutationInput> = T & {
  claim_number?: number
  title: string
  issue_description: string
  location_text: string
  priority_key: string
  category_key: string
  bas_number: string
  status_key: string
  reported_at: string
  resolved_at?: string | null
  subcontractor_name?: string | null
  subcontractor_address?: string | null
  subcontractor_email?: string | null
  subcontractor_phone?: string | null
  subcontractor_contact_person?: string | null
}

function parseClaimNumberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10)
    if (Number.isInteger(parsed) && parsed > 0) return parsed
  }
  return 0
}

async function resolveNextClaimNumber(
  em: EntityManager,
  scope: Scope,
  projectId: string,
): Promise<number> {
  const knex = em.getConnection().getKnex()
  const row = await knex('warranty_claims_claims')
    .where({
      organization_id: scope.organizationId,
      tenant_id: scope.tenantId,
      project_id: projectId,
    })
    .max<{ maxClaimNumber?: string | number | null }>({ maxClaimNumber: 'claim_number' })
    .first()

  return parseClaimNumberValue(row?.maxClaimNumber) + 1
}

function cleanText(value: string): string {
  return value.trim()
}

function toIsoOrThrow(value: string | null | undefined, fieldName: string): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new CrudHttpError(400, { error: `Invalid date for ${fieldName}` })
  }
  return parsed.toISOString()
}

async function assertDictionaryEntryExists(
  em: EntityManager,
  scope: Scope,
  dictionaryKey: string,
  value: string,
): Promise<void> {
  const dictionary = await em.findOne(Dictionary, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    key: dictionaryKey,
    deletedAt: null,
  })
  if (!dictionary) {
    throw new CrudHttpError(400, { error: `Missing dictionary configuration: ${dictionaryKey}` })
  }

  const entry = await em.findOne(DictionaryEntry, {
    dictionary,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    value,
  })
  if (!entry) {
    throw new CrudHttpError(400, { error: `Invalid dictionary value: ${dictionaryKey}:${value}` })
  }
}

async function resolveProject(
  em: EntityManager,
  scope: Scope,
  projectId: string,
  existing?: WarrantyClaim | null,
): Promise<Project | null> {
  const active = await em.findOne(Project, {
    id: projectId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    isActive: true,
    deletedAt: null,
  })
  if (active) return active
  if (existing?.projectId === projectId) {
    return await em.findOne(Project, {
      id: projectId,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
    })
  }
  return null
}

async function resolveFirstActiveProject(
  em: EntityManager,
  scope: Scope,
): Promise<Project | null> {
  const projects = await em.find(Project, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    isActive: true,
    deletedAt: null,
  }, {
    orderBy: { name: 'asc' },
    limit: 1,
  })

  return [...projects]
    .sort((left, right) => left.name.localeCompare(right.name, 'pl'))
    [0] ?? null
}

async function resolveSubcontractor(
  em: EntityManager,
  scope: Scope,
  projectId: string,
  subcontractorId: string | null | undefined,
  existing?: WarrantyClaim | null,
): Promise<{
  id: string | null
  name: string | null
  address: string | null
  email: string | null
  phone: string | null
  contactPerson: string | null
}> {
  if (!subcontractorId) {
    return {
      id: null,
      name: null,
      address: null,
      email: null,
      phone: null,
      contactPerson: null,
    }
  }

  const active = await em.findOne(ProjectSubcontractor, {
    id: subcontractorId,
    projectId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    isActive: true,
    deletedAt: null,
  })

  if (active) {
    return {
      id: active.id,
      name: active.name,
      address: active.address ?? null,
      email: active.email ?? null,
      phone: active.phone ?? null,
      contactPerson: active.contactPerson ?? null,
    }
  }

  if (existing?.subcontractorId === subcontractorId) {
    const historical = await em.findOne(ProjectSubcontractor, {
      id: subcontractorId,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      projectId,
    })
    if (historical) {
      return {
        id: subcontractorId,
        name: existing.subcontractorName ?? historical.name ?? null,
        address: existing.subcontractorAddress ?? historical.address ?? null,
        email: existing.subcontractorEmail ?? historical.email ?? null,
        phone: existing.subcontractorPhone ?? historical.phone ?? null,
        contactPerson: existing.subcontractorContactPerson ?? historical.contactPerson ?? null,
      }
    }
    return {
      id: subcontractorId,
      name: existing.subcontractorName ?? null,
      address: existing.subcontractorAddress ?? null,
      email: existing.subcontractorEmail ?? null,
      phone: existing.subcontractorPhone ?? null,
      contactPerson: existing.subcontractorContactPerson ?? null,
    }
  }

  throw new CrudHttpError(400, { error: 'Selected subcontractor does not belong to the selected project' })
}

async function assertAssignedUser(
  em: EntityManager,
  scope: Scope,
  userId: string | null | undefined,
): Promise<void> {
  if (!userId) return
  const user = await em.findOne(User, {
    id: userId,
    deletedAt: null,
    tenantId: scope.tenantId,
  })
  if (!user) {
    throw new CrudHttpError(400, { error: 'Assigned user does not exist' })
  }
}

function resolveResolvedAt(statusKey: string, resolvedAtIso: string | null): string | null {
  if (statusKey === WARRANTY_STATUS_KEYS.completed && !resolvedAtIso) {
    return new Date().toISOString()
  }
  return resolvedAtIso
}

export async function prepareClaimInput<T extends ClaimMutationInput>(
  em: EntityManager,
  scope: Scope,
  input: T,
  existing?: WarrantyClaim | null,
): Promise<PreparedClaimInput<T> & { claim_number: number }> {
  const prepared: PreparedClaimInput<T> = {
    ...input,
    title: cleanText(input.title),
    issue_description: cleanText(input.issue_description),
    location_text: cleanText(input.location_text),
    priority_key: cleanText(input.priority_key),
    category_key: cleanText(input.category_key),
    bas_number: cleanText(input.bas_number),
    status_key: cleanText(input.status_key),
    reported_at: toIsoOrThrow(input.reported_at, 'reported_at') ?? new Date().toISOString(),
    resolved_at: toIsoOrThrow(input.resolved_at ?? null, 'resolved_at'),
  }

  if (existing && prepared.project_id !== existing.projectId) {
    throw new CrudHttpError(400, { error: 'Project cannot be changed after the claim is created' })
  }

  const project = await resolveProject(em, scope, prepared.project_id, existing)
  if (!project) {
    throw new CrudHttpError(400, { error: 'Selected project does not exist or is inactive' })
  }

  await assertDictionaryEntryExists(em, scope, WARRANTY_DICTIONARY_KEYS.status, prepared.status_key)
  await assertDictionaryEntryExists(em, scope, WARRANTY_DICTIONARY_KEYS.priority, prepared.priority_key)
  await assertDictionaryEntryExists(em, scope, WARRANTY_DICTIONARY_KEYS.category, prepared.category_key)
  await assertAssignedUser(em, scope, prepared.assigned_user_id ?? null)

  const subcontractor = await resolveSubcontractor(
    em,
    scope,
    prepared.project_id,
    prepared.subcontractor_id ?? null,
    existing,
  )

  prepared.subcontractor_id = subcontractor.id
  prepared.subcontractor_name = subcontractor.name
  prepared.subcontractor_address = subcontractor.address
  prepared.subcontractor_email = subcontractor.email
  prepared.subcontractor_phone = subcontractor.phone
  prepared.subcontractor_contact_person = subcontractor.contactPerson

  // preserve existing resolved_at from DB if input omits it — prevents overwrite on PUT
  const currentResolvedAt = prepared.resolved_at ?? (existing?.resolvedAt ? existing.resolvedAt.toISOString() : null)
  prepared.resolved_at = resolveResolvedAt(prepared.status_key, currentResolvedAt)
  prepared.claim_number = existing?.claimNumber ?? await resolveNextClaimNumber(em, scope, prepared.project_id)

  return prepared as PreparedClaimInput<T> & { claim_number: number }
}

export async function preparePortalClaimInput(
  em: EntityManager,
  scope: Scope,
  input: PortalPreparedClaimInput,
): Promise<ClaimEntityInput> {
  const title = cleanText(input.title)
  const issueDescription = cleanText(input.issueDescription)
  const locationText = cleanText(input.locationText)
  const priorityKey = cleanText(input.priorityKey ?? WARRANTY_DEFAULT_CREATE_PRIORITY_KEY)
  const categoryKey = cleanText(input.categoryKey)

  const project = await resolveFirstActiveProject(em, scope)
  if (!project) {
    throw new CrudHttpError(409, { error: 'Brak aktywnego projektu dla organizacji klienta' })
  }

  await assertDictionaryEntryExists(em, scope, WARRANTY_DICTIONARY_KEYS.status, WARRANTY_STATUS_KEYS.pending)
  await assertDictionaryEntryExists(em, scope, WARRANTY_DICTIONARY_KEYS.priority, priorityKey)
  await assertDictionaryEntryExists(em, scope, WARRANTY_DICTIONARY_KEYS.category, categoryKey)

  return {
    title,
    issue_description: issueDescription,
    location_text: locationText,
    priority_key: priorityKey,
    category_key: categoryKey,
    bas_number: '',
    status_key: WARRANTY_STATUS_KEYS.pending,
    reported_at: new Date().toISOString(),
    project_id: project.id,
    assigned_user_id: null,
    resolved_at: null,
    subcontractor_id: null,
    claim_number: await resolveNextClaimNumber(em, scope, project.id),
  }
}

export function mapPreparedClaimToEntity(input: ClaimEntityInput, scope: Scope) {
  return {
    organizationId: scope.organizationId,
    tenantId: scope.tenantId,
    isActive: true,
    projectId: input.project_id,
    claimNumber: input.claim_number,
    title: input.title,
    issueDescription: input.issue_description,
    locationText: input.location_text,
    priorityKey: input.priority_key,
    categoryKey: input.category_key,
    basNumber: input.bas_number,
    statusKey: input.status_key,
    reportedAt: new Date(input.reported_at),
    assignedUserId: input.assigned_user_id ?? null,
    resolvedAt: input.resolved_at ? new Date(input.resolved_at) : null,
    subcontractorId: input.subcontractor_id ?? null,
    subcontractorName: input.subcontractor_name ?? null,
    subcontractorAddress: input.subcontractor_address ?? null,
    subcontractorEmail: input.subcontractor_email ?? null,
    subcontractorPhone: input.subcontractor_phone ?? null,
    subcontractorContactPerson: input.subcontractor_contact_person ?? null,
  }
}

export function applyPreparedClaimToEntity<T extends ClaimMutationInput>(entity: WarrantyClaim, input: PreparedClaimInput<T>) {
  entity.title = input.title
  entity.issueDescription = input.issue_description
  entity.locationText = input.location_text
  entity.priorityKey = input.priority_key
  entity.categoryKey = input.category_key
  entity.basNumber = input.bas_number
  entity.statusKey = input.status_key
  entity.reportedAt = new Date(input.reported_at)
  entity.assignedUserId = input.assigned_user_id ?? null
  entity.resolvedAt = input.resolved_at ? new Date(input.resolved_at) : null
  entity.subcontractorId = input.subcontractor_id ?? null
  entity.subcontractorName = input.subcontractor_name ?? null
  entity.subcontractorAddress = input.subcontractor_address ?? null
  entity.subcontractorEmail = input.subcontractor_email ?? null
  entity.subcontractorPhone = input.subcontractor_phone ?? null
  entity.subcontractorContactPerson = input.subcontractor_contact_person ?? null
  entity.isActive = true
}

export function serializeClaimRecord(entity: WarrantyClaim) {
  return {
    id: entity.id,
    organization_id: entity.organizationId,
    tenant_id: entity.tenantId,
    is_active: entity.isActive,
    project_id: entity.projectId,
    claim_number: entity.claimNumber,
    claim_number_formatted: formatWarrantyClaimNumber(entity.claimNumber),
    title: entity.title,
    issue_description: entity.issueDescription,
    location_text: entity.locationText,
    priority_key: entity.priorityKey,
    category_key: entity.categoryKey,
    bas_number: entity.basNumber,
    status_key: entity.statusKey,
    reported_at: entity.reportedAt.toISOString(),
    assigned_user_id: entity.assignedUserId ?? null,
    resolved_at: entity.resolvedAt ? entity.resolvedAt.toISOString() : null,
    subcontractor_id: entity.subcontractorId ?? null,
    subcontractor_name: entity.subcontractorName ?? null,
    subcontractor_address: entity.subcontractorAddress ?? null,
    subcontractor_email: entity.subcontractorEmail ?? null,
    subcontractor_phone: entity.subcontractorPhone ?? null,
    subcontractor_contact_person: entity.subcontractorContactPerson ?? null,
    created_at: entity.createdAt.toISOString(),
    updated_at: entity.updatedAt.toISOString(),
    deleted_at: entity.deletedAt ? entity.deletedAt.toISOString() : null,
  }
}
