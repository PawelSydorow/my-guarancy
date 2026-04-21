import type { EntityManager } from '@mikro-orm/postgresql'
import { Dictionary, DictionaryEntry } from '@open-mercato/core/modules/dictionaries/data/entities'
import { User } from '@open-mercato/core/modules/auth/data/entities'
import { CrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { Project, ProjectSubcontractor, WarrantyClaim } from '../data/entities'
import { prepareClaimInput } from './claim-logic'

function createEntityManagerMock(config?: {
  projectActive?: boolean
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

describe('prepareClaimInput', () => {
  it('autofills resolved_at on first transition to zakonczone', async () => {
    const em = createEntityManagerMock({ userExists: true })
    const result = await prepareClaimInput(
      em,
      { tenantId: 'tenant-1', organizationId: 'org-1' },
      { ...baseInput, status_key: 'zakonczone' },
    )

    expect(result.status_key).toBe('zakonczone')
    expect(result.resolved_at).toBeTruthy()
  })

  it('preserves manually provided resolved_at', async () => {
    const em = createEntityManagerMock({ userExists: true })
    const result = await prepareClaimInput(
      em,
      { tenantId: 'tenant-1', organizationId: 'org-1' },
      { ...baseInput, status_key: 'zakonczone', resolved_at: '2026-04-21T15:30:00.000Z' },
    )

    expect(result.resolved_at).toBe('2026-04-21T15:30:00.000Z')
  })

  it('rejects subcontractor from a different project', async () => {
    const em = createEntityManagerMock({
      userExists: true,
      activeSubcontractor: null,
    })

    await expect(
      prepareClaimInput(
        em,
        { tenantId: 'tenant-1', organizationId: 'org-1' },
        { ...baseInput, subcontractor_id: '33333333-3333-3333-3333-333333333333' },
      ),
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
    } as WarrantyClaim

    const result = await prepareClaimInput(
      em,
      { tenantId: 'tenant-1', organizationId: 'org-1' },
      { ...baseInput, id: 'claim-1', subcontractor_id: '33333333-3333-3333-3333-333333333333' },
      existing,
    )

    expect(result.subcontractor_name).toBe('Snapshot name')
    expect(result.subcontractor_email).toBe('snapshot@example.com')
  })
})
