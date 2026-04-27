import type { EntityManager } from '@mikro-orm/postgresql'
import { Dictionary, DictionaryEntry } from '@open-mercato/core/modules/dictionaries/data/entities'
import { normalizeDictionaryValue } from '@open-mercato/core/modules/dictionaries/lib/utils'
import { WARRANTY_DICTIONARY_KEYS, WARRANTY_PRIORITY_ORDER, WARRANTY_STATUS_KEYS } from './constants'
import { Project, ProjectSubcontractor, WarrantyClaim } from '../data/entities'
import categories from '../seed/categories.json'
import priorities from '../seed/priorities.json'
import projects from '../seed/projects.json'
import statuses from '../seed/statuses.json'

type SeedScope = {
  tenantId: string
  organizationId: string
}

export type DictionarySeed = {
  value: string
  label: string
}

export type ProjectSeed = {
  seedKey: string
  name: string
  code?: string | null
  shortLabel?: string | null
}

export type SubcontractorSeed = {
  seedKey: string
  projectSeedKey: string
  name: string
  address: string
  email: string
  phone: string
  contactPerson: string
}

export type ClaimSeed = {
  projectSeedKey: string
  claimNumber: number
  title: string
  issueDescription: string
  locationText: string
  priorityKey: string
  categoryKey: string
  basNumber: string
  statusKey: string
  reportedAt: string
  resolvedAt: string | null
  rejectionReason: string | null
  subcontractorSeedKey: string | null
}

