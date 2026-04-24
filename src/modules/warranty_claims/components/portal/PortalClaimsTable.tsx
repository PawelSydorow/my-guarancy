"use client"

import Link from 'next/link'
import * as React from 'react'
import { useDeferredValue } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Notice } from '@open-mercato/ui/primitives/Notice'
import { EnumBadge } from '@open-mercato/ui/backend/ValueIcons'
import { PortalCard } from '@open-mercato/ui/portal/components/PortalCard'
import { PortalEmptyState } from '@open-mercato/ui/portal/components/PortalEmptyState'
import { PortalPageHeader } from '@open-mercato/ui/portal/components/PortalPageHeader'
import { WARRANTY_PRIORITY_SEGMENT_CLASSES, WARRANTY_STATUS_BADGE_MAP, WARRANTY_STATUS_SEGMENT_CLASSES } from '../../lib/statusStyles'
import type { PortalClaimRecord, PortalLookupBundle } from '../../lib/portal'

type Props = {
  orgSlug: string
}

type ClaimsResponse = {
  items: PortalClaimRecord[]
  total: number
  page: number
  limit: number
}

type SortField = 'reportedAt' | 'resolvedAt' | 'statusKey' | 'priorityKey' | 'claimNumber'

const DEFAULT_LIMIT = 20

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function PriorityBadge({
  label,
  priorityKey,
}: {
  label: string
  priorityKey: string
}) {
  return (
    <span className={[
      'inline-flex min-h-8 items-center rounded-none border px-2.5 py-1 text-xs font-medium',
      WARRANTY_PRIORITY_SEGMENT_CLASSES[priorityKey] ?? 'border-border bg-muted text-foreground',
    ].join(' ')}>
      {label}
    </span>
  )
}

