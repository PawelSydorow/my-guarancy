import type { EntityManager } from '@mikro-orm/postgresql'
import { Dictionary, DictionaryEntry } from '@open-mercato/core/modules/dictionaries/data/entities'
import { User } from '@open-mercato/core/modules/auth/data/entities'
import { CrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { Project, ProjectSubcontractor, WarrantyClaim } from '../data/entities'
import { formatClaimNumber, prepareClaimInput, preparePortalClaimInput, serializeClaimRecord } from './claim-logic'

function createEntityManagerMock(config?: {
  projectActive?: boolean
  projectList?: Project[]
  userExists?: boolean
  activeSubcontractor?: ProjectSubcontractor | null
  historicalSubcontractor?: ProjectSubcontractor | null
}) {
  const mock = {
    findOne: jest.fn(async (entity: unknown, where: Record<string, unknown>) => {
      if (entity === Project) {
        if (config?.projectActive === false && where.deletedAt === null) return null
        return {
          id: where.id ?? 'project-1',
          name: 'Projekt A',
          code: 'PA-1',
        } as Project
      }

      if (entity === Dictionary) {
        return { id: 'dict-1' } as Dictionary
      }

      if (entity === DictionaryEntry) {
        return { id: 'entry-1', value: where.value } as DictionaryEntry
      }

      if (entity === User) {
        if (config?.userExists === false) return null
        return { id: where.id ?? 'user-1' } as User
      }

      if (entity === ProjectSubcontractor) {
        if (where.deletedAt === null && where.isActive === true) {
          return config?.activeSubcontractor ?? null
        }
        return config?.historicalSubcontractor ?? null
      }

      return null
    }),
    getConnection: () => ({
      getKnex: () => {
        const chain = {
          where: () => chain,
          max: () => chain,
          first: async () => ({ maxClaimNumber: null }),
        }
        return () => chain
      },
    }),
    find: jest.fn(async (entity: unknown) => {
      if (entity === Project) {
        return config?.projectList ?? []
      }
      return []
    }),
  }

  return mock as unknown as EntityManager
}

const baseInput = {
  project_id: '11111111-1111-1111-1111-111111111111',
  title: '  Pęknięcie tynku  ',
  issue_description: '  Opis usterki  ',
  location_text: '  Klatka A  ',
  priority_key: ' wysoki ',
  category_key: ' elewacja ',
  bas_number: ' BAS-001 ',
  status_key: ' oczekuje ',
  reported_at: '2026-04-21T10:00:00.000Z',
  assigned_user_id: '22222222-2222-2222-2222-222222222222',
  resolved_at: null,
  subcontractor_id: null,
} as const

const SCOPE = { tenantId: 'tenant-1', organizationId: 'org-1' }

describe('prepareClaimInput', () => {
  describe('claim number logic', () => {
    it('assigns first claim number for a project when no claims exist', async () => {
      const em = createEntityManagerMock({ userExists: true })
      ;(em as unknown as { getConnection: () => { getKnex: () => unknown } }).getConnection = () => ({
        getKnex: () => {
          const chain = {
            where: () => chain,
            max: () => chain,
            first: async () => ({ maxClaimNumber: null }),
          }
          return () => chain
        },
      })

      const result = await prepareClaimInput(em, SCOPE, baseInput)

      expect(result.claim_number).toBe(1)
    })

    it('increments claim number within the same project', async () => {
      const em = createEntityManagerMock({ userExists: true })
      ;(em as unknown as { getConnection: () => { getKnex: () => unknown } }).getConnection = () => ({
        getKnex: () => {
          const chain = {
            where: () => chain,
            max: () => chain,
            first: async () => ({ maxClaimNumber: 7 }),
          }
          return () => chain
        },
      })

      const result = await prepareClaimInput(em, SCOPE, baseInput)

      expect(result.claim_number).toBe(8)
    })

    it('keeps existing claim number on edit', async () => {
      const em = createEntityManagerMock({ userExists: true })
      const existing = {
        id: 'claim-1',
        projectId: '11111111-1111-1111-1111-111111111111',
        claimNumber: 4,
        subcontractorId: null,
        resolvedAt: null,
      } as WarrantyClaim

      const result = await prepareClaimInput(em, SCOPE, { ...baseInput, id: 'claim-1' }, existing)

      expect(result.claim_number).toBe(4)
    })
  })

  describe('project immutability', () => {
    it('rejects project change on edit', async () => {
      const em = createEntityManagerMock({ userExists: true })
      const existing = {
        id: 'claim-1',
        projectId: '99999999-9999-9999-9999-999999999999',
        claimNumber: 4,
        subcontractorId: null,
        resolvedAt: null,
      } as WarrantyClaim

      await expect(
        prepareClaimInput(em, SCOPE, { ...baseInput, id: 'claim-1' }, existing),
      ).rejects.toBeInstanceOf(CrudHttpError)
    })
  })

  describe('resolved_at logic', () => {
    it('autofills resolved_at on first transition to usunięta', async () => {
      const em = createEntityManagerMock({ userExists: true })
      const result = await prepareClaimInput(em, SCOPE, { ...baseInput, status_key: 'usunięta' })

      expect(result.status_key).toBe('usunięta')
      expect(result.resolved_at).toBeTruthy()
    })

    it('preserves manually provided resolved_at', async () => {
      const em = createEntityManagerMock({ userExists: true })
      const result = await prepareClaimInput(
        em, SCOPE,
        { ...baseInput, status_key: 'usunięta', resolved_at: '2026-04-21T15:30:00.000Z' },
      )

      expect(result.resolved_at).toBe('2026-04-21T15:30:00.000Z')
    })

    it('preserves existing DB resolved_at on PUT when input sends null', async () => {
      const em = createEntityManagerMock({ userExists: true })
      const existingResolvedAt = new Date('2026-04-20T12:00:00.000Z')
      const existing = {
        id: 'claim-1',
        projectId: '11111111-1111-1111-1111-111111111111',
        subcontractorId: null,
        resolvedAt: existingResolvedAt,
      } as WarrantyClaim

      const result = await prepareClaimInput(
        em, SCOPE,
        { ...baseInput, id: 'claim-1', status_key: 'usunięta', resolved_at: null },
        existing,
      )

      expect(result.resolved_at).toBe(existingResolvedAt.toISOString())
    })

    it('does not overwrite resolved_at on repeated transitions to usunięta', async () => {
      const em = createEntityManagerMock({ userExists: true })
      const originalDate = '2026-04-10T08:00:00.000Z'
      const existing = {
        id: 'claim-1',
        projectId: '11111111-1111-1111-1111-111111111111',
        subcontractorId: null,
        resolvedAt: new Date(originalDate),
      } as WarrantyClaim

      const result = await prepareClaimInput(
        em, SCOPE,
        { ...baseInput, id: 'claim-1', status_key: 'usunięta', resolved_at: null },
        existing,
      )

      expect(result.resolved_at).toBe(originalDate)
    })

    it('does not autofill resolved_at for non-usunięta status', async () => {
      const em = createEntityManagerMock({ userExists: true })
      const result = await prepareClaimInput(em, SCOPE, { ...baseInput, status_key: 'oczekuje' })

      expect(result.resolved_at).toBeNull()
    })
  })

  describe('subcontractor validation', () => {
    it('rejects subcontractor from a different project', async () => {
      const em = createEntityManagerMock({ userExists: true, activeSubcontractor: null })

      await expect(
        prepareClaimInput(em, SCOPE, { ...baseInput, subcontractor_id: '33333333-3333-3333-3333-333333333333' }),
      ).rejects.toBeInstanceOf(CrudHttpError)
    })

    it('allows historical subcontractor on edit when it stays unchanged', async () => {
      const em = createEntityManagerMock({
        userExists: true,
        activeSubcontractor: null,
        historicalSubcontractor: {
          id: '33333333-3333-3333-3333-333333333333',
          projectId: '11111111-1111-1111-1111-111111111111',
          name: 'Nieaktywny podwykonawca',
          address: 'ul. Historyczna 1',
          email: 'history@example.com',
          phone: '+48 500 000 000',
          contactPerson: 'Jan Historia',
        } as ProjectSubcontractor,
      })

      const existing = {
        id: 'claim-1',
        projectId: '11111111-1111-1111-1111-111111111111',
        subcontractorId: '33333333-3333-3333-3333-333333333333',
        subcontractorName: 'Snapshot name',
        subcontractorAddress: 'Snapshot address',
        subcontractorEmail: 'snapshot@example.com',
        subcontractorPhone: '+48 123 123 123',
        subcontractorContactPerson: 'Snapshot person',
        resolvedAt: null,
      } as WarrantyClaim

      const result = await prepareClaimInput(
        em, SCOPE,
        { ...baseInput, id: 'claim-1', subcontractor_id: '33333333-3333-3333-3333-333333333333' },
        existing,
      )

      expect(result.subcontractor_name).toBe('Snapshot name')
      expect(result.subcontractor_email).toBe('snapshot@example.com')
    })
  })

  describe('project validation', () => {
    it('rejects inactive project on create', async () => {
      const em = createEntityManagerMock({ projectActive: false, userExists: true })

      await expect(
        prepareClaimInput(em, SCOPE, baseInput),
      ).rejects.toBeInstanceOf(CrudHttpError)
    })
  })

  describe('user validation', () => {
    it('rejects non-existent assigned_user_id', async () => {
      const em = createEntityManagerMock({ userExists: false })

      await expect(
        prepareClaimInput(em, SCOPE, { ...baseInput, assigned_user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }),
      ).rejects.toBeInstanceOf(CrudHttpError)
    })
  })

  describe('text trimming', () => {
    it('trims whitespace from text fields', async () => {
      const em = createEntityManagerMock({ userExists: true })
      const result = await prepareClaimInput(em, SCOPE, baseInput)

      expect(result.title).toBe('Pęknięcie tynku')
      expect(result.issue_description).toBe('Opis usterki')
      expect(result.location_text).toBe('Klatka A')
      expect(result.bas_number).toBe('BAS-001')
      expect(result.priority_key).toBe('wysoki')
      expect(result.category_key).toBe('elewacja')
    })
  })
})

describe('claim number formatting', () => {
  it('formats numbers to at least three digits', () => {
    expect(formatClaimNumber(1)).toBe('001')
    expect(formatClaimNumber(12)).toBe('012')
    expect(formatClaimNumber(123)).toBe('123')
    expect(formatClaimNumber(1000)).toBe('1000')
  })

  it('serializes formatted claim number with the record', () => {
    const entity = {
      id: 'claim-1',
      organizationId: 'org-1',
      tenantId: 'tenant-1',
      isActive: true,
      projectId: 'project-1',
      claimNumber: 7,
      title: 'Claim title',
      issueDescription: 'Issue description',
      locationText: 'Location',
      priorityKey: 'high',
      categoryKey: 'facade',
      basNumber: 'BAS-1',
      statusKey: 'open',
      reportedAt: new Date('2026-04-21T10:00:00.000Z'),
      assignedUserId: null,
      resolvedAt: null,
      subcontractorId: null,
      subcontractorName: null,
      subcontractorAddress: null,
      subcontractorEmail: null,
      subcontractorPhone: null,
      subcontractorContactPerson: null,
      createdAt: new Date('2026-04-21T10:00:00.000Z'),
      updatedAt: new Date('2026-04-21T10:00:00.000Z'),
      deletedAt: null,
    } as WarrantyClaim

    const result = serializeClaimRecord(entity)

    expect(result.claim_number).toBe(7)
    expect(result.claim_number_formatted).toBe('007')
  })
})

describe('preparePortalClaimInput', () => {
  it('selects the first active project ordered by name and sets internal defaults', async () => {
    const em = createEntityManagerMock({
      projectList: [
        { id: 'project-2', name: 'B Projekt' } as Project,
        { id: 'project-1', name: 'A Projekt' } as Project,
      ],
    })

    const result = await preparePortalClaimInput(em, SCOPE, {
      title: '  Nieszczelne okno  ',
      issueDescription: '  Opis usterki przekraczajacy minimalna dlugosc.  ',
      locationText: '  Budynek A / lokal 2  ',
      priorityKey: ' wysoki ',
      categoryKey: ' elewacja ',
    })

    expect((em as unknown as { find: jest.Mock }).find).toHaveBeenCalledWith(Project, expect.objectContaining({
      tenantId: SCOPE.tenantId,
      organizationId: SCOPE.organizationId,
      isActive: true,
      deletedAt: null,
    }), expect.objectContaining({
      orderBy: { name: 'asc' },
      limit: 1,
    }))
    expect(result.project_id).toBe('project-1')
    expect(result.status_key).toBe('oczekuje')
    expect(result.assigned_user_id).toBeNull()
    expect(result.subcontractor_id).toBeNull()
    expect(result.resolved_at).toBeNull()
    expect(result.bas_number).toBe('')
    expect(result.category_key).toBe('elewacja')
    expect(result.title).toBe('Nieszczelne okno')
    expect(result.location_text).toBe('Budynek A / lokal 2')
    expect(result.issue_description).toBe('Opis usterki przekraczajacy minimalna dlugosc.')
    expect(result.priority_key).toBe('wysoki')
  })

  it('returns 409 when organization has no active project', async () => {
    const em = createEntityManagerMock({ projectList: [] })

    await expect(
      preparePortalClaimInput(em, SCOPE, {
        title: 'Nowa usterka',
        issueDescription: 'Opis usterki przekraczajacy minimalna dlugosc.',
        locationText: 'Klatka A',
        categoryKey: 'elewacja',
      }),
    ).rejects.toMatchObject({
      status: 409,
      body: { error: 'Brak aktywnego projektu dla organizacji klienta' },
    })
  })
})
