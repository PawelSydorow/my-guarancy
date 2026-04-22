"use client"
import * as React from 'react'
import { Page, PageBody } from '@open-mercato/ui/backend/Page'
import { CrudForm, type CrudField, type CrudFormGroup, type CrudFieldOption } from '@open-mercato/ui/backend/CrudForm'
import { AttachmentsSection } from '@open-mercato/ui/backend/detail'
import { ComboboxInput } from '@open-mercato/ui/backend/inputs'
import { createCrud, fetchCrudList, updateCrud, deleteCrud } from '@open-mercato/ui/backend/utils/crud'
import { pushWithFlash } from '@open-mercato/ui/backend/utils/flash'
import { useRouter } from 'next/navigation'
import type { LookupBundle, LookupOption, WarrantyClaimApiRecord, WarrantyClaimRecord } from '../types'
import { normalizeWarrantyClaimRecord } from '../types'
import { WARRANTY_CLAIM_ENTITY_ID } from '../lib/constants'

const ATTACHMENTS_LIBRARY_ENTITY_ID = 'attachments:library'

type FormValues = {
  id?: string
  claim_number?: string
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

function toFieldOptions(items: LookupOption[]): CrudFieldOption[] {
  return items.map((item) => ({ value: item.id, label: item.label }))
}

function formatDateForInput(value?: string | null): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString()
}

function toComboboxOptions(items: LookupOption[]) {
  return items.map((item) => ({
    value: item.id,
    label: item.label,
    description: item.description ?? null,
  }))
}

