import {
  parsePortalClaimsListQuery,
  portalClaimCreateSchema,
} from './portal'

describe('portal warranty claims contract', () => {
  it('applies list query defaults', () => {
    expect(parsePortalClaimsListQuery(new URLSearchParams())).toEqual({
      page: 1,
      limit: 20,
      sortBy: 'reportedAt',
      sortDir: 'desc',
      priorityKey: undefined,
      search: undefined,
      statusKey: undefined,
    })
  })

  it('rejects invalid list query values', () => {
    expect(() => parsePortalClaimsListQuery(new URLSearchParams('limit=101'))).toThrow()
    expect(() => parsePortalClaimsListQuery(new URLSearchParams('sortBy=updatedAt'))).toThrow()
  })

  it('trims search input', () => {
    expect(parsePortalClaimsListQuery(new URLSearchParams('search=%20usterka%20')).search).toBe('usterka')
  })

  it('defaults optional create fields and rejects unknown payload keys', () => {
    expect(portalClaimCreateSchema.parse({
      title: 'Nowa usterka',
      issueDescription: 'Opis usterki przekraczajacy minimalna dlugosc.',
      locationText: 'Klatka A',
      categoryKey: 'elewacja',
    })).toEqual({
      title: 'Nowa usterka',
      issueDescription: 'Opis usterki przekraczajacy minimalna dlugosc.',
      locationText: 'Klatka A',
      priorityKey: 'sredni',
      categoryKey: 'elewacja',
    })

    expect(() => portalClaimCreateSchema.parse({
      title: 'Nowa usterka',
      issueDescription: 'Opis usterki przekraczajacy minimalna dlugosc.',
      locationText: 'Klatka A',
      categoryKey: 'elewacja',
      statusKey: 'usunięta',
    })).toThrow()
  })

  it('rejects missing location and forbidden internal fields', () => {
    expect(() => portalClaimCreateSchema.parse({
      title: 'Nowa usterka',
      issueDescription: 'Opis usterki przekraczajacy minimalna dlugosc.',
      priorityKey: 'sredni',
      categoryKey: 'elewacja',
    })).toThrow()

    expect(() => portalClaimCreateSchema.parse({
      title: 'Nowa usterka',
      issueDescription: 'Opis usterki przekraczajacy minimalna dlugosc.',
      locationText: 'Klatka A',
      categoryKey: 'elewacja',
      projectId: '11111111-1111-4111-8111-111111111111',
      statusKey: 'usunięta',
    })).toThrow()
  })
})