export type WarrantyProjectCatalogEntry = {
  project: ProjectSeed
  subcontractors: SubcontractorSeed[]
  claims: ClaimSeed[]
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

const PROJECT_SEED_COUNT = 10
const DAY_MS = 24 * 60 * 60 * 1000
const SEED_REFERENCE_DATE = new Date('2026-04-27T12:00:00.000Z')

const SERVICE_PREFIXES = [
  'HydroMax',
  'Elektro Serwis',
  'Bruk System',
  'Fasada Plus',
  'DachPro',
  'VentiLine',
  'OknoMaster',
  'TerraFix',
  'StalBud',
  'Metrum',
]

const SERVICE_SUFFIXES = [
  'Instalacje',
  'Serwis',
  'Technika',
  'System',
  'Bud',
  'Partner',
  'Team',
  'Construction',
  'Solutions',
  'Group',
]

const STREET_NAMES = [
  'Wodna',
  'Kostki',
  'Iskry',
  'Lesna',
  'Parkowa',
  'Polna',
  'Szeroka',
  'Rycerska',
  'Sloneczna',
  'Zielona',
]

const CITIES = [
  'Poznan',
  'Lubon',
  'Swarzedz',
  'Komorniki',
  'Mosina',
  'Puszczykowo',
  'Przezmierowo',
  'Plewiska',
  'Suchy Las',
  'Lusowo',
]

const CONTACT_FIRST_NAMES = [
  'Jan',
  'Anna',
  'Marek',
  'Agnieszka',
  'Piotr',
  'Karolina',
  'Tomasz',
  'Monika',
  'Krzysztof',
  'Olga',
]

const CONTACT_LAST_NAMES = [
  'Nowak',
  'Kowalska',
  'Szymanski',
  'Kaczmarek',
  'Wojcik',
  'Zielinska',
  'Lewandowski',
  'Pietrzak',
  'Dabrowski',
  'Piotrowska',
]

const CLAIM_LOCATIONS = [
  'klatka A',
  'klatka B',
  'lokal 12',
  'lokal 24',
  'garaz podziemny',
  'taras',
  'balkon',
  'strefa wejscia',
  'dach',
  'ogrod',
  'piwnica',
  'sala techniczna',
]

const REJECTION_REASONS = [
  'Usterka wynika z eksploatacji, a nie z wady wykonawczej.',
  'Zakres nie podlega gwarancji w obecnym etapie inwestycji.',
  'Brak potwierdzenia wady po oględzinach technicznych.',
  'Zgloszenie wymaga uzupelnienia dokumentacji zdjeciowej.',
]

const CLAIM_STATUS_WEIGHTS: Record<string, Array<{ value: string; weight: number }>> = {
  [WARRANTY_STATUS_KEYS.pending]: [
    { value: WARRANTY_STATUS_KEYS.pending, weight: 70 },
    { value: WARRANTY_STATUS_KEYS.transferredUnresolved, weight: 30 },
  ],
  [WARRANTY_STATUS_KEYS.transferredUnresolved]: [
    { value: WARRANTY_STATUS_KEYS.transferredUnresolved, weight: 65 },
    { value: WARRANTY_STATUS_KEYS.resolved, weight: 25 },
    { value: WARRANTY_STATUS_KEYS.rejected, weight: 10 },
  ],
  [WARRANTY_STATUS_KEYS.resolved]: [
    { value: WARRANTY_STATUS_KEYS.resolved, weight: 70 },
    { value: WARRANTY_STATUS_KEYS.rejected, weight: 20 },
    { value: WARRANTY_STATUS_KEYS.transferredUnresolved, weight: 10 },
  ],
  [WARRANTY_STATUS_KEYS.rejected]: [
    { value: WARRANTY_STATUS_KEYS.rejected, weight: 65 },
    { value: WARRANTY_STATUS_KEYS.resolved, weight: 25 },
    { value: WARRANTY_STATUS_KEYS.transferredUnresolved, weight: 10 },
  ],
}

const PRIORITY_BY_STATUS: Record<string, string[]> = {
  [WARRANTY_STATUS_KEYS.pending]: ['sredni', 'niski'],
  [WARRANTY_STATUS_KEYS.transferredUnresolved]: ['wysoki', 'sredni'],
  [WARRANTY_STATUS_KEYS.resolved]: ['niski', 'sredni'],
  [WARRANTY_STATUS_KEYS.rejected]: ['wysoki', 'krytyczny'],
}

function hashString(value: string): number {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createRng(seed: string) {
  let state = hashString(seed) || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 0x100000000
  }
}

function pick<T>(rng: () => number, values: readonly T[]): T {
  return values[Math.floor(rng() * values.length)] as T
}

function intBetween(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function pickWeighted<T extends string>(rng: () => number, choices: Array<{ value: T; weight: number }>): T {
  const total = choices.reduce((sum, choice) => sum + choice.weight, 0)
  let cursor = rng() * total
  for (const choice of choices) {
    cursor -= choice.weight
    if (cursor <= 0) return choice.value
  }
  return choices[choices.length - 1]?.value
}

function shuffle<T>(rng: () => number, values: readonly T[]): T[] {
  const copy = [...values]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1))
    const temp = copy[index]
    copy[index] = copy[swapIndex] as T
    copy[swapIndex] = temp as T
  }
  return copy
}

function uniqueSlice<T>(rng: () => number, values: readonly T[], count: number): T[] {
  return shuffle(rng, values).slice(0, Math.min(count, values.length))
}

function offsetDays(base: Date, days: number): Date {
  return new Date(base.getTime() + (days * DAY_MS))
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'seed'
}

function normalizeProjectSeed(project: ProjectSeed): ProjectSeed {
  return {
    seedKey: project.seedKey.trim(),
    name: project.name.trim(),
    code: project.code?.trim() || null,
    shortLabel: project.shortLabel?.trim() || null,
  }
}

function normalizeDictionarySeed(entry: DictionarySeed): DictionarySeed {
  return {
    value: entry.value.trim(),
    label: entry.label.trim() || entry.value.trim(),
  }
}

function getProjectShortLabel(project: ProjectSeed): string {
  return project.shortLabel?.trim() || project.code?.trim() || project.name.trim()
}

