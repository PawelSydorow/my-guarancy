"use client"
import * as React from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { DataTable } from '@open-mercato/ui/backend/DataTable'
import { RowActions } from '@open-mercato/ui/backend/RowActions'
import type { FilterDef, FilterValues } from '@open-mercato/ui/backend/FilterBar'
import { EnumBadge } from '@open-mercato/ui/backend/ValueIcons'
import { Button } from '@open-mercato/ui/primitives/button'
import { deleteCrud, fetchCrudList } from '@open-mercato/ui/backend/utils/crud'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { useConfirmDialog } from '@open-mercato/ui/backend/confirm-dialog'
import { useRouter } from 'next/navigation'
import type { LookupBundle, WarrantyClaimApiRecord, WarrantyClaimRecord } from '../types'
import { normalizeWarrantyClaimRecord } from '../types'
import { WARRANTY_PRIORITY_SEGMENT_CLASSES, WARRANTY_STATUS_BADGE_MAP } from '../lib/statusStyles'

type ClaimsResponse = {
  items: WarrantyClaimRecord[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function WarrantyClaimsTable() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const [page, setPage] = React.useState(1)
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'updated_at', desc: true }])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filters, setFilters] = React.useState<FilterValues>({})

  const lookupsQuery = useQuery<LookupBundle>({
    queryKey: ['warranty-claim-lookups'],
    queryFn: async () => {
      const response = await fetch('/api/warranty_claims/lookups', { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to load lookups')
      return await response.json()
    },
  })

  const queryParams = React.useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '50',
      sortField: sorting[0]?.id || 'updated_at',
      sortDir: sorting[0]?.desc ? 'desc' : 'asc',
    })
    if (searchQuery.trim()) params.set('search', searchQuery.trim())

    const addIfValue = (key: string, value: unknown) => {
      if (typeof value === 'string' && value.trim()) params.set(key, value.trim())
    }

    addIfValue('status_key', filters.status_key)
    addIfValue('priority_key', filters.priority_key)
    addIfValue('category_key', filters.category_key)
    addIfValue('claim_number', filters.claim_number)
    addIfValue('project_id', filters.project_id)
    addIfValue('assigned_user_id', filters.assigned_user_id)
    addIfValue('subcontractor_id', filters.subcontractor_id)
    addIfValue('bas_number', filters.bas_number)

    if (filters.reported_at && typeof filters.reported_at === 'object') {
      const range = filters.reported_at as { from?: string; to?: string }
      if (range.from) params.set('reported_from', range.from)
      if (range.to) params.set('reported_to', range.to)
    }

    return Object.fromEntries(params.entries())
  }, [filters, page, searchQuery, sorting])

  const claimsQuery = useQuery<ClaimsResponse>({
    queryKey: ['warranty-claims', queryParams],
    queryFn: async () => {
      const response = await fetchCrudList<WarrantyClaimApiRecord>('warranty_claims/claims', queryParams)
      return {
        ...response,
        items: (response.items ?? []).map((item) => normalizeWarrantyClaimRecord(item)),
      }
    },
  })

  const projectMap = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const project of lookupsQuery.data?.projects ?? []) map.set(project.id, project.label)
    return map
  }, [lookupsQuery.data?.projects])

  const userMap = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const user of lookupsQuery.data?.users ?? []) map.set(user.id, user.label)
    return map
  }, [lookupsQuery.data?.users])

  const statusMap = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const item of lookupsQuery.data?.statuses ?? []) map.set(item.id, item.label)
    return map
  }, [lookupsQuery.data?.statuses])

  const priorityMap = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const item of lookupsQuery.data?.priorities ?? []) map.set(item.id, item.label)
    return map
  }, [lookupsQuery.data?.priorities])

  const categoryMap = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const item of lookupsQuery.data?.categories ?? []) map.set(item.id, item.label)
    return map
  }, [lookupsQuery.data?.categories])

  const priorityBadgeMap = React.useMemo(() => {
    const map: Record<string, { label: string; className?: string }> = {}
    for (const item of lookupsQuery.data?.priorities ?? []) {
      map[item.id] = {
        label: item.label,
        className: WARRANTY_PRIORITY_SEGMENT_CLASSES[item.id],
      }
    }
    return map
  }, [lookupsQuery.data?.priorities])

  const filtersDef = React.useMemo<FilterDef[]>(() => [
    {
      id: 'claim_number',
      label: 'Numer zgloszenia',
      type: 'text',
    },
    {
      id: 'status_key',
      label: 'Status',
      type: 'combobox',
      options: (lookupsQuery.data?.statuses ?? []).map((item) => ({ value: item.id, label: item.label })),
      formatValue: (value: string) => statusMap.get(value) ?? value,
    },
    {
      id: 'priority_key',
      label: 'Pilnosc',
      type: 'combobox',
      options: (lookupsQuery.data?.priorities ?? []).map((item) => ({ value: item.id, label: item.label })),
      formatValue: (value: string) => priorityMap.get(value) ?? value,
    },
    {
      id: 'category_key',
      label: 'Kategoria',
      type: 'combobox',
      options: (lookupsQuery.data?.categories ?? []).map((item) => ({ value: item.id, label: item.label })),
      formatValue: (value: string) => categoryMap.get(value) ?? value,
    },
    {
      id: 'project_id',
      label: 'Projekt',
      type: 'combobox',
      options: (lookupsQuery.data?.projects ?? []).map((item) => ({ value: item.id, label: item.label, description: item.description ?? null })),
      formatValue: (value: string) => projectMap.get(value) ?? value,
    },
    {
      id: 'assigned_user_id',
      label: 'Przypisany',
      type: 'combobox',
      options: (lookupsQuery.data?.users ?? []).map((item) => ({ value: item.id, label: item.label, description: item.description ?? null })),
      formatValue: (value: string) => userMap.get(value) ?? value,
    },
    {
      id: 'subcontractor_id',
      label: 'Podwykonawca',
      type: 'combobox',
      options: (lookupsQuery.data?.subcontractors ?? []).map((item) => ({ value: item.id, label: item.label, description: item.description ?? null })),
      formatValue: (value: string) => (lookupsQuery.data?.subcontractors ?? []).find((item) => item.id === value)?.label ?? value,
    },
    { id: 'bas_number', label: 'BAS', type: 'text' },
    { id: 'reported_at', label: 'Data zgloszenia', type: 'dateRange' },
  ], [
    categoryMap,
    lookupsQuery.data?.categories,
    lookupsQuery.data?.priorities,
    lookupsQuery.data?.projects,
    lookupsQuery.data?.statuses,
    lookupsQuery.data?.subcontractors,
    lookupsQuery.data?.users,
    priorityMap,
    projectMap,
    statusMap,
    userMap,
  ])

  const columns = React.useMemo<ColumnDef<WarrantyClaimRecord>[]>(() => [
    {
      accessorKey: 'claim_number',
      header: 'Nr. zgloszenia',
      meta: { priority: 1, maxWidth: '80px' },
      cell: ({ row }) => row.original.claim_number_formatted,
    },
    {
      accessorKey: 'project_id',
      header: 'Projekt',
      meta: { priority: 1, maxWidth: '420px' },
      cell: ({ row }) => projectMap.get(row.original.project_id) ?? row.original.project_id,
    },
    { accessorKey: 'title', header: 'Tytul', meta: { priority: 1, maxWidth: '520px' } },
    {
      accessorKey: 'category_key',
      header: 'Kategoria',
      meta: { priority: 1 },
      cell: ({ row }) => (
        <span className="inline-flex min-h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
          {(row.original.category_key ? categoryMap.get(row.original.category_key) : null) ?? row.original.category_key ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status_key',
      header: 'Status',
      meta: { priority: 1 },
      cell: ({ row }) => (
        <EnumBadge
          value={row.original.status_key}
          map={WARRANTY_STATUS_BADGE_MAP}
          fallback="—"
        />
      ),
    },
    {
      accessorKey: 'priority_key',
      header: 'Priorytet',
      meta: { priority: 1 },
      cell: ({ row }) => (
        <span
          title={priorityBadgeMap[row.original.priority_key]?.label ?? row.original.priority_key}
          className={`inline-flex h-8 min-w-8 items-center justify-center rounded-none border px-2 text-xs font-medium leading-none ${
            priorityBadgeMap[row.original.priority_key]?.className ?? 'border-border bg-muted text-foreground'
          }`}
        >
          {priorityBadgeMap[row.original.priority_key]?.label ?? row.original.priority_key}
        </span>
      ),
    },
    { accessorKey: 'reported_at', header: 'Data zgloszenia', meta: { priority: 1 } },
  ], [categoryMap, priorityBadgeMap, projectMap])

  return (
    <>
      <DataTable
        title="Zgloszenia gwarancyjne"
        actions={(
          <Button asChild>
            <Link href="/backend/warranty-claims-new">Nowe zgloszenie</Link>
          </Button>
        )}
        columns={columns}
        data={claimsQuery.data?.items ?? []}
        searchValue={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value)
          setPage(1)
        }}
        filters={filtersDef}
        filterValues={filters}
        onFiltersApply={(nextValues) => {
          setFilters(nextValues)
          setPage(1)
        }}
        onFiltersClear={() => {
          setFilters({})
          setPage(1)
        }}
        entityId="warranty_claims:claim"
        sortable
        sorting={sorting}
        onSortingChange={(next) => {
          setSorting(next)
          setPage(1)
        }}
        rowActions={(row) => (
          <RowActions
            items={[
              { label: 'Edytuj', href: `/backend/warranty-claims/${row.id}/edit` },
              {
                label: 'Usun',
                destructive: true,
                onSelect: async () => {
                  const approved = await confirm({ title: 'Usunac zgloszenie?', variant: 'destructive' })
                  if (!approved) return
                  try {
                    await deleteCrud('warranty_claims/claims', row.id)
                    flash('Zgloszenie usuniete', 'success')
                    queryClient.invalidateQueries({ queryKey: ['warranty-claims'] })
                  } catch (error) {
                    flash(error instanceof Error ? error.message : 'Nie udalo sie usunac zgloszenia', 'error')
                  }
                },
              },
            ]}
          />
        )}
        pagination={{
          page,
          pageSize: 50,
          total: claimsQuery.data?.total ?? 0,
          totalPages: claimsQuery.data?.totalPages ?? 0,
          onPageChange: setPage,
        }}
        isLoading={claimsQuery.isLoading || lookupsQuery.isLoading}
        onRowClick={(row) => router.push(`/backend/warranty-claims/${row.id}/edit`)}
      />
      {ConfirmDialogElement}
    </>
  )
}
