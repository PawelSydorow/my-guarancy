import * as React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import WarrantyClaimForm from './WarrantyClaimForm'

const fetchCrudListMock = jest.fn()
const createCrudMock = jest.fn()
const updateCrudMock = jest.fn()
let lastCrudFormProps: {
  schema?: { safeParse: (input: unknown) => { success: boolean } }
} | null = null
const comboboxInputMock = jest.fn((props: { placeholder?: string; disabled?: boolean }) => (
  <div data-testid={`combobox-${props.placeholder ?? 'unknown'}`} data-disabled={props.disabled ? 'true' : 'false'} />
))
const attachmentsSectionMock = jest.fn(
  ({ entityId, recordId, compact, className }: { entityId: string; recordId: string | null; compact?: boolean; className?: string }) => (
    <div data-testid="attachments-section" data-classname={className ?? ''}>{`${entityId}:${recordId ?? 'missing-record'}:${compact ? 'compact' : 'normal'}`}</div>
  ),
)

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))

jest.mock('@open-mercato/ui/backend/Page', () => ({
  Page: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@open-mercato/ui/backend/detail', () => ({
  AttachmentsSection: (props: { entityId: string; recordId: string | null; showHeader?: boolean; compact?: boolean }) => attachmentsSectionMock(props),
}))

jest.mock('@open-mercato/ui/backend/inputs', () => ({
  ComboboxInput: (props: { placeholder?: string; disabled?: boolean }) => comboboxInputMock(props),
}))

jest.mock('@open-mercato/ui/backend/utils/flash', () => ({
  pushWithFlash: jest.fn(),
}))

jest.mock('@open-mercato/ui/backend/utils/crud', () => ({
  createCrud: (...args: unknown[]) => createCrudMock(...args),
  fetchCrudList: (...args: unknown[]) => fetchCrudListMock(...args),
  updateCrud: (...args: unknown[]) => updateCrudMock(...args),
  deleteCrud: jest.fn(),
}))

jest.mock('@open-mercato/ui/backend/CrudForm', () => ({
  CrudForm: (props: {
    title: string
    schema?: { safeParse: (input: unknown) => { success: boolean } }
    fields?: Array<{ id: string; label?: string; type?: string; component?: (props: {
      value?: unknown
      values?: Record<string, unknown>
      setValue?: (value: unknown) => void
      setFormValue?: (key: string, value: unknown) => void
      disabled?: boolean
    }) => React.ReactNode }>
    groups?: Array<{ id: string; title?: string; component?: (props: { values?: Record<string, unknown> }) => React.ReactNode }>
    initialValues?: Record<string, unknown>
    onSubmit?: (values: Record<string, unknown>) => Promise<void>
  }) => {
    lastCrudFormProps = props
    return (
      <div data-testid="crud-form">
      <div>{props.title}</div>
      {(props.fields ?? []).map((field) => (
        <div key={field.id} data-testid={`field-${field.id}`}>
          {field.label ? <span>{field.label}</span> : null}
          {field.type === 'custom' && field.component
            ? field.component({
              value: props.initialValues?.[field.id],
              values: props.initialValues ?? {},
              setValue: jest.fn(),
              setFormValue: jest.fn(),
              disabled: false,
            })
            : null}
        </div>
      ))}
      {(props.groups ?? []).map((group) => (
        <section key={group.id}>
          {group.title ? <h2>{group.title}</h2> : null}
          {group.component ? group.component({ values: props.initialValues ?? {} }) : null}
        </section>
      ))}
      <button
        type="button"
        onClick={() => {
          void props.onSubmit?.((props.initialValues ?? {}) as Record<string, unknown>)
        }}
      >
        submit
      </button>
      </div>
    )
  },
}))

function mockJsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  } as Response
}

