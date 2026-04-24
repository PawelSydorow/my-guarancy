"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { useDeferredValue } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { DataTable } from '@open-mercato/ui/backend/DataTable'
import type { FilterDef, FilterValues } from '@open-mercato/ui/backend/FilterBar'
import { EnumBadge } from '@open-mercato/ui/backend/ValueIcons'
import { Button } from '@open-mercato/ui/primitives/button'
import { PortalPageHeader } from '@open-mercato/ui/portal/components/PortalPageHeader'
import { WARRANTY_PRIORITY_SEGMENT_CLASSES, WARRANTY_STATUS_BADGE_MAP } from '../../lib/statusStyles'
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

const DEFAULT_LIMIT = 20

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export default function PortalClaimsTable({ orgSlug }: Props) {
  const router = useRouter()
  const [page, setPage] = React.useState(1)
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'reportedAt', desc: true }])
  const [searchInput, setSearchInput] = React.useState('')
  const [filters, setFilters] = React.useState<FilterValues>({})
  const search = useDeferredValue(searchInput.trim())

  const lookupsQuery = useQuery<PortalLookupBundle>({
    queryKey: ['portal-warranty-claim-lookups', orgSlug],
    queryFn: async () => {
      const response = await fetch('/api/warranty_claims/portal/lookups', { credentials: 'include' })
      if (!response.ok) throw new Error('Nie udalo sie zaladowac slownikow.')
      return await response.json()
    },
  })

  const queryParams = React.useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(DEFAULT_LIMIT),
      sortBy: sorting[0]?.id || 'reportedAt',
      sortDir: sorting[0]?.desc ? 'desc' : 'asc',
    })

    if (search) params.set('search', search)

    if (typeof filters.statusKey === 'string' && filters.statusKey.trim()) params.set('statusKey', filters.statusKey.trim())
    if (typeof filters.priorityKey === 'string' && filters.priorityKey.trim()) params.set('priorityKey', filters.priorityKey.trim())
    return params.toString()
  }, [filters, page, search, sorting])

  const claimsQuery = useQuery<ClaimsResponse>({
    queryKey: ['portal-warranty-claims', orgSlug, queryParams],
    queryFn: async () => {
      const response = await fetch(`/api/warranty_claims/portal/claims?${queryParams}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Nie udalo sie pobrac zgloszen.')
      return await response.json()
    },
  })

  const totalPages = React.useMemo(() => {
    const total = claimsQuery.data?.total ?? 0
    return Math.max(1, Math.ceil(total / DEFAULT_LIMIT))
  }, [claimsQuery.data?.total])

  const priorityLabels = React.useMemo(() => {
    return new Map((lookupsQuery.data?.priorities ?? []).map((item) => [item.id, item.label]))
  }, [lookupsQuery.data?.priorities])

  const projectLabels = React.useMemo(() => {
    return new Map((lookupsQuery.data?.projects ?? []).map((item) => [item.id, item.label]))
  }, [lookupsQuery.data?.projects])

  const statusMap = React.useMemo(() => {
    return new Map((lookupsQuery.data?.statuses ?? []).map((item) => [item.id, item.label]))
  }, [lookupsQuery.data?.statuses])

  const priorityMap = React.useMemo(() => {
    return new Map((lookupsQuery.data?.priorities ?? []).map((item) => [item.id, item.label]))
  }, [lookupsQuery.data?.priorities])

  const filtersDef = React.useMemo<FilterDef[]>(() => [
    {
      id: 'statusKey',
      label: 'Status',
      type: 'combobox',
      options: (lookupsQuery.data?.statuses ?? []).map((item) => ({ value: item.id, label: item.label })),
      formatValue: (value: string) => statusMap.get(value) ?? value,
    },
    {
      id: 'priorityKey',
      label: 'Priorytet',
      type: 'combobox',
      options: (lookupsQuery.data?.priorities ?? []).map((item) => ({ value: item.id, label: item.label })),
      formatValue: (value: string) => priorityMap.get(value) ?? value,
    },
  ], [lookupsQuery.data?.priorities, lookupsQuery.data?.statuses, priorityMap, statusMap])

  const columns = React.useMemo<ColumnDef<PortalClaimRecord>[]>(() => [
    {
      accessorKey: 'claimNumberFormatted',
      header: 'Nr zgloszenia',
      meta: { priority: 1, maxWidth: '120px' },
      cell: ({ row }) => (
        <Link href={`/${orgSlug}/portal/warranty-claims/${row.original.id}`} className="font-semibold text-primary hover:underline">
          {row.original.claimNumberFormatted}
        </Link>
      ),
    },
    { accessorKey: 'title', header: 'Tytul', meta: { priority: 1, maxWidth: '420px' } },
    {
      accessorKey: 'statusKey',
      header: 'Status',
      meta: { priority: 1 },
      cell: ({ row }) => (
        <EnumBadge value={row.original.statusKey} map={WARRANTY_STATUS_BADGE_MAP} fallback={row.original.statusKey} />
      ),
    },
    {
      accessorKey: 'priorityKey',
      header: 'Priorytet',
      meta: { priority: 1 },
      cell: ({ row }) => (
        <span
          title={priorityLabels.get(row.original.priorityKey) ?? row.original.priorityKey}
          className={`inline-flex min-h-8 items-center rounded-none border px-2.5 py-1 text-xs font-medium ${
            WARRANTY_PRIORITY_SEGMENT_CLASSES[row.original.priorityKey] ?? 'border-border bg-muted text-foreground'
          }`}
        >
          {priorityLabels.get(row.original.priorityKey) ?? row.original.priorityKey}
        </span>
      ),
    },
    { accessorKey: 'reportedAt', header: 'Data zgloszenia', meta: { priority: 1 }, cell: ({ row }) => formatDate(row.original.reportedAt) },
    { accessorKey: 'resolvedAt', header: 'Data rozwiazania', meta: { priority: 2 }, cell: ({ row }) => formatDate(row.original.resolvedAt) },
    {
      accessorKey: 'projectId',
      header: 'Projekt',
      enableSorting: false,
      meta: { priority: 3, maxWidth: '320px' },
      cell: ({ row }) => projectLabels.get(row.original.projectId) ?? row.original.projectId,
    },
  ], [orgSlug, priorityLabels, projectLabels])

  const handleSortingChange = (next: SortingState) => {
    setSorting(next)
    setPage(1)
  }

  const handleFiltersApply = (nextValues: FilterValues) => {
    setFilters(nextValues)
    setPage(1)
  }

  const handleFiltersClear = () => {
    setFilters({})
    setPage(1)
  }

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

      <DataTable
        title="Zgloszenia"
        actions={(
          <Button asChild className="rounded-none">
            <Link href={`/${orgSlug}/portal/warranty-claims/create`}>Nowe zgloszenie</Link>
          </Button>
        )}
        columns={columns}
        data={claimsQuery.data?.items ?? []}
        searchValue={searchInput}
        onSearchChange={(value) => {
          setSearchInput(value)
          setPage(1)
        }}
        searchAlign="right"
        filters={filtersDef}
        filterValues={filters}
        onFiltersApply={handleFiltersApply}
        onFiltersClear={handleFiltersClear}
        entityId="portal:warranty-claim"
        sortable
        sorting={sorting}
        onSortingChange={handleSortingChange}
        pagination={{
          page,
          pageSize: DEFAULT_LIMIT,
          total: claimsQuery.data?.total ?? 0,
          totalPages: claimsQuery.data?.total ? totalPages : 0,
          onPageChange: setPage,
        }}
        isLoading={claimsQuery.isLoading || lookupsQuery.isLoading}
        onRowClick={(row) => {
          router.push(`/${orgSlug}/portal/warranty-claims/${row.id}`)
        }}
      />
    </div>
  )
}