function buildSubcontractorSeed(project: ProjectSeed, projectIndex: number, subcontractorIndex: number): SubcontractorSeed {
  const shortLabel = getProjectShortLabel(project)
  const servicePrefix = SERVICE_PREFIXES[(projectIndex + subcontractorIndex) % SERVICE_PREFIXES.length]
  const serviceSuffix = SERVICE_SUFFIXES[(projectIndex * 3 + subcontractorIndex) % SERVICE_SUFFIXES.length]
  const streetName = STREET_NAMES[(projectIndex * 2 + subcontractorIndex) % STREET_NAMES.length]
  const city = CITIES[(projectIndex + subcontractorIndex) % CITIES.length]
  const contactFirstName = CONTACT_FIRST_NAMES[(projectIndex + subcontractorIndex) % CONTACT_FIRST_NAMES.length]
  const contactLastName = CONTACT_LAST_NAMES[(projectIndex * 2 + subcontractorIndex) % CONTACT_LAST_NAMES.length]
  const projectCode = (project.code?.trim() || project.seedKey).replace(/[^a-z0-9]+/gi, '').toLowerCase()

  return {
    seedKey: `subcontractor-${project.seedKey}-${String(subcontractorIndex + 1).padStart(2, '0')}`,
    projectSeedKey: project.seedKey,
    name: `${servicePrefix} ${serviceSuffix} ${shortLabel}`,
    address: `${streetName} ${subcontractorIndex + 1}, 60-${String(100 + projectIndex).padStart(3, '0')} ${city}`,
    email: `kontakt.${slugify(shortLabel)}.${subcontractorIndex + 1}.${projectCode}@example`,
    phone: `+48 500 ${String(200 + projectIndex * 10 + subcontractorIndex).padStart(3, '0')} ${String(300 + projectIndex * 10 + subcontractorIndex).padStart(3, '0')}`,
    contactPerson: `${contactFirstName} ${contactLastName}`,
  }
}

function buildClaimSeed(
  project: ProjectSeed,
  projectIndex: number,
  claimIndex: number,
  categoriesForProject: DictionarySeed[],
  subcontractorsForProject: SubcontractorSeed[],
  rng: () => number,
): ClaimSeed {
  const claimNumber = claimIndex + 1
  const category = categoriesForProject[claimIndex % categoriesForProject.length] ?? categoriesForProject[0]
  const location = CLAIM_LOCATIONS[(projectIndex * 3 + claimIndex) % CLAIM_LOCATIONS.length]
  const baseReportedAt = offsetDays(SEED_REFERENCE_DATE, -(projectIndex * 11 + claimIndex * 4 + intBetween(rng, 2, 9)))

  let statusKey: string
  if (claimIndex === 0) {
    statusKey = WARRANTY_STATUS_KEYS.pending
  } else if (claimIndex === 1) {
    statusKey = WARRANTY_STATUS_KEYS.transferredUnresolved
  } else {
    statusKey = pickWeighted(rng, CLAIM_STATUS_WEIGHTS[WARRANTY_STATUS_KEYS.resolved] as Array<{ value: string; weight: number }>)
  }

  const priorityKey = pickWeighted(rng, PRIORITY_BY_STATUS[statusKey] as Array<{ value: string; weight: number }>)

  let resolvedAt: string | null = null
  let rejectionReason: string | null = null
  if (statusKey === WARRANTY_STATUS_KEYS.resolved) {
    resolvedAt = offsetDays(baseReportedAt, intBetween(rng, 2, 12)).toISOString()
  } else if (statusKey === WARRANTY_STATUS_KEYS.rejected) {
    resolvedAt = offsetDays(baseReportedAt, intBetween(rng, 1, 6)).toISOString()
    rejectionReason = pick(rng, REJECTION_REASONS)
  }

  const subcontractor = subcontractorsForProject.length > 0 && claimIndex > 0
    ? subcontractorsForProject[(claimIndex - 1) % subcontractorsForProject.length]
    : null

  const descriptionParts = [
    `Zgloszenie dotyczy ${category.label.toLowerCase()} w projekcie ${project.name}.`,
    `Lokalizacja: ${location}.`,
    subcontractor ? `Wskazany podwykonawca: ${subcontractor.name}.` : 'Brak przypisanego podwykonawcy.',
  ]

  if (statusKey === WARRANTY_STATUS_KEYS.resolved) {
    descriptionParts.push('Zgloszenie zostalo zamkniete po wykonaniu naprawy.')
  } else if (statusKey === WARRANTY_STATUS_KEYS.rejected) {
    descriptionParts.push('Zgloszenie zostalo zamkniete odmownie po weryfikacji gwarancyjnej.')
  } else if (statusKey === WARRANTY_STATUS_KEYS.transferredUnresolved) {
    descriptionParts.push('Zgloszenie przekazano do dalszej obslugi.')
  } else {
    descriptionParts.push('Zgloszenie oczekuje na dalsze dzialania.')
  }

  return {
    projectSeedKey: project.seedKey,
    claimNumber,
    title: `${category.label} - ${location}`,
    issueDescription: descriptionParts.join(' '),
    locationText: location,
    priorityKey: priorityKey || WARRANTY_PRIORITY_ORDER[1],
    categoryKey: category.value,
    basNumber: `BAS-${project.code ?? project.seedKey}-${String(claimNumber).padStart(2, '0')}`,
    statusKey,
    reportedAt: baseReportedAt.toISOString(),
    resolvedAt,
    rejectionReason,
    subcontractorSeedKey: subcontractor?.seedKey ?? null,
  }
}

