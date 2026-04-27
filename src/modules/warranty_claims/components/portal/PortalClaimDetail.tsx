"use client"

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@open-mercato/ui/primitives/button'
import { Notice } from '@open-mercato/ui/primitives/Notice'
import { EnumBadge } from '@open-mercato/ui/backend/ValueIcons'
import { PortalCard, PortalCardDivider, PortalCardHeader, PortalStatRow } from '@open-mercato/ui/portal/components/PortalCard'
import { PortalPageHeader } from '@open-mercato/ui/portal/components/PortalPageHeader'
import { ArrowLeft, XCircle } from 'lucide-react'
import { WARRANTY_STATUS_BADGE_MAP } from '../../lib/statusStyles'
import { WARRANTY_STATUS_KEYS } from '../../lib/constants'
import type { PortalClaimRecord, PortalLookupBundle } from '../../lib/portal'

type Props = {
  orgSlug: string
  claimId: string
}

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

export default function PortalClaimDetail({ orgSlug, claimId }: Props) {
  const searchParams = useSearchParams()

  const claimQuery = useQuery<PortalClaimRecord>({
    queryKey: ['portal-warranty-claim', orgSlug, claimId],
    queryFn: async () => {
      const response = await fetch(`/api/warranty_claims/portal/claims/${claimId}`, { credentials: 'include' })
      if (response.status === 404) throw new Error('Nie znaleziono wskazanego zgłoszenia.')
      if (!response.ok) throw new Error('Nie udało się pobrać szczegółów zgłoszenia.')
      return await response.json()
    },
  })

  const lookupsQuery = useQuery<PortalLookupBundle>({
    queryKey: ['portal-warranty-claim-detail-lookups', orgSlug],
    queryFn: async () => {
      const response = await fetch('/api/warranty_claims/portal/lookups', { credentials: 'include' })
      if (!response.ok) throw new Error('Nie udało się załadować słowników.')
      return await response.json()
    },
  })

  if (claimQuery.isLoading) {
    return (
      <PortalCard className="border-dashed text-sm text-muted-foreground">
        Ładowanie szczegółów zgłoszenia…
      </PortalCard>
    )
  }

  if (claimQuery.isError || !claimQuery.data) {
    return (
      <Notice variant="error">
        {claimQuery.error instanceof Error ? claimQuery.error.message : 'Nie udało się pobrać szczegółów zgłoszenia.'}
      </Notice>
    )
  }

  const claim = claimQuery.data
  const lookups = lookupsQuery.data
  const projectLabel = lookups?.projects.find((item) => item.id === claim.projectId)?.label ?? claim.projectId
  const priorityLabel = lookups?.priorities.find((item) => item.id === claim.priorityKey)?.label ?? claim.priorityKey
  const lookupsLoading = lookupsQuery.isLoading && !lookupsQuery.data
  const showAttachmentWarning = searchParams.get('attachments') === 'partial'
  const isRejected = claim.statusKey === WARRANTY_STATUS_KEYS.rejected

  return (
    <div className="space-y-6">
      {showAttachmentWarning ? (
        <Notice variant="error">
          Zgłoszenie zostało zapisane, ale załączniki nie zostały przypięte.
        </Notice>
      ) : null}

      <PortalPageHeader
        label="Portal klienta"
        title={claim.title}
        description={`Zgłoszenie ${claim.claimNumberFormatted}`}
        action={(
          <Button asChild variant="outline" size="sm">
            <Link href={`/${orgSlug}/portal/warranty-claims`}>
              <ArrowLeft className="mr-1.5 size-3.5" />
              Powrót do listy
            </Link>
          </Button>
        )}
      />

      {/* Status bar */}
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3.5">
        <EnumBadge value={claim.statusKey} map={WARRANTY_STATUS_BADGE_MAP} fallback={claim.statusKey} />
        <span className="text-sm text-muted-foreground">
          {claim.resolvedAt
            ? `Zakończone ${formatDate(claim.resolvedAt)}`
            : 'Zgłoszenie jest w trakcie obsługi'}
        </span>
      </div>

      {isRejected && claim.rejectionReason ? (
        <div className="flex gap-3 rounded-xl border border-status-error-border bg-status-error-bg p-5 text-status-error-text">
          <XCircle className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">Zgłoszenie odrzucone</p>
            <p className="text-sm opacity-90">Powód: {claim.rejectionReason}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.9fr)]">
        {/* Main */}
        <PortalCard>
          <PortalCardHeader label="Opis" title="Szczegóły problemu" />

          <div className="space-y-5">
            <FieldBlock label="Opis usterki">
              <p className="whitespace-pre-wrap leading-6">{claim.issueDescription}</p>
            </FieldBlock>

            <div className="h-px bg-border/60" />

            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <FieldBlock label="Lokalizacja">
                <span className="font-medium">{claim.locationText || '—'}</span>
              </FieldBlock>
              <FieldBlock label="Projekt">
                <span className="font-medium">{lookupsLoading ? 'Ładowanie…' : projectLabel}</span>
              </FieldBlock>
              <FieldBlock label="Priorytet">
                <span className="font-medium">{lookupsLoading ? 'Ładowanie…' : priorityLabel}</span>
              </FieldBlock>
              <FieldBlock label="Data zgłoszenia">
                <span className="font-medium">{formatDate(claim.reportedAt)}</span>
              </FieldBlock>
            </div>
          </div>
        </PortalCard>

        {/* Sidebar */}
        <PortalCard>
          <PortalCardHeader label="Status" title="Metadane zgłoszenia" />

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
            value={<span className="font-medium">{lookupsLoading ? 'Ładowanie…' : priorityLabel}</span>}
          />
          <PortalCardDivider />
          <PortalStatRow label="Data zgłoszenia" value={formatDate(claim.reportedAt)} />
          <PortalCardDivider />
          <PortalStatRow label="Data rozwiązania" value={formatDate(claim.resolvedAt, true)} />
          <PortalCardDivider />
          <PortalStatRow label="Projekt" value={lookupsLoading ? '…' : projectLabel} />

        </PortalCard>
      </div>
    </div>
  )
}