const STATUS_SEGMENT_CLASSES: Record<string, string> = {
  oczekuje: 'border-border bg-muted text-muted-foreground',
  w_trakcie: 'border-primary/25 bg-primary/10 text-primary',
  zakonczone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

const PRIORITY_SEGMENT_CLASSES: Record<string, string> = {
  niski: 'border-border bg-muted text-muted-foreground',
  sredni: 'border-primary/20 bg-primary/8 text-primary',
  wysoki: 'border-[#fc3c00]/20 bg-[#fff0eb] text-[#982400]',
  krytyczny: 'border-destructive/30 bg-destructive/10 text-destructive',
}

function SegmentedSelectField({
  value,
  options,
  onChange,
  colorMap,
}: {
  value?: unknown
  options: CrudFieldOption[]
  onChange: (value: string | undefined) => void
  colorMap?: Record<string, string>
}) {
  const selectedValue = typeof value === 'string' ? value : ''

  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
      {options.map((option) => {
        const isActive = option.value === selectedValue
        const toneClass = colorMap?.[option.value] ?? 'border-slate-200 bg-slate-50 text-slate-700'
        return (
          <button
            key={option.value}
            type="button"
            className={[
              'inline-flex min-h-11 shrink-0 items-center rounded-none border px-3 text-sm font-semibold transition-colors',
              isActive ? `${toneClass} shadow-sm` : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground',
            ].join(' ')}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function HiddenInitialFocusTarget() {
  return (
    <button
      type="button"
      tabIndex={0}
      aria-hidden="true"
      className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
    />
  )
}

function createDraftAttachmentRecordId() {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `warranty-claim-create:${randomPart}`
}

async function fetchAttachmentIds(entityId: string, recordId: string) {
  const params = new URLSearchParams({ entityId, recordId })
  const response = await fetch(`/api/attachments?${params.toString()}`, { credentials: 'include' })
  if (!response.ok) throw new Error('Nie udalo sie pobrac listy zalacznikow')
  const payload = await response.json() as { items?: Array<{ id?: string | null }> }
  return (payload.items ?? [])
    .map((item) => (typeof item.id === 'string' ? item.id : null))
    .filter((id): id is string => Boolean(id))
}

async function transferDraftAttachments(draftRecordId: string, claimId: string) {
  const attachmentIds = await fetchAttachmentIds(ATTACHMENTS_LIBRARY_ENTITY_ID, draftRecordId)
  if (!attachmentIds.length) return
  const response = await fetch('/api/attachments/transfer', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sourceEntityId: ATTACHMENTS_LIBRARY_ENTITY_ID,
      targetEntityId: WARRANTY_CLAIM_ENTITY_ID,
      attachmentIds,
      fromRecordId: draftRecordId,
      toRecordId: claimId,
    }),
  })
  if (!response.ok) throw new Error('Nie udalo sie przypiac zalacznikow do zgloszenia')
}

async function fetchLookupItems(endpoint: string, query = '', extraParams?: Record<string, string | null | undefined>) {
  const params = new URLSearchParams()
  if (query.trim()) params.set('q', query.trim())
  for (const [key, value] of Object.entries(extraParams ?? {})) {
    if (typeof value === 'string' && value.trim()) params.set(key, value.trim())
  }
  const response = await fetch(`/api/warranty_claims/${endpoint}?${params.toString()}`, { credentials: 'include' })
  if (!response.ok) throw new Error('Nie udalo sie zaladowac danych lookup')
  const payload = await response.json() as { items?: LookupOption[] }
  return Array.isArray(payload.items) ? payload.items : []
}

export default function WarrantyClaimForm({ mode, claimId }: { mode: 'create' | 'edit'; claimId?: string }) {
  const router = useRouter()
  const [draftAttachmentRecordId] = React.useState(createDraftAttachmentRecordId)
  const [lookups, setLookups] = React.useState<LookupBundle | null>(null)
  const [subcontractors, setSubcontractors] = React.useState<LookupOption[]>([])
  const [subcontractorsLoading, setSubcontractorsLoading] = React.useState(false)
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
          claim_number: '',
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
        const response = await fetchCrudList<WarrantyClaimApiRecord>('warranty_claims/claims', { id: claimId, pageSize: '1' })
        const rawClaim = response.items?.[0]
        if (!rawClaim) throw new Error('Nie znaleziono zgloszenia')
        const claim = normalizeWarrantyClaimRecord(rawClaim)
        if (cancelled) return
        setClaimRecord(claim)
        setInitialValues({
          id: claim.id,
          claim_number: claim.claim_number_formatted,
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
    setSubcontractorsLoading(true)
    try {
      const nextItems = await fetchLookupItems('subcontractors', '', { project_id: projectId })
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
    } finally {
      setSubcontractorsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!initialValues?.project_id) return
    loadSubcontractors(initialValues.project_id, claimRecord).catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : 'Nie udalo sie zaladowac podwykonawcow')
    })
  }, [claimRecord, initialValues?.project_id, loadSubcontractors])

  const loadProjectOptions = React.useCallback(async (query?: string) => {
    return toComboboxOptions(await fetchLookupItems('projects', query ?? ''))
  }, [])

  const loadUserOptions = React.useCallback(async (query?: string) => {
    return toComboboxOptions(await fetchLookupItems('users', query ?? ''))
  }, [])

  const loadSubcontractorOptions = React.useCallback(async (query?: string, projectId?: string) => {
    if (!projectId) return []
    return toComboboxOptions(await fetchLookupItems('subcontractors', query ?? '', { project_id: projectId }))
  }, [])

  const fields = React.useMemo<CrudField[]>(() => [
    {
      id: 'claim_number',
      label: 'Numer zgloszenia',
      type: 'custom',
      component: ({ value }) => (
        <input
          type="text"
          readOnly
          value={typeof value === 'string' && value.trim() ? value : 'Nadany automatycznie po zapisie'}
          className="w-full rounded-none border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
        />
      ),
    },
    {
      id: 'project_id',
      label: 'Projekt',
      type: 'custom',
      required: true,
      component: ({ value, setValue, setFormValue }) => (
        <div className="relative">
          <HiddenInitialFocusTarget />
          <ComboboxInput
            value={typeof value === 'string' ? value : ''}
            suggestions={toComboboxOptions(lookups?.projects ?? [])}
            loadSuggestions={loadProjectOptions}
            placeholder="Wybierz projekt"
            disabled={mode === 'edit'}
            allowCustomValues={false}
            resolveLabel={(nextValue) => (lookups?.projects ?? []).find((item) => item.id === nextValue)?.label ?? nextValue}
            resolveDescription={(nextValue) => (lookups?.projects ?? []).find((item) => item.id === nextValue)?.description ?? null}
            onChange={(nextValue) => {
              setValue(nextValue || undefined)
              setFormValue?.('subcontractor_id', undefined)
              loadSubcontractors(nextValue).catch((err: unknown) => {
                setError(err instanceof Error ? err.message : 'Nie udalo sie zaladowac podwykonawcow')
              })
            }}
          />
        </div>
      ),
    },
    { id: 'title', label: 'Tytul', type: 'text', required: true },
    { id: 'bas_number', label: 'Numer BAS', type: 'text', required: true },
    {
      id: 'status_key',
      label: 'Status',
      type: 'custom',
      required: true,
      component: ({ value, setValue }) => (
        <SegmentedSelectField
          value={value}
          options={toFieldOptions(lookups?.statuses ?? [])}
          onChange={(nextValue) => setValue(nextValue)}
          colorMap={STATUS_SEGMENT_CLASSES}
        />
      ),
    },
    {
      id: 'priority_key',
      label: 'Pilnosc',
      type: 'custom',
      required: true,
      component: ({ value, setValue }) => (
        <SegmentedSelectField
          value={value}
          options={toFieldOptions(lookups?.priorities ?? [])}
          onChange={(nextValue) => setValue(nextValue)}
          colorMap={PRIORITY_SEGMENT_CLASSES}
        />
      ),
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
      type: 'custom',
      component: ({ value, setValue }) => (
        <ComboboxInput
          value={typeof value === 'string' ? value : ''}
          suggestions={toComboboxOptions(lookups?.users ?? [])}
          loadSuggestions={loadUserOptions}
          placeholder="Wybierz osobe"
          allowCustomValues={false}
          resolveLabel={(nextValue) => (lookups?.users ?? []).find((item) => item.id === nextValue)?.label ?? nextValue}
          resolveDescription={(nextValue) => (lookups?.users ?? []).find((item) => item.id === nextValue)?.description ?? null}
          onChange={(nextValue) => setValue(nextValue || undefined)}
        />
      ),
    },
    {
      id: 'subcontractor_id',
      label: 'Podwykonawca',
      type: 'custom',
      component: ({ value, values, setValue }) => {
        const projectId = typeof values?.project_id === 'string' ? values.project_id : ''
        return (
          <ComboboxInput
            value={typeof value === 'string' ? value : ''}
            suggestions={toComboboxOptions(subcontractors)}
            disabled={!projectId || subcontractorsLoading}
            loadSuggestions={(query?: string) => loadSubcontractorOptions(query, projectId)}
            placeholder={projectId ? 'Wybierz podwykonawce' : 'Najpierw wybierz projekt'}
            allowCustomValues={false}
            resolveLabel={(nextValue) => subcontractors.find((item) => item.id === nextValue)?.label ?? nextValue}
            resolveDescription={(nextValue) => subcontractors.find((item) => item.id === nextValue)?.description ?? null}
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
  ], [lookups, subcontractors, subcontractorsLoading, loadProjectOptions, loadSubcontractorOptions, loadSubcontractors, loadUserOptions])

  const groups = React.useMemo<CrudFormGroup[]>(() => [
    {
      id: 'basic',
      title: 'Dane podstawowe',
      column: 1,
      fields: ['claim_number', 'project_id', 'title', 'bas_number', 'status_key', 'priority_key', 'category_key'],
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
    {
      id: 'attachments',
      title: 'Zalaczniki',
      column: 2,
      component: () => (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {mode === 'create'
              ? 'Pliki zapisuja sie tymczasowo od razu po dodaniu lub usunieciu. Po utworzeniu zgloszenia zostana przypiete do rekordu.'
              : 'Pliki zapisuja sie od razu po dodaniu lub usunieciu. Zmiany formularza nadal wymagaja osobnego zapisu.'}
          </p>
          <AttachmentsSection
            entityId={mode === 'create' ? ATTACHMENTS_LIBRARY_ENTITY_ID : WARRANTY_CLAIM_ENTITY_ID}
            recordId={mode === 'create' ? draftAttachmentRecordId : claimId ?? null}
            showHeader={false}
          />
        </div>
      ),
    },
  ], [claimId, claimRecord, draftAttachmentRecordId, mode, subcontractors])

  const handleSubmit = React.useCallback(async (values: FormValues) => {
    const { claim_number: _claimNumber, ...restValues } = values
    const payload = {
      ...restValues,
      assigned_user_id: values.assigned_user_id || null,
      subcontractor_id: values.subcontractor_id || null,
      resolved_at: values.resolved_at || null,
    }
    if (mode === 'create') {
      const created = await createCrud<WarrantyClaimApiRecord>('warranty_claims/claims', payload)
      const createdId = typeof created.result?.id === 'string' ? created.result.id : null
      if (!createdId) throw new Error('Nie udalo sie odczytac identyfikatora nowego zgloszenia')
      await transferDraftAttachments(draftAttachmentRecordId, createdId)
      return
    }
    await updateCrud('warranty_claims/claims', payload)
  }, [draftAttachmentRecordId, mode])

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