export function buildWarrantyProjectSeeds(total = PROJECT_SEED_COUNT): ProjectSeed[] {
  const baseProjects = (projects as ProjectSeed[])
    .map(normalizeProjectSeed)
    .filter((project) => project.seedKey.length > 0 && project.name.length > 0)

  return baseProjects.slice(0, total)
}

export function buildWarrantyCategorySeeds(): DictionarySeed[] {
  return (categories as DictionarySeed[]).map(normalizeDictionarySeed)
}

export function buildWarrantyProjectCatalog(): WarrantyProjectCatalogEntry[] {
  const projectSeeds = buildWarrantyProjectSeeds()
  const categorySeeds = buildWarrantyCategorySeeds()

  return projectSeeds.map((project, projectIndex) => {
    const rng = createRng(`${project.seedKey}:warranty-seed`)
    const subcontractorCount = intBetween(rng, 4, 10)
    const claimCount = projectIndex === 0 ? 4 : 0
    const categoriesForProject = uniqueSlice(rng, categorySeeds, intBetween(rng, 3, 4))
    const subcontractors = Array.from({ length: subcontractorCount }, (_, subcontractorIndex) => (
      buildSubcontractorSeed(project, projectIndex, subcontractorIndex)
    ))
    const claims = Array.from({ length: claimCount }, (_, claimIndex) => (
      buildClaimSeed(project, projectIndex, claimIndex, categoriesForProject, subcontractors, rng)
    ))

    return {
      project,
      subcontractors,
      claims,
    }
  })
}

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

async function cleanupGeneratedProjects(
  em: EntityManager,
  scope: SeedScope,
  desiredSeedKeys: Set<string>,
): Promise<void> {
  const allProjects = await em.find(Project, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })

  const staleProjects = allProjects.filter((project) => (
    project.seedKey.startsWith('projekt-gwarancyjny-') && !desiredSeedKeys.has(project.seedKey)
  ))

  if (staleProjects.length === 0) return

  const staleProjectIds = staleProjects.map((project) => project.id)

  const staleClaims = await em.find(WarrantyClaim, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    projectId: { $in: staleProjectIds },
  })
  staleClaims.forEach((claim) => em.remove(claim))
  await em.flush()

  const staleSubcontractors = await em.find(ProjectSubcontractor, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    projectId: { $in: staleProjectIds },
  })
  staleSubcontractors.forEach((subcontractor) => em.remove(subcontractor))
  await em.flush()

  staleProjects.forEach((project) => em.remove(project))
  await em.flush()
}

