import { transferDraftAttachments } from './attachments'

function mockJsonResponse(body: unknown, ok = true) {
  return {
    ok,
    json: async () => body,
  } as Response
}

describe('warranty claim attachment transfer', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('uses the warranty claim entity for draft lookup and transfer', async () => {
    const fetchMock = jest.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.startsWith('/api/attachments?')) {
        expect(url).toContain('entityId=warranty_claims%3Aclaim')
        expect(url).toContain('recordId=warranty-claim-create%3Aabc')
        return mockJsonResponse({
          items: [{ id: '11111111-1111-4111-8111-111111111111' }],
        })
      }
      if (url === '/api/attachments/transfer') {
        expect(init?.method).toBe('POST')
        expect(JSON.parse(String(init?.body ?? '{}'))).toEqual({
          entityId: 'warranty_claims:claim',
          attachmentIds: ['11111111-1111-4111-8111-111111111111'],
          fromRecordId: 'warranty-claim-create:abc',
          toRecordId: 'claim-1',
        })
        return mockJsonResponse({ ok: true, updated: 1 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
    global.fetch = fetchMock as typeof fetch

    await transferDraftAttachments('warranty-claim-create:abc', 'claim-1')

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('skips transfer when the draft has no attachments', async () => {
    const fetchMock = jest.fn(async () => mockJsonResponse({ items: [] }))
    global.fetch = fetchMock as typeof fetch

    await transferDraftAttachments('warranty-claim-create:empty', 'claim-1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