function SegmentButton({
  active,
  children,
  className,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  className?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={[
        'rounded-none border px-3 py-2 text-xs font-semibold transition-colors',
        active ? (className ?? 'border-foreground bg-foreground text-background') : 'border-border bg-background text-muted-foreground hover:text-foreground',
      ].join(' ')}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function SortIndicator({ active, direction }: { active: boolean; direction?: 'asc' | 'desc' }) {
  if (!active) return <span className="text-muted-foreground">-</span>
  return <span className="text-primary">{direction === 'asc' ? 'ASC' : 'DESC'}</span>
}

export default function PortalClaimsTable({ orgSlug }: Props) {
  const [page, setPage] = React.useState(1)
  const [statusKey, setStatusKey] = React.useState<string>('')
  const [priorityKey, setPriorityKey] = React.useState<string>('')
  const [searchInput, setSearchInput] = React.useState('')
  const [sortBy, setSortBy] = React.useState<SortField>('reportedAt')
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc')

  const search = useDeferredValue(searchInput.trim())

  const lookupsQuery = useQuery<PortalLookupBundle>({
    queryKey: ['portal-warranty-claim-lookups', orgSlug],
    queryFn: async () => {
      const response = await fetch('/api/warranty_claims/portal/lookups', { credentials: 'include' })
      if (!response.ok) throw new Error('Nie udalo sie zaladowac slownikow.')
      return await response.json()
    },
  })

  const claimsQuery = useQuery<ClaimsResponse>({
    queryKey: ['portal-warranty-claims', orgSlug, page, statusKey, priorityKey, search, sortBy, sortDir],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(DEFAULT_LIMIT),
        sortBy,
        sortDir,
      })
      if (statusKey) params.set('statusKey', statusKey)
      if (priorityKey) params.set('priorityKey', priorityKey)
      if (search) params.set('search', search)

      const response = await fetch(`/api/warranty_claims/portal/claims?${params.toString()}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Nie udalo sie pobrac zgloszen.')
      return await response.json()
    },
  })

  const priorityLabels = React.useMemo(() => {
    return new Map((lookupsQuery.data?.priorities ?? []).map((item) => [item.id, item.label]))
  }, [lookupsQuery.data?.priorities])

  const totalPages = React.useMemo(() => {
    const total = claimsQuery.data?.total ?? 0
    return Math.max(1, Math.ceil(total / DEFAULT_LIMIT))
  }, [claimsQuery.data?.total])

  const toggleSort = React.useCallback((field: SortField) => {
    setPage(1)
    if (sortBy === field) {
      setSortDir((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortBy(field)
    setSortDir(field === 'claimNumber' ? 'asc' : 'desc')
  }, [sortBy])

  const hasItems = (claimsQuery.data?.items?.length ?? 0) > 0
  const isSortedBy = (field: SortField) => sortBy === field

  return (
    <div className="space-y-6">
      <PortalPageHeader
        label="Portal klienta"
        title="Zgloszenia gwarancyjne"
        description="Sprawdz status swoich zgloszen, filtrowanie i historie realizacji."
        action={(
          <Button asChild className="rounded-none">
            <Link href={`/${orgSlug}/portal/warranty-claims/create`}>Nowe zgloszenie</Link>
          </Button>
        )}
      />

      <PortalCard className="rounded-none border-border/70 p-0">
        <div className="border-b p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <Input
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value)
                setPage(1)
              }}
              placeholder="Szukaj po tytule, opisie lub numerze zgloszenia"
              className="rounded-none"
            />

            <div className="flex flex-wrap gap-2">
              <SegmentButton active={!statusKey} onClick={() => { setStatusKey(''); setPage(1) }}>Wszystkie statusy</SegmentButton>
              {(lookupsQuery.data?.statuses ?? []).map((item) => (
                <SegmentButton
                  key={item.id}
                  active={statusKey === item.id}
                  className={WARRANTY_STATUS_SEGMENT_CLASSES[item.id]}
                  onClick={() => {
                    setStatusKey((current) => current === item.id ? '' : item.id)
                    setPage(1)
                  }}
                >
                  {item.label}
                </SegmentButton>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <SegmentButton active={!priorityKey} onClick={() => { setPriorityKey(''); setPage(1) }}>Wszystkie priorytety</SegmentButton>
              {(lookupsQuery.data?.priorities ?? []).map((item) => (
                <SegmentButton
                  key={item.id}
                  active={priorityKey === item.id}
                  className={WARRANTY_PRIORITY_SEGMENT_CLASSES[item.id]}
                  onClick={() => {
                    setPriorityKey((current) => current === item.id ? '' : item.id)
                    setPage(1)
                  }}
                >
                  {item.label}
                </SegmentButton>
              ))}
            </div>
          </div>
        </div>

        {claimsQuery.isError ? (
          <div className="p-4 sm:p-5">
            <Notice variant="error">
              {claimsQuery.error instanceof Error ? claimsQuery.error.message : 'Nie udalo sie pobrac zgloszen.'}
            </Notice>
          </div>
        ) : null}

        {!claimsQuery.isError && !hasItems && !claimsQuery.isLoading ? (
          <div className="p-4 sm:p-5">
            <PortalEmptyState
              title="Brak zgloszen"
              description="Po utworzeniu pierwszego zgloszenia pojawi sie ono na tej liscie."
              action={(
                <Button asChild variant="outline" className="rounded-none">
                  <Link href={`/${orgSlug}/portal/warranty-claims/create`}>Dodaj pierwsze zgloszenie</Link>
                </Button>
              )}
            />
          </div>
        ) : null}

        {hasItems ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr className="border-b">
                    <th className="px-4 py-3 font-semibold sm:px-5">
                      <button type="button" className="inline-flex items-center gap-1 hover:opacity-80" onClick={() => toggleSort('claimNumber')}>
                        Nr zgloszenia
                        <SortIndicator active={isSortedBy('claimNumber')} direction={sortDir} />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold sm:px-5">Tytul</th>
                    <th className="px-4 py-3 font-semibold sm:px-5">
                      <button type="button" className="inline-flex items-center gap-1 hover:opacity-80" onClick={() => toggleSort('statusKey')}>
                        Status
                        <SortIndicator active={isSortedBy('statusKey')} direction={sortDir} />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold sm:px-5">
                      <button type="button" className="inline-flex items-center gap-1 hover:opacity-80" onClick={() => toggleSort('priorityKey')}>
                        Priorytet
                        <SortIndicator active={isSortedBy('priorityKey')} direction={sortDir} />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold sm:px-5">
                      <button type="button" className="inline-flex items-center gap-1 hover:opacity-80" onClick={() => toggleSort('reportedAt')}>
                        Data zgloszenia
                        <SortIndicator active={isSortedBy('reportedAt')} direction={sortDir} />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold sm:px-5">
                      <button type="button" className="inline-flex items-center gap-1 hover:opacity-80" onClick={() => toggleSort('resolvedAt')}>
                        Data rozwiazania
                        <SortIndicator active={isSortedBy('resolvedAt')} direction={sortDir} />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(claimsQuery.data?.items ?? []).map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-4 py-3 align-top sm:px-5">
                        <Link href={`/${orgSlug}/portal/warranty-claims/${item.id}`} className="font-semibold text-primary hover:underline">
                          {item.claimNumberFormatted}
                        </Link>
                      </td>
                      <td className="px-4 py-3 align-top sm:px-5">{item.title}</td>
                      <td className="px-4 py-3 align-top sm:px-5">
                        <EnumBadge value={item.statusKey} map={WARRANTY_STATUS_BADGE_MAP} fallback={item.statusKey} />
                      </td>
                      <td className="px-4 py-3 align-top sm:px-5">
                        <PriorityBadge label={priorityLabels.get(item.priorityKey) ?? item.priorityKey} priorityKey={item.priorityKey} />
                      </td>
                      <td className="px-4 py-3 align-top sm:px-5">{formatDate(item.reportedAt)}</td>
                      <td className="px-4 py-3 align-top sm:px-5">{formatDate(item.resolvedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-muted-foreground">
                {claimsQuery.isLoading ? 'Aktualizacja listy...' : `Liczba wynikow: ${claimsQuery.data?.total ?? 0}`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none"
                  disabled={page <= 1 || claimsQuery.isLoading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Poprzednia
                </Button>
                <span className="min-w-24 text-center text-muted-foreground">
                  Strona {page} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none"
                  disabled={page >= totalPages || claimsQuery.isLoading}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Nastepna
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </PortalCard>

      {lookupsQuery.isError ? (
        <Notice variant="error">
          {lookupsQuery.error instanceof Error ? lookupsQuery.error.message : 'Nie udalo sie zaladowac slownikow.'}
        </Notice>
      ) : null}

      {claimsQuery.isLoading && !hasItems ? (
        <PortalCard className="rounded-none border-dashed text-sm text-muted-foreground">
          Ladowanie zgloszen...
        </PortalCard>
      ) : null}
    </div>
  )
}