export async function seedWarrantyProjects(em: EntityManager, scope: SeedScope): Promise<Map<string, Project>> {
  const bySeedKey = new Map<string, Project>()
  const desiredProjects = buildWarrantyProjectSeeds()
  const desiredSeedKeys = new Set(desiredProjects.map((project) => project.seedKey))

  await cleanupGeneratedProjects(em, scope, desiredSeedKeys)

  for (const rawProject of desiredProjects) {
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
        createdAt: offsetDays(SEED_REFERENCE_DATE, -(desiredProjects.indexOf(rawProject) * 17 + 30)),
        updatedAt: offsetDays(SEED_REFERENCE_DATE, -(desiredProjects.indexOf(rawProject) * 7 + 10)),
      })
      em.persist(project)
    } else {
      project.name = rawProject.name.trim()
      project.code = rawProject.code?.trim() || null
      project.isActive = true
      project.deletedAt = null
      project.updatedAt = offsetDays(SEED_REFERENCE_DATE, -(desiredProjects.indexOf(rawProject) * 7 + 10))
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
): Promise<Map<string, Map<string, ProjectSubcontractor>>> {
  const subcontractorsByProject = new Map<string, Map<string, ProjectSubcontractor>>()
  const catalog = buildWarrantyProjectCatalog()

  for (const entry of catalog) {
    const project = projectsBySeedKey.get(entry.project.seedKey)
    if (!project) continue

    const desiredSeedKeys = new Set(entry.subcontractors.map((item) => item.seedKey))
    const existing = await em.find(ProjectSubcontractor, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      projectId: project.id,
    })
    existing
      .filter((item) => !desiredSeedKeys.has(item.seedKey))
      .forEach((item) => em.remove(item))

    await em.flush()

    const bySeedKey = new Map<string, ProjectSubcontractor>()
    for (const [subcontractorIndex, rawSubcontractor] of entry.subcontractors.entries()) {
      let subcontractor = existing.find((item) => item.seedKey === rawSubcontractor.seedKey)
      if (!subcontractor) {
        subcontractor = em.create(ProjectSubcontractor, {
          tenantId: scope.tenantId,
          organizationId: scope.organizationId,
          seedKey: rawSubcontractor.seedKey,
          projectId: project.id,
          name: rawSubcontractor.name,
          address: rawSubcontractor.address,
          email: rawSubcontractor.email,
          phone: rawSubcontractor.phone,
          contactPerson: rawSubcontractor.contactPerson,
          isActive: true,
          createdAt: offsetDays(SEED_REFERENCE_DATE, -(entry.subcontractors.length * 3 + subcontractorIndex + 1)),
          updatedAt: offsetDays(SEED_REFERENCE_DATE, -(entry.subcontractors.length * 2 + subcontractorIndex + 1)),
        })
        em.persist(subcontractor)
      } else {
        subcontractor.projectId = project.id
        subcontractor.name = rawSubcontractor.name
        subcontractor.address = rawSubcontractor.address
        subcontractor.email = rawSubcontractor.email
        subcontractor.phone = rawSubcontractor.phone
        subcontractor.contactPerson = rawSubcontractor.contactPerson
        subcontractor.isActive = true
        subcontractor.deletedAt = null
        subcontractor.updatedAt = offsetDays(SEED_REFERENCE_DATE, -(entry.subcontractors.length * 2 + subcontractorIndex + 1))
        em.persist(subcontractor)
      }

      bySeedKey.set(rawSubcontractor.seedKey, subcontractor)
    }

    subcontractorsByProject.set(entry.project.seedKey, bySeedKey)
  }

  await em.flush()
  return subcontractorsByProject
}

