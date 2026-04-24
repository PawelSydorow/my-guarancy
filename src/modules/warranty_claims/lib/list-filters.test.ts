import { buildClaimNumberContainsClause, buildWarrantyClaimListFilters } from './list-filters'

const SCOPE = { tenantId: 'tenant-1', organizationId: 'org-1' }

describe('warranty claim list filters', () => {
  it('filters claim numbers as contains on the formatted value', () => {
    const clause = buildClaimNumberContainsClause('007')
    const [key] = Object.keys(clause)

    expect(key).toBeTruthy()
    expect((clause as Record<string, unknown>)[key]).toEqual({ $ilike: '%007%' })
  })

  it('searches across title, claim number, and project name/code', async () => {
    const em = {
      find: jest.fn(async (_entity: unknown, where: Record<string, unknown>) => {
        expect(where).toMatchObject({
          tenantId: 'tenant-1',
          organizationId: 'org-1',
        })
        return [{ id: 'project-1' }]
      }),
    } as any

    const filters = await buildWarrantyClaimListFilters(
      { search: 'alpha' } as any,
      em,
      SCOPE,
    )

    expect(em.find).toHaveBeenCalledTimes(1)
    expect(Array.isArray(filters.$or)).toBe(true)
    const clauses = filters.$or as Record<string, unknown>[]
    expect(clauses).toHaveLength(3)
    expect(clauses[0]).toEqual({ title: { $ilike: '%alpha%' } })

    const claimNumberClause = clauses[1]
    const [claimKey] = Object.keys(claimNumberClause)
    expect((claimNumberClause as Record<string, unknown>)[claimKey]).toEqual({ $ilike: '%alpha%' })

    expect(clauses[2]).toEqual({ projectId: { $in: ['project-1'] } })
  })

  it('keeps claim number text search separate from the global search', async () => {
    const em = {
      find: jest.fn(async () => []),
    } as any

    const filters = await buildWarrantyClaimListFilters(
      { claim_number: '007', search: 'beta' } as any,
      em,
      SCOPE,
    )

    const keys = Object.keys(filters).filter((key) => key !== '$or')
    const claimKey = keys.find((key) => !['id', 'statusKey', 'priorityKey', 'categoryKey', 'projectId', 'assignedUserId', 'subcontractorId', 'basNumber', 'reportedAt'].includes(key))

    expect(claimKey).toBeTruthy()
    expect((filters as Record<string, unknown>)[claimKey as string]).toEqual({ $ilike: '%007%' })
    expect(Array.isArray(filters.$or)).toBe(true)
  })
})
