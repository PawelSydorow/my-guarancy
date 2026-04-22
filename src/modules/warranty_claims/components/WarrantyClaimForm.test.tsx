import * as React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import WarrantyClaimForm from './WarrantyClaimForm'

const fetchCrudListMock = jest.fn()
const attachmentsSectionMock = jest.fn(({ recordId }: { recordId: string | null }) => (
  <div data-testid="attachments-section">{recordId ?? 'save-first'}</div>
))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))

jest.mock('@open-mercato/ui/backend/Page', () => ({
  Page: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@open-mercato/ui/backend/detail', () => ({
  AttachmentsSection: (props: { entityId: string; recordId: string | null; showHeader?: boolean }) => attachmentsSectionMock(props),
}))

jest.mock('@open-mercato/ui/backend/inputs', () => ({
  ComboboxInput: () => null,
}))

jest.mock('@open-mercato/ui/backend/utils/flash', () => ({
  pushWithFlash: jest.fn(),
}))

jest.mock('@open-mercato/ui/backend/utils/crud', () => ({
  createCrud: jest.fn(),
  fetchCrudList: (...args: unknown[]) => fetchCrudListMock(...args),
  updateCrud: jest.fn(),
  deleteCrud: jest.fn(),
}))

jest.mock('@open-mercato/ui/backend/CrudForm', () => ({
  CrudForm: (props: {
    title: string
    groups?: Array<{ id: string; title?: string; component?: (props: { values?: Record<string, unknown> }) => React.ReactNode }>
    initialValues?: Record<string, unknown>
  }) => (
    <div data-testid="crud-form">
      <div>{props.title}</div>
      {(props.groups ?? []).map((group) => (
        <section key={group.id}>
          {group.title ? <h2>{group.title}</h2> : null}
          {group.component ? group.component({ values: props.initialValues ?? {} }) : null}
        </section>
      ))}
    </div>
  ),
}))

function mockJsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  } as Response
}

describe('WarrantyClaimForm attachments', () => {
  beforeEach(() => {
    attachmentsSectionMock.mockClear()
    fetchCrudListMock.mockReset()

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
      return mockJsonResponse({})
    }) as jest.Mock
  })

  it('shows save-first attachments state on create', async () => {
    render(<WarrantyClaimForm mode="create" />)

    await waitFor(() => {
      expect(screen.queryByText('Zalaczniki')).not.toBeNull()
      expect(screen.getByTestId('attachments-section').textContent).toContain('save-first')
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
      expect(screen.getByTestId('attachments-section').textContent).toContain('claim-1')
    })
  })
})
