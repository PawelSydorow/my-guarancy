import type { EntityManager } from '@mikro-orm/postgresql'
import { Dictionary, DictionaryEntry } from '@open-mercato/core/modules/dictionaries/data/entities'
import { normalizeDictionaryValue } from '@open-mercato/core/modules/dictionaries/lib/utils'
import { WARRANTY_DICTIONARY_KEYS } from './constants'
import { Project, ProjectSubcontractor } from '../data/entities'
import categories from '../seed/categories.json'
import priorities from '../seed/priorities.json'
import projects from '../seed/projects.json'
import statuses from '../seed/statuses.json'
import subcontractors from '../seed/subcontractors.json'

type SeedScope = {
  tenantId: string
  organizationId: string
}

type DictionarySeed = {
  value: string
  label: string
}

type ProjectSeed = {
  seedKey: string
  name: string
  code?: string | null
}

type SubcontractorSeed = {
  seedKey: string
  projectKey: string
  name: string
  address?: string | null
  email?: string | null
  phone?: string | null
  contactPerson?: string | null
}

const DICTIONARY_DEFINITIONS = {
  [WARRANTY_DICTIONARY_KEYS.status]: {
    name: 'Warranty claim statuses',
    description: 'Statuses used by warranty claims.',
  },
  [WARRANTY_DICTIONARY_KEYS.priority]: {
    name: 'Warranty claim priorities',
    description: 'Priorities used by warranty claims.',
  },
  [WARRANTY_DICTIONARY_KEYS.category]: {
    name: 'Warranty claim categories',
    description: 'Categories used by warranty claims.',
  },
} as const

export async function ensureWarrantyDictionary(
  em: EntityManager,
  scope: SeedScope,
  key: string,
): Promise<Dictionary> {
  let dictionary = await em.findOne(Dictionary, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    key,
    deletedAt: null,
  })

  if (!dictionary) {
    const definition = DICTIONARY_DEFINITIONS[key as keyof typeof DICTIONARY_DEFINITIONS]
    dictionary = em.create(Dictionary, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      key,
      name: definition?.name ?? key,
      description: definition?.description ?? null,
      isSystem: true,
      isActive: true,
      managerVisibility: 'hidden',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    em.persist(dictionary)
    await em.flush()
  }

  return dictionary
}

export async function ensureWarrantyDictionaryEntries(
  em: EntityManager,
  scope: SeedScope,
  dictionaryKey: string,
  entries: DictionarySeed[],
): Promise<void> {
  const dictionary = await ensureWarrantyDictionary(em, scope, dictionaryKey)
  for (const entry of entries) {
    const value = entry.value.trim()
    if (!value) continue
    const normalizedValue = normalizeDictionaryValue(value)
    const existing = await em.findOne(DictionaryEntry, {
      dictionary,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      normalizedValue,
    })
    if (existing) {
      if ((existing.label ?? '').trim() !== (entry.label ?? '').trim()) {
        existing.label = entry.label.trim() || value
        existing.updatedAt = new Date()
        em.persist(existing)
      }
      continue
    }
    em.persist(
      em.create(DictionaryEntry, {
        dictionary,
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        value,
        normalizedValue,
        label: entry.label.trim() || value,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    )
  }
}

export async function seedWarrantyProjects(em: EntityManager, scope: SeedScope): Promise<Map<string, Project>> {
  const bySeedKey = new Map<string, Project>()

  for (const rawProject of projects as ProjectSeed[]) {
    const seedKey = rawProject.seedKey.trim()
    if (!seedKey) continue
    let project = await em.findOne(Project, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      seedKey,
    })
    if (!project) {
      project = em.create(Project, {
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        seedKey,
        name: rawProject.name.trim(),
        code: rawProject.code?.trim() || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      em.persist(project)
    } else {
      project.name = rawProject.name.trim()
      project.code = rawProject.code?.trim() || null
      project.isActive = true
      project.deletedAt = null
      em.persist(project)
    }
    bySeedKey.set(seedKey, project)
  }

  await em.flush()
  return bySeedKey
}

export async function seedWarrantySubcontractors(
  em: EntityManager,
  scope: SeedScope,
  projectsBySeedKey: Map<string, Project>,
): Promise<void> {
  for (const rawSubcontractor of subcontractors as SubcontractorSeed[]) {
    const seedKey = rawSubcontractor.seedKey.trim()
    const project = projectsBySeedKey.get(rawSubcontractor.projectKey.trim())
    if (!seedKey || !project) continue

    let subcontractor = await em.findOne(ProjectSubcontractor, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      seedKey,
    })

    if (!subcontractor) {
      subcontractor = em.create(ProjectSubcontractor, {
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        seedKey,
        projectId: project.id,
        name: rawSubcontractor.name.trim(),
        address: rawSubcontractor.address?.trim() || null,
        email: rawSubcontractor.email?.trim() || null,
        phone: rawSubcontractor.phone?.trim() || null,
        contactPerson: rawSubcontractor.contactPerson?.trim() || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      em.persist(subcontractor)
      continue
    }

    subcontractor.projectId = project.id
    subcontractor.name = rawSubcontractor.name.trim()
    subcontractor.address = rawSubcontractor.address?.trim() || null
    subcontractor.email = rawSubcontractor.email?.trim() || null
    subcontractor.phone = rawSubcontractor.phone?.trim() || null
    subcontractor.contactPerson = rawSubcontractor.contactPerson?.trim() || null
    subcontractor.isActive = true
    subcontractor.deletedAt = null
    em.persist(subcontractor)
  }

  await em.flush()
}

export async function seedWarrantyClaimsDefaults(em: EntityManager, scope: SeedScope): Promise<void> {
  await ensureWarrantyDictionaryEntries(em, scope, WARRANTY_DICTIONARY_KEYS.status, statuses as DictionarySeed[])
  await ensureWarrantyDictionaryEntries(em, scope, WARRANTY_DICTIONARY_KEYS.priority, priorities as DictionarySeed[])
  await ensureWarrantyDictionaryEntries(em, scope, WARRANTY_DICTIONARY_KEYS.category, categories as DictionarySeed[])
  await em.flush()

  const projectsBySeedKey = await seedWarrantyProjects(em, scope)
  await seedWarrantySubcontractors(em, scope, projectsBySeedKey)
}
