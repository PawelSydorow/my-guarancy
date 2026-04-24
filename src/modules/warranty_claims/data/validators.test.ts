import { warrantyClaimCreateSchema, warrantyClaimListSchema, warrantyClaimUpdateSchema } from './validators'

const baseValidClaim = {
  title: 'Naprawa elewacji',
  issue_description: 'Opis problemu',
  location_text: 'Budynek A',
  project_id: '11111111-1111-4111-8111-111111111111',
  priority_key: 'sredni',
  category_key: 'elewacja',
  bas_number: 'BAS-001',
  status_key: 'oczekuje',
  reported_at: '2026-04-21T10:00:00.000Z',
  assigned_user_id: '22222222-2222-4222-8222-222222222222',
  resolved_at: null,
  subcontractor_id: null,
}

describe('warranty claim validators', () => {
  it('requires assigned user on create with a readable message', () => {
    const result = warrantyClaimCreateSchema.safeParse({
      ...baseValidClaim,
      assigned_user_id: undefined,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.assigned_user_id?.[0]).toBe('Wybierz osobę przypisaną')
    }
  })

  it('allows missing assigned user on update', () => {
    const result = warrantyClaimUpdateSchema.safeParse({
      ...baseValidClaim,
      id: '33333333-3333-4333-8333-333333333333',
      assigned_user_id: undefined,
    })

    expect(result.success).toBe(true)
  })

  it('uses friendly required messages instead of zod defaults', () => {
    const result = warrantyClaimCreateSchema.safeParse({
      ...baseValidClaim,
      title: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title?.[0]).toBe('To pole jest wymagane')
    }
  })

  it('accepts claim number search text as a string', () => {
    const result = warrantyClaimListSchema.safeParse({
      claim_number: '007',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.claim_number).toBe('007')
    }
  })
})
