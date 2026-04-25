"use client"

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@open-mercato/ui/primitives/button'
import { Notice } from '@open-mercato/ui/primitives/Notice'
import { EnumBadge } from '@open-mercato/ui/backend/ValueIcons'
import { PortalCard, PortalCardDivider, PortalCardHeader, PortalStatRow } from '@open-mercato/ui/portal/components/PortalCard'
import { PortalPageHeader } from '@open-mercato/ui/portal/components/PortalPageHeader'
import { WARRANTY_PRIORITY_SEGMENT_CLASSES, WARRANTY_STATUS_BADGE_MAP } from '../../lib/statusStyles'
import type { PortalClaimRecord, PortalLookupBundle } from '../../lib/portal'

type Props = {
  orgSlug: string
  claimId: string
}

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

export default function PortalClaimDetail({ orgSlug, claimId }: Props) {
  const searchParams = useSearchParams()
  const claimQuery = useQuery<PortalClaimRecord>({
    queryKey: ['portal-warranty-claim', orgSlug, claimId],
    queryFn: async () => {
      const response = await fetch(`/api/warranty_claims/portal/claims/${claimId}`, { credentials: 'include' })
      if (response.status === 404) throw new Error('Nie znaleziono wskazanego zgloszenia.')
      if (!response.ok) throw new Error('Nie udalo sie pobrac szczegolow zgloszenia.')
      return await response.json()
    },
  })

  const lookupsQuery = useQuery<PortalLookupBundle>({
    queryKey: ['portal-warranty-claim-detail-lookups', orgSlug],
    queryFn: async () => {
      const response = await fetch('/api/warranty_claims/portal/lookups', { credentials: 'include' })
      if (!response.ok) throw new Error('Nie udalo sie zaladowac slownikow.')
      return await response.json()
    },
  })

  if (claimQuery.isLoading) {
    return (
      <PortalCard className="rounded-none border-dashed text-sm text-muted-foreground">
        Ladowanie szczegolow zgloszenia...
      </PortalCard>
    )
  }

  if (claimQuery.isError || !claimQuery.data) {
    return (
      <Notice variant="error">
        {claimQuery.error instanceof Error ? claimQuery.error.message : 'Nie udalo sie pobrac szczegolow zgloszenia.'}
      </Notice>
    )
  }

  const claim = claimQuery.data
  const lookups = lookupsQuery.data
  const projectLabel = lookups?.projects.find((item) => item.id === claim.projectId)?.label ?? claim.projectId
  const priorityLabel = lookups?.priorities.find((item) => item.id === claim.priorityKey)?.label ?? claim.priorityKey
  const lookupsLoading = lookupsQuery.isLoading && !lookupsQuery.data
  const showAttachmentWarning = searchParams.get('attachments') === 'partial'

  return (
    <div className="space-y-6">
      {showAttachmentWarning ? (
        <Notice variant="error">
          Zgloszenie zostalo zapisane, ale zalaczniki nie zostaly przypiete.
        </Notice>
      ) : null}
      <PortalPageHeader
        label="Portal klienta"
        title={claim.title}
        description={`Zgloszenie ${claim.claimNumberFormatted}`}
        action={(
          <Button asChild variant="outline" className="rounded-none">
            <Link href={`/${orgSlug}/portal/warranty-claims`}>Powrot do listy</Link>
          </Button>
        )}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
        <PortalCard className="rounded-none border-border/70">
          <PortalCardHeader
            label="Opis"
            title="Szczegoly problemu"
            description="Pola widoczne dla klienta w portalu."
          />

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Opis usterki</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{claim.issueDescription}</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Lokalizacja</p>
                <p className="text-sm text-foreground">{claim.locationText || '-'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Projekt</p>
                <p className="text-sm text-foreground">{lookupsLoading ? 'Ladowanie...' : projectLabel}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Utworzono</p>
                <p className="text-sm text-foreground">{formatDate(claim.createdAt, true)}</p>
              </div>
            </div>
          </div>
        </PortalCard>

        <PortalCard className="rounded-none border-border/70">
          <PortalCardHeader
            label="Status"
            title="Metadane zgloszenia"
            description="Najwazniejsze informacje o obsludze zgloszenia."
          />

          <PortalStatRow
            label="Numer"
            value={<span className="font-semibold text-primary">{claim.claimNumberFormatted}</span>}
          />
          <PortalCardDivider />
          <PortalStatRow
            label="Status"
            value={<EnumBadge value={claim.statusKey} map={WARRANTY_STATUS_BADGE_MAP} fallback={claim.statusKey} />}
          />
          <PortalCardDivider />
          <PortalStatRow
            label="Priorytet"
            value={(
              <span className={[
                'inline-flex min-h-8 items-center rounded-none border px-2.5 py-1 text-xs font-medium',
                WARRANTY_PRIORITY_SEGMENT_CLASSES[claim.priorityKey] ?? 'border-border bg-muted text-foreground',
              ].join(' ')}>
                {lookupsLoading ? 'Ladowanie...' : priorityLabel}
              </span>
            )}
          />
          <PortalCardDivider />
          <PortalStatRow label="Data zgloszenia" value={formatDate(claim.reportedAt, true)} />
          <PortalCardDivider />
          <PortalStatRow label="Data rozwiazania" value={formatDate(claim.resolvedAt, true)} />
        </PortalCard>
      </div>
    </div>
  )
}