describe('WarrantyClaimForm attachments', () => {
  beforeEach(() => {
    lastCrudFormProps = null
    attachmentsSectionMock.mockClear()
    fetchCrudListMock.mockReset()
    createCrudMock.mockReset()
    updateCrudMock.mockReset()
    comboboxInputMock.mockClear()

    global.fetch = jest.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.startsWith('/api/warranty_claims/lookups')) {
        return mockJsonResponse({
          projects: [],
          users: [],
          statuses: [],
          priorities: [],
          categories: [],
          subcontractors: [],
        })
      }
      if (url.startsWith('/api/warranty_claims/subcontractors')) {
        return mockJsonResponse({ items: [] })
      }
      if (url.startsWith('/api/attachments?')) {
        return mockJsonResponse({ items: [] })
      }
      if (url === '/api/attachments/transfer') {
        return mockJsonResponse({ ok: true, updated: 0 })
      }
      return mockJsonResponse({})
    }) as jest.Mock
  })

  it('uses temporary attachments library on create', async () => {
    render(<WarrantyClaimForm mode="create" />)

    await waitFor(() => {
      expect(screen.queryByText('Zalaczniki')).not.toBeNull()
      expect(screen.getByDisplayValue('Nadany automatycznie po zapisie')).not.toBeNull()
      expect(screen.getByTestId('attachments-section').textContent).toContain('attachments:library:warranty-claim-create::compact')
      expect(screen.getByTestId('attachments-section').getAttribute('data-classname')).toContain('object-cover')
    })
  })

  it('passes claim id to attachments section on edit', async () => {
    fetchCrudListMock.mockResolvedValue({
      items: [
        {
          id: 'claim-1',
          organization_id: 'org-1',
          tenant_id: 'tenant-1',
          is_active: true,
          project_id: 'project-1',
          claim_number: 7,
          claim_number_formatted: '007',
          title: 'Claim title',
          issue_description: 'Issue description',
          location_text: 'Location',
          priority_key: 'high',
          category_key: 'facade',
          bas_number: 'BAS-1',
          status_key: 'open',
          reported_at: '2026-04-21T10:00:00.000Z',
          assigned_user_id: null,
          resolved_at: null,
          subcontractor_id: null,
          subcontractor_name: null,
          subcontractor_address: null,
          subcontractor_email: null,
          subcontractor_phone: null,
          subcontractor_contact_person: null,
          created_at: '2026-04-21T10:00:00.000Z',
          updated_at: '2026-04-21T10:00:00.000Z',
        },
      ],
    })

    render(<WarrantyClaimForm mode="edit" claimId="claim-1" />)

    await waitFor(() => {
      expect(screen.queryByText('Zalaczniki')).not.toBeNull()
      expect(screen.getByDisplayValue('007')).not.toBeNull()
      expect(screen.getByTestId('attachments-section').textContent).toContain('warranty_claims:claim:claim-1:compact')
      expect(screen.getByTestId('attachments-section').getAttribute('data-classname')).toContain('object-cover')
      expect(screen.getByTestId('combobox-Wybierz projekt').getAttribute('data-disabled')).toBe('true')
      expect(document.querySelector('[aria-hidden="true"]')).not.toBeNull()
    })
  })

  it('accepts read-only claim number in edit form schema validation', async () => {
    fetchCrudListMock.mockResolvedValue({
      items: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          organization_id: 'org-1',
          tenant_id: 'tenant-1',
          is_active: true,
          project_id: '11111111-1111-4111-8111-111111111111',
          claim_number: 7,
          claim_number_formatted: '007',
          title: 'Claim title',
          issue_description: 'Issue description',
          location_text: 'Location',
          priority_key: 'high',
          category_key: 'facade',
          bas_number: 'BAS-1',
          status_key: 'open',
          reported_at: '2026-04-21T10:00:00.000Z',
          assigned_user_id: '22222222-2222-4222-8222-222222222222',
          resolved_at: null,
          subcontractor_id: null,
          subcontractor_name: null,
          subcontractor_address: null,
          subcontractor_email: null,
          subcontractor_phone: null,
          subcontractor_contact_person: null,
          created_at: '2026-04-21T10:00:00.000Z',
          updated_at: '2026-04-21T10:00:00.000Z',
        },
      ],
    })

    render(<WarrantyClaimForm mode="edit" claimId="33333333-3333-4333-8333-333333333333" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('007')).not.toBeNull()
    })

    expect(lastCrudFormProps?.schema?.safeParse({
      id: '33333333-3333-4333-8333-333333333333',
      claim_number: '007',
      project_id: '11111111-1111-4111-8111-111111111111',
      title: 'Claim title',
      issue_description: 'Issue description',
      location_text: 'Location',
      priority_key: 'high',
      category_key: 'facade',
      bas_number: 'BAS-1',
      status_key: 'open',
      reported_at: '2026-04-21T10:00:00.000Z',
      assigned_user_id: '22222222-2222-4222-8222-222222222222',
      resolved_at: null,
      subcontractor_id: null,
    }).success).toBe(true)
  })

  it('transfers temporary attachments after create', async () => {
    createCrudMock.mockResolvedValue({
      result: { id: 'claim-1' },
    })

    global.fetch = jest.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.startsWith('/api/warranty_claims/lookups')) {
        return mockJsonResponse({
          projects: [],
          users: [],
          statuses: [],
          priorities: [],
          categories: [],
          subcontractors: [],
        })
      }
      if (url.startsWith('/api/attachments?')) {
        return mockJsonResponse({
          items: [{ id: '11111111-1111-4111-8111-111111111111' }],
        })
      }
      if (url === '/api/attachments/transfer') {
        expect(init?.method).toBe('POST')
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          sourceEntityId?: string
          targetEntityId?: string
          fromRecordId?: string
          toRecordId?: string
          attachmentIds?: string[]
        }
        expect(body.sourceEntityId).toBe('attachments:library')
        expect(body.targetEntityId).toBe('warranty_claims:claim')
        expect(body.toRecordId).toBe('claim-1')
        expect(body.attachmentIds).toEqual(['11111111-1111-4111-8111-111111111111'])
        expect(body.fromRecordId).toContain('warranty-claim-create:')
        return mockJsonResponse({ ok: true, updated: 1 })
      }
      if (url.startsWith('/api/warranty_claims/subcontractors')) {
        return mockJsonResponse({ items: [] })
      }
      return mockJsonResponse({})
    }) as jest.Mock

    render(<WarrantyClaimForm mode="create" />)

    await waitFor(() => {
      expect(screen.queryByText('Zalaczniki')).not.toBeNull()
    })

    screen.getByRole('button', { name: 'submit' }).click()

    await waitFor(() => {
      expect(createCrudMock).toHaveBeenCalled()
      const submittedPayload = createCrudMock.mock.calls[0]?.[1] as Record<string, unknown>
      expect(submittedPayload.claim_number).toBeUndefined()
      expect(submittedPayload.status_key).toBe('oczekuje')
      expect(submittedPayload.priority_key).toBe('sredni')
      expect(submittedPayload.assigned_user_id).toBeNull()
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/attachments?entityId=attachments%3Alibrary&recordId=warranty-claim-create%3A'),
        expect.objectContaining({ credentials: 'include' }),
      )
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/attachments/transfer',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      )
    })
  })
})