export async function seedWarrantyClaims(
  em: EntityManager,
  scope: SeedScope,
  projectsBySeedKey: Map<string, Project>,
  subcontractorsByProject: Map<string, Map<string, ProjectSubcontractor>>,
): Promise<void> {
  const catalog = buildWarrantyProjectCatalog()

  for (const entry of catalog) {
    const project = projectsBySeedKey.get(entry.project.seedKey)
    if (!project) continue
    const subcontractors = subcontractorsByProject.get(entry.project.seedKey) ?? new Map<string, ProjectSubcontractor>()

    for (const rawClaim of entry.claims) {
      const subcontractor = rawClaim.subcontractorSeedKey ? subcontractors.get(rawClaim.subcontractorSeedKey) ?? null : null
      const reportedAt = new Date(rawClaim.reportedAt)
      const resolvedAt = rawClaim.resolvedAt ? new Date(rawClaim.resolvedAt) : null
      const claimCreatedAt = resolvedAt ?? reportedAt
      const claimUpdatedAt = resolvedAt ?? offsetDays(reportedAt, 1)

      let claim = await em.findOne(WarrantyClaim, {
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        projectId: project.id,
        claimNumber: rawClaim.claimNumber,
      })

      if (!claim) {
        claim = em.create(WarrantyClaim, {
          tenantId: scope.tenantId,
          organizationId: scope.organizationId,
          projectId: project.id,
          claimNumber: rawClaim.claimNumber,
          title: rawClaim.title,
          issueDescription: rawClaim.issueDescription,
          locationText: rawClaim.locationText,
          priorityKey: rawClaim.priorityKey,
          categoryKey: rawClaim.categoryKey,
          basNumber: rawClaim.basNumber,
          statusKey: rawClaim.statusKey,
          reportedAt,
          assignedUserId: null,
          resolvedAt,
          rejectionReason: rawClaim.rejectionReason,
          subcontractorId: subcontractor?.id ?? null,
          subcontractorName: subcontractor?.name ?? null,
          subcontractorAddress: subcontractor?.address ?? null,
          subcontractorEmail: subcontractor?.email ?? null,
          subcontractorPhone: subcontractor?.phone ?? null,
          subcontractorContactPerson: subcontractor?.contactPerson ?? null,
          isActive: true,
          createdAt: claimCreatedAt,
          updatedAt: claimUpdatedAt,
        })
        em.persist(claim)
        continue
      }

      claim.title = rawClaim.title
      claim.issueDescription = rawClaim.issueDescription
      claim.locationText = rawClaim.locationText
      claim.priorityKey = rawClaim.priorityKey
      claim.categoryKey = rawClaim.categoryKey
      claim.basNumber = rawClaim.basNumber
      claim.statusKey = rawClaim.statusKey
      claim.reportedAt = reportedAt
      claim.assignedUserId = null
      claim.resolvedAt = resolvedAt
      claim.rejectionReason = rawClaim.rejectionReason
      claim.subcontractorId = subcontractor?.id ?? null
      claim.subcontractorName = subcontractor?.name ?? null
      claim.subcontractorAddress = subcontractor?.address ?? null
      claim.subcontractorEmail = subcontractor?.email ?? null
      claim.subcontractorPhone = subcontractor?.phone ?? null
      claim.subcontractorContactPerson = subcontractor?.contactPerson ?? null
      claim.isActive = true
      claim.deletedAt = null
      claim.updatedAt = claimUpdatedAt
      em.persist(claim)
    }
  }

  await em.flush()
}

export async function seedWarrantyClaimsDefaults(em: EntityManager, scope: SeedScope): Promise<void> {
  const categorySeeds = buildWarrantyCategorySeeds()
  await ensureWarrantyDictionaryEntries(em, scope, WARRANTY_DICTIONARY_KEYS.status, statuses as DictionarySeed[])
  await ensureWarrantyDictionaryEntries(em, scope, WARRANTY_DICTIONARY_KEYS.priority, priorities as DictionarySeed[])
  await ensureWarrantyDictionaryEntries(em, scope, WARRANTY_DICTIONARY_KEYS.category, categorySeeds)
  await em.flush()

  const projectsBySeedKey = await seedWarrantyProjects(em, scope)
  const subcontractorsByProject = await seedWarrantySubcontractors(em, scope, projectsBySeedKey)
  await seedWarrantyClaims(em, scope, projectsBySeedKey, subcontractorsByProject)
}
