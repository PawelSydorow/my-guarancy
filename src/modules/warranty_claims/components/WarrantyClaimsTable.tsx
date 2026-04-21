"use client"
import * as React from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { DataTable } from '@open-mercato/ui/backend/DataTable'
import { RowActions } from '@open-mercato/ui/backend/RowActions'
import type { FilterValues } from '@open-mercato/ui/backend/FilterBar'
import { Button } from '@open-mercato/ui/primitives/button'
import { deleteCrud, fetchCrudList } from '@open-mercato/ui/backend/utils/crud'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { useConfirmDialog } from '@open-mercato/ui/backend/confirm-dialog'
import { useRouter } from 'next/navigation'
import type { LookupBundle, WarrantyClaimRecord } from '../types'

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
  const [searchTitle, setSearchTitle] = React.useState('')
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
    if (searchTitle.trim()) params.set('title', searchTitle.trim())

    const addIfValue = (key: string, value: unknown) => {
      if (typeof value === 'string' && value.trim()) params.set(key, value.trim())
    }

    addIfValue('status_key', filters.status_key)
    addIfValue('priority_key', filters.priority_key)
    addIfValue('category_key', filters.category_key)
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
  }, [filters, page, searchTitle, sorting])

  const claimsQuery = useQuery<ClaimsResponse>({
    queryKey: ['warranty-claims', queryParams],
    queryFn: async () => fetchCrudList<WarrantyClaimRecord>('warranty_claims/claims', queryParams),
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

  const columns = React.useMemo<ColumnDef<WarrantyClaimRecord>[]>(() => [
    { accessorKey: 'title', header: 'Tytul', meta: { priority: 1 } },
    { accessorKey: 'bas_number', header: 'BAS', meta: { priority: 2 } },
    {
      accessorKey: 'project_id',
      header: 'Projekt',
      meta: { priority: 2 },
      cell: ({ row }) => projectMap.get(row.original.project_id) ?? row.original.project_id,
    },
    { accessorKey: 'status_key', header: 'Status', meta: { priority: 2 } },
    { accessorKey: 'priority_key', header: 'Pilnosc', meta: { priority: 3 } },
    { accessorKey: 'category_key', header: 'Kategoria', meta: { priority: 4 } },
    { accessorKey: 'subcontractor_name', header: 'Podwykonawca', meta: { priority: 4 } },
    {
      accessorKey: 'assigned_user_id',
      header: 'Przypisany',
      meta: { priority: 4 },
      cell: ({ row }) => {
        const value = row.original.assigned_user_id
        if (!value) return '—'
        return userMap.get(value) ?? value
      },
    },
    { accessorKey: 'reported_at', header: 'Data zgloszenia', meta: { priority: 3 } },
    { accessorKey: 'resolved_at', header: 'Data rozwiazania', meta: { priority: 4 } },
    { accessorKey: 'updated_at', header: 'Aktualizacja', meta: { priority: 5 } },
  ], [projectMap, userMap])

  return (
    <>
      <DataTable
        title="Zgloszenia gwarancyjne"
        actions={(
          <Button asChild>
            <Link href="/backend/warranty-claims/create">Nowe zgloszenie</Link>
          </Button>
        )}
        columns={columns}
        data={claimsQuery.data?.items ?? []}
        searchValue={searchTitle}
        onSearchChange={(value) => {
          setSearchTitle(value)
          setPage(1)
        }}
        filters={[
          { id: 'status_key', label: 'Status', type: 'select', options: (lookupsQuery.data?.statuses ?? []).map((item) => ({ value: item.id, label: item.label })) },
          { id: 'priority_key', label: 'Pilnosc', type: 'select', options: (lookupsQuery.data?.priorities ?? []).map((item) => ({ value: item.id, label: item.label })) },
          { id: 'category_key', label: 'Kategoria', type: 'select', options: (lookupsQuery.data?.categories ?? []).map((item) => ({ value: item.id, label: item.label })) },
          { id: 'project_id', label: 'Projekt', type: 'select', options: (lookupsQuery.data?.projects ?? []).map((item) => ({ value: item.id, label: item.label })) },
          { id: 'assigned_user_id', label: 'Przypisany', type: 'select', options: (lookupsQuery.data?.users ?? []).map((item) => ({ value: item.id, label: item.label })) },
          { id: 'bas_number', label: 'BAS', type: 'text' },
          { id: 'reported_at', label: 'Data zgloszenia', type: 'dateRange' },
        ]}
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
