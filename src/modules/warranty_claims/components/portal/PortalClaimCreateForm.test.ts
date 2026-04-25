import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import PortalClaimCreateForm from './PortalClaimCreateForm'

const attachmentsSectionMock = jest.fn(
  ({ entityId, recordId, compact, className }: { entityId: string; recordId: string | null; compact?: boolean; className?: string }) =>
    React.createElement(
      'div',
      { 'data-testid': 'attachments-section', 'data-classname': className ?? '' },
      `${entityId}:${recordId ?? 'missing-record'}:${compact ? 'compact' : 'normal'}`,
    ),
)

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: {
      categories: [
        { id: 'facade', label: 'Fasada' },
      ],
      priorities: [
        { id: 'sredni', label: 'Sredni' },
        { id: 'wysoki', label: 'Wysoki' },
      ],
    },
    isLoading: false,
    isError: false,
  }),
}))

jest.mock('@open-mercato/ui/backend/detail', () => ({
  AttachmentsSection: (props: { entityId: string; recordId: string | null; showHeader?: boolean; compact?: boolean; className?: string }) => attachmentsSectionMock(props),
}))

describe('PortalClaimCreateForm', () => {
  beforeEach(() => {
    attachmentsSectionMock.mockClear()
  })

  it('renders the backend-aligned create layout', () => {
    const markup = renderToStaticMarkup(React.createElement(PortalClaimCreateForm, { orgSlug: 'bremer' }))

    expect(markup).toContain('Nowe zgłoszenie gwarancyjne')
    expect(markup).toContain('Dane podstawowe')
    expect(markup).toContain('Opis i załączniki')
    expect(markup).toContain('Tytuł')
    expect(markup).toContain('Kategoria')
    expect(attachmentsSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: 'attachments:library',
        recordId: expect.stringContaining('warranty-claim-create:'),
        compact: true,
      }),
    )
  })
})
