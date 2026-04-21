"use client"
import * as React from 'react'
import { Page, PageBody } from '@open-mercato/ui/backend/Page'
import { CrudForm, type CrudField, type CrudFormGroup, type CrudFieldOption } from '@open-mercato/ui/backend/CrudForm'
import { createCrud, fetchCrudList, updateCrud, deleteCrud } from '@open-mercato/ui/backend/utils/crud'
import { pushWithFlash } from '@open-mercato/ui/backend/utils/flash'
import { useRouter } from 'next/navigation'
import type { LookupBundle, LookupOption, WarrantyClaimRecord } from '../types'

type FormValues = {
  id?: string
  project_id: string
  title: string
  issue_description: string
  location_text: string
  priority_key: string
  category_key: string
  bas_number: string
  status_key: string
  reported_at: string
  assigned_user_id?: string | null
  resolved_at?: string | null
  subcontractor_id?: string | null
}

type ClaimsResponse = {
  items: WarrantyClaimRecord[]
}

const COMPLETED_STATUS = 'zakonczone'

function toFieldOptions(items: LookupOption[]): CrudFieldOption[] {
  return items.map((item) => ({ value: item.id, label: item.label }))
}

function formatDateForInput(value?: string | null): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString()
}

type SelectInputProps = {
  id: string
  value: string
  options: CrudFieldOption[]
  disabled?: boolean
  onChange: (value: string) => void
}

