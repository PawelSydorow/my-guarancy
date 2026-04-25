import { WARRANTY_CLAIM_ENTITY_ID } from './constants'

export const ATTACHMENTS_LIBRARY_ENTITY_ID = 'attachments:library'

export function createDraftAttachmentRecordId() {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `warranty-claim-create:${randomPart}`
}

async function fetchAttachmentIds(entityId: string, recordId: string) {
  const params = new URLSearchParams({ entityId, recordId })
  const response = await fetch(`/api/attachments?${params.toString()}`, { credentials: 'include' })
  if (!response.ok) throw new Error('Nie udalo sie pobrac listy zalacznikow')
  const payload = await response.json() as { items?: Array<{ id?: string | null }> }
  return (payload.items ?? [])
    .map((item) => (typeof item.id === 'string' ? item.id : null))
    .filter((id): id is string => Boolean(id))
}

export async function transferDraftAttachments(draftRecordId: string, claimId: string) {
  const attachmentIds = await fetchAttachmentIds(ATTACHMENTS_LIBRARY_ENTITY_ID, draftRecordId)
  if (!attachmentIds.length) return
  const response = await fetch('/api/attachments/transfer', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sourceEntityId: ATTACHMENTS_LIBRARY_ENTITY_ID,
      targetEntityId: WARRANTY_CLAIM_ENTITY_ID,
      attachmentIds,
      fromRecordId: draftRecordId,
      toRecordId: claimId,
    }),
  })
  if (!response.ok) throw new Error('Nie udalo sie przypiac zalacznikow do zgloszenia')
}