function NativeSelect({ id, value, options, disabled, onChange }: SelectInputProps) {
  return (
    <select
      id={id}
      className="w-full h-9 rounded border px-2 text-sm"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">—</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export default function WarrantyClaimForm({ mode, claimId }: { mode: 'create' | 'edit'; claimId?: string }) {
  const router = useRouter()
  const [lookups, setLookups] = React.useState<LookupBundle | null>(null)
  const [subcontractors, setSubcontractors] = React.useState<LookupOption[]>([])
  const [initialValues, setInitialValues] = React.useState<FormValues | null>(null)
  const [claimRecord, setClaimRecord] = React.useState<WarrantyClaimRecord | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function loadLookups() {
      try {
        const response = await fetch('/api/warranty_claims/lookups', { credentials: 'include' })
        if (!response.ok) throw new Error('Nie udalo sie zaladowac lookupow')
        const payload = await response.json()
        if (!cancelled) setLookups(payload)
      } catch (nextError) {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : 'Blad konfiguracji lookupow')
      }
    }
    loadLookups()
    return () => { cancelled = true }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    async function loadClaim() {
      if (mode !== 'edit' || !claimId) {
        setInitialValues({
          project_id: '',
          title: '',
          issue_description: '',
          location_text: '',
          priority_key: '',
          category_key: '',
          bas_number: '',
          status_key: '',
          reported_at: new Date().toISOString(),
          assigned_user_id: null,
          resolved_at: null,
          subcontractor_id: null,
        })
        setLoading(false)
        return
      }

      try {
        const response = await fetchCrudList<WarrantyClaimRecord>('warranty_claims/claims', { id: claimId, pageSize: '1' })
        const claim = response.items?.[0]
        if (!claim) throw new Error('Nie znaleziono zgloszenia')
        if (cancelled) return
        setClaimRecord(claim)
        setInitialValues({
          id: claim.id,
          project_id: claim.project_id,
          title: claim.title,
          issue_description: claim.issue_description,
          location_text: claim.location_text,
          priority_key: claim.priority_key,
          category_key: claim.category_key,
          bas_number: claim.bas_number,
          status_key: claim.status_key,
          reported_at: formatDateForInput(claim.reported_at),
          assigned_user_id: claim.assigned_user_id,
          resolved_at: formatDateForInput(claim.resolved_at),
          subcontractor_id: claim.subcontractor_id,
        })
      } catch (nextError) {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : 'Nie udalo sie zaladowac rekordu')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadClaim()
    return () => { cancelled = true }
  }, [claimId, mode])

  const loadSubcontractors = React.useCallback(async (projectId: string, currentClaim?: WarrantyClaimRecord | null) => {
    if (!projectId) {
      setSubcontractors([])
      return
    }
    const response = await fetch(`/api/warranty_claims/subcontractors?project_id=${encodeURIComponent(projectId)}`, { credentials: 'include' })
    if (!response.ok) throw new Error('Nie udalo sie zaladowac podwykonawcow')
    const payload = await response.json() as { items?: LookupOption[] }
    const nextItems = Array.isArray(payload.items) ? payload.items : []
    if (
      currentClaim?.subcontractor_id
      && currentClaim.project_id === projectId
      && !nextItems.some((item) => item.id === currentClaim.subcontractor_id)
      && currentClaim.subcontractor_name
    ) {
      nextItems.push({
        id: currentClaim.subcontractor_id,
        label: `${currentClaim.subcontractor_name} (historyczne)`,
        description: currentClaim.subcontractor_email || currentClaim.subcontractor_phone || null,
      })
    }
    setSubcontractors(nextItems)
  }, [])

  React.useEffect(() => {
    if (!initialValues?.project_id) return
    loadSubcontractors(initialValues.project_id, claimRecord).catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : 'Nie udalo sie zaladowac podwykonawcow')
    })
  }, [claimRecord, initialValues?.project_id, loadSubcontractors])

  const fields = React.useMemo<CrudField[]>(() => [
    {
      id: 'project_id',
      label: 'Projekt',
      type: 'custom',
      required: true,
      component: ({ id, value, setValue, setFormValue }) => (
        <NativeSelect
          id={id}
          value={typeof value === 'string' ? value : ''}
          options={toFieldOptions(lookups?.projects ?? [])}
          onChange={(nextValue) => {
            setValue(nextValue || undefined)
            setFormValue?.('subcontractor_id', undefined)
          }}
        />
      ),
    },
    { id: 'title', label: 'Tytul', type: 'text', required: true },
    { id: 'bas_number', label: 'Numer BAS', type: 'text', required: true },
    {
      id: 'status_key',
      label: 'Status',
      type: 'custom',
      required: true,
      component: ({ id, value, setValue, values, setFormValue }) => (
        <NativeSelect
          id={id}
          value={typeof value === 'string' ? value : ''}
          options={toFieldOptions(lookups?.statuses ?? [])}
          onChange={(nextValue) => {
            setValue(nextValue || undefined)
            const resolvedAtValue = typeof values?.resolved_at === 'string' ? values.resolved_at : ''
            if (nextValue === COMPLETED_STATUS && !resolvedAtValue) {
              setFormValue?.('resolved_at', new Date().toISOString())
            }
          }}
        />
      ),
    },
    {
      id: 'priority_key',
      label: 'Pilnosc',
      type: 'select',
      required: true,
      options: toFieldOptions(lookups?.priorities ?? []),
    },
    {
      id: 'category_key',
      label: 'Kategoria',
      type: 'select',
      required: true,
      options: toFieldOptions(lookups?.categories ?? []),
    },
    { id: 'issue_description', label: 'Opis usterki', type: 'textarea', required: true },
    { id: 'location_text', label: 'Lokalizacja', type: 'text', required: true },
    {
      id: 'assigned_user_id',
      label: 'Przypisana osoba',
      type: 'select',
      options: toFieldOptions(lookups?.users ?? []),
    },
    {
      id: 'subcontractor_id',
      label: 'Podwykonawca',
      type: 'custom',
      component: ({ id, value, values, setValue }) => {
        const projectId = typeof values?.project_id === 'string' ? values.project_id : ''
        return (
          <NativeSelect
            id={id}
            value={typeof value === 'string' ? value : ''}
            options={toFieldOptions(subcontractors)}
            disabled={!projectId}
            onChange={(nextValue) => setValue(nextValue || undefined)}
          />
        )
      },
    },
    {
      id: 'reported_at',
      label: 'Data zgloszenia',
      type: 'datetime',
      required: true,
    },
    {
      id: 'resolved_at',
      label: 'Data rozwiazania',
      type: 'datetime',
    },
  ], [lookups, subcontractors])

  const groups = React.useMemo<CrudFormGroup[]>(() => [
    {
      id: 'basic',
      title: 'Dane podstawowe',
      column: 1,
      fields: ['project_id', 'title', 'bas_number', 'status_key', 'priority_key', 'category_key'],
    },
    {
      id: 'description',
      title: 'Opis',
      column: 1,
      fields: ['issue_description', 'location_text'],
    },
    {
      id: 'execution',
      title: 'Odpowiedzialnosc i realizacja',
      column: 2,
      fields: ['assigned_user_id', 'subcontractor_id', 'reported_at', 'resolved_at'],
    },
    {
      id: 'subcontractor_snapshot',
      title: 'Dane podwykonawcy',
      column: 2,
      component: ({ values }) => {
        const selectedSubcontractorId = typeof values.subcontractor_id === 'string' ? values.subcontractor_id : null
        const selectedSubcontractor = subcontractors.find((item) => item.id === selectedSubcontractorId)
        const isHistorical = claimRecord?.subcontractor_id === selectedSubcontractorId
        return (
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>Adres: {isHistorical ? (claimRecord?.subcontractor_address ?? '—') : 'Wypelni sie po zapisie'}</div>
            <div>Email: {isHistorical ? (claimRecord?.subcontractor_email ?? '—') : (selectedSubcontractor?.description ?? 'Wypelni sie po zapisie')}</div>
            <div>Telefon: {isHistorical ? (claimRecord?.subcontractor_phone ?? '—') : 'Wypelni sie po zapisie'}</div>
            <div>Osoba kontaktowa: {isHistorical ? (claimRecord?.subcontractor_contact_person ?? '—') : 'Wypelni sie po zapisie'}</div>
          </div>
        )
      },
    },
  ], [claimRecord, subcontractors])

  const handleSubmit = React.useCallback(async (values: FormValues) => {
    const payload = {
      ...values,
      assigned_user_id: values.assigned_user_id || null,
      subcontractor_id: values.subcontractor_id || null,
      resolved_at: values.resolved_at || null,
    }
    if (mode === 'create') {
      await createCrud('warranty_claims/claims', payload)
      return
    }
    await updateCrud('warranty_claims/claims', payload)
  }, [mode])

  if (error) {
    return (
      <Page>
        <PageBody>
          <div className="text-sm text-destructive">{error}</div>
        </PageBody>
      </Page>
    )
  }

  return (
    <Page>
      <PageBody>
        <CrudForm<FormValues>
          title={mode === 'create' ? 'Nowe zgloszenie gwarancyjne' : 'Edycja zgloszenia gwarancyjnego'}
          backHref="/backend/warranty-claims"
          entityId="warranty_claims:claim"
          fields={fields}
          groups={groups}
          initialValues={initialValues ?? undefined}
          isLoading={loading || !lookups}
          submitLabel={mode === 'create' ? 'Utworz zgloszenie' : 'Zapisz zmiany'}
          cancelHref="/backend/warranty-claims"
          successRedirect={`/backend/warranty-claims?flash=${encodeURIComponent(mode === 'create' ? 'Zgloszenie utworzone' : 'Zgloszenie zapisane')}&type=success`}
          onSubmit={handleSubmit}
          onDelete={mode === 'edit' && claimId ? async () => {
            await deleteCrud('warranty_claims/claims', claimId)
            pushWithFlash(router, '/backend/warranty-claims', 'Zgloszenie usuniete', 'success')
          } : undefined}
        />
      </PageBody>
    </Page>
  )
}
