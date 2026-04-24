"use client"
import * as React from 'react'
import { Page, PageBody } from '@open-mercato/ui/backend/Page'
import { CrudForm, type CrudField, type CrudFormGroup, type CrudFieldOption } from '@open-mercato/ui/backend/CrudForm'
import { AttachmentsSection } from '@open-mercato/ui/backend/detail'
import { ComboboxInput, DateTimePicker } from '@open-mercato/ui/backend/inputs'
import { createCrud, fetchCrudList, updateCrud, deleteCrud } from '@open-mercato/ui/backend/utils/crud'
import { pushWithFlash } from '@open-mercato/ui/backend/utils/flash'
import { useRouter } from 'next/navigation'
import type { z } from 'zod'
import type { LookupBundle, LookupOption, WarrantyClaimApiRecord, WarrantyClaimRecord } from '../types'
import { normalizeWarrantyClaimRecord } from '../types'
import {
  WARRANTY_CLAIM_ENTITY_ID,
  WARRANTY_DEFAULT_CREATE_PRIORITY_KEY,
  WARRANTY_DEFAULT_CREATE_STATUS_KEY,
} from '../lib/constants'
import { WARRANTY_PRIORITY_SEGMENT_CLASSES, WARRANTY_STATUS_SEGMENT_CLASSES } from '../lib/statusStyles'
import { warrantyClaimCreateSchema, warrantyClaimUpdateSchema } from '../data/validators'

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

const FIELD_INPUT_CLASS =
  'w-full min-h-11 rounded-none border border-input bg-background px-3 py-2 text-sm shadow-none outline-none transition-[color,box-shadow,border-color] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground'

function FormCard({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={['rounded-lg border bg-card px-4 py-4 sm:px-5 sm:py-5', className].filter(Boolean).join(' ')}>
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function FieldFrame({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </div>
      {children}
      {error ? <div className="text-xs text-destructive">{error}</div> : null}
    </div>
  )
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
              'inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-none border px-3 text-sm font-semibold transition-colors',
              isActive
                ? `${toneClass}`
                : 'border-border bg-background text-muted-foreground',
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

export default function WarrantyClaimForm({
  mode,
  claimId,
}: {
  mode: 'create' | 'edit'
  claimId?: string
}) {
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
          priority_key: WARRANTY_DEFAULT_CREATE_PRIORITY_KEY,
          category_key: '',
          bas_number: '',
          status_key: WARRANTY_DEFAULT_CREATE_STATUS_KEY,
          reported_at: new Date().toISOString(),
          assigned_user_id: undefined,
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

  const groups = React.useMemo<CrudFormGroup[]>(() => [
    {
      id: 'layout',
      bare: true,
      component: ({ values, setValue, errors }: {
        values: Record<string, unknown>
        setValue: (id: string, value: unknown) => void
        errors: Record<string, string>
      }) => {
        const projectId = typeof values.project_id === 'string' ? values.project_id : ''
        const claimNumber = typeof values.claim_number === 'string' ? values.claim_number : ''
        const categoryKey = typeof values.category_key === 'string' ? values.category_key : ''
        const basNumber = typeof values.bas_number === 'string' ? values.bas_number : ''
        const statusKey = typeof values.status_key === 'string' ? values.status_key : ''
        const priorityKey = typeof values.priority_key === 'string' ? values.priority_key : ''
        const title = typeof values.title === 'string' ? values.title : ''
        const locationText = typeof values.location_text === 'string' ? values.location_text : ''
        const issueDescription = typeof values.issue_description === 'string' ? values.issue_description : ''
        const assignedUserId = typeof values.assigned_user_id === 'string' ? values.assigned_user_id : ''
        const subcontractorId = typeof values.subcontractor_id === 'string' ? values.subcontractor_id : ''
        const reportedAtValue = typeof values.reported_at === 'string' && values.reported_at ? new Date(values.reported_at) : null
        const resolvedAtValue = typeof values.resolved_at === 'string' && values.resolved_at ? new Date(values.resolved_at) : null
        const selectedSubcontractor = subcontractors.find((item) => item.id === subcontractorId) ?? null
        const isHistorical = Boolean(claimRecord?.subcontractor_id && claimRecord.subcontractor_id === subcontractorId)
        const projectOptions = lookups?.projects ?? []
        const categoryOptions = lookups?.categories ?? []
        const statusOptions = lookups?.statuses ?? []
        const priorityOptions = lookups?.priorities ?? []
        const userOptions = lookups?.users ?? []

        const onProjectChange = (nextValue: string) => {
          setValue('project_id', nextValue || undefined)
          setValue('subcontractor_id', undefined)
          loadSubcontractors(nextValue).catch((err: unknown) => {
            setError(err instanceof Error ? err.message : 'Nie udalo sie zaladowac podwykonawcow')
          })
        }

        return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <FormCard title="Dane podstawowe" className="h-full">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-4">
                  <FieldFrame label="Projekt" required error={errors.project_id}>
                    <ComboboxInput
                      value={projectId}
                      suggestions={toComboboxOptions(projectOptions)}
                      placeholder="Wybierz projekt"
                      disabled={mode === 'edit'}
                      allowCustomValues={false}
                      resolveLabel={(nextValue) => projectOptions.find((item) => item.id === nextValue)?.label ?? nextValue}
                      resolveDescription={(nextValue) => projectOptions.find((item) => item.id === nextValue)?.description ?? null}
                      onChange={onProjectChange}
                    />
                  </FieldFrame>
                  <FieldFrame label="Kategoria" required error={errors.category_key}>
                    <select value={categoryKey} className={FIELD_INPUT_CLASS} onChange={(event) => setValue('category_key', event.target.value || undefined)}>
                      <option value="">Wybierz kategorię</option>
                      {categoryOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </FieldFrame>
                  <FieldFrame label="Status" required error={errors.status_key}>
                    <SegmentedSelectField
                      value={statusKey}
                      options={statusOptions.map((item) => ({ value: item.id, label: item.label }))}
                      onChange={(nextValue) => setValue('status_key', nextValue)}
                      colorMap={WARRANTY_STATUS_SEGMENT_CLASSES}
                    />
                  </FieldFrame>
                </div>
                <div className="space-y-4">
                  <FieldFrame label="Numer zgłoszenia" error={errors.claim_number}>
                    <input type="text" readOnly aria-readonly="true" value={claimNumber.trim() ? claimNumber : 'Nadany automatycznie po zapisie'} className="w-full rounded-none border border-input bg-muted px-3 py-2 text-sm font-medium text-foreground" />
                  </FieldFrame>
                  <FieldFrame label="Numer BAS" required error={errors.bas_number}>
                    <input type="text" value={basNumber} onChange={(event) => setValue('bas_number', event.target.value)} placeholder="Wpisz numer BAS" className={FIELD_INPUT_CLASS} />
                  </FieldFrame>
                  <FieldFrame label="Pilność" required error={errors.priority_key}>
                    <SegmentedSelectField
                      value={priorityKey}
                      options={priorityOptions.map((item) => ({ value: item.id, label: item.label }))}
                      onChange={(nextValue) => setValue('priority_key', nextValue)}
                      colorMap={WARRANTY_PRIORITY_SEGMENT_CLASSES}
                    />
                  </FieldFrame>
                </div>
              </div>
            </FormCard>

            <FormCard title="Odpowiedzialność i realizacja" className="h-full">
              <div className="space-y-4">
                <FieldFrame label="Przypisana osoba" required error={errors.assigned_user_id}>
                  <ComboboxInput
                    value={assignedUserId}
                    suggestions={toComboboxOptions(userOptions)}
                    placeholder="Wybierz osobę"
                    allowCustomValues={false}
                    resolveLabel={(nextValue) => userOptions.find((item) => item.id === nextValue)?.label ?? nextValue}
                    resolveDescription={(nextValue) => userOptions.find((item) => item.id === nextValue)?.description ?? null}
                    onChange={(nextValue) => setValue('assigned_user_id', nextValue || undefined)}
                  />
                </FieldFrame>
                <FieldFrame label="Data zgłoszenia" required error={errors.reported_at}>
                  <DateTimePicker
                    value={reportedAtValue}
                    onChange={(nextValue: Date | null) => setValue('reported_at', nextValue ? nextValue.toISOString() : undefined)}
                    placeholder="Wybierz datę zgłoszenia"
                  />
                </FieldFrame>
                <FieldFrame label="Data rozwiązania" error={errors.resolved_at}>
                  <DateTimePicker
                    value={resolvedAtValue}
                    onChange={(nextValue: Date | null) => setValue('resolved_at', nextValue ? nextValue.toISOString() : undefined)}
                    placeholder="Wybierz datę rozwiązania"
                  />
                </FieldFrame>
              </div>
            </FormCard>

            <FormCard title="Opis" className="h-full">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldFrame label="Tytuł" required error={errors.title}>
                  <input type="text" value={title} onChange={(event) => setValue('title', event.target.value)} placeholder="Wpisz tytuł zgłoszenia" className={FIELD_INPUT_CLASS} />
                </FieldFrame>
                <FieldFrame label="Lokalizacja" required error={errors.location_text}>
                  <input type="text" value={locationText} onChange={(event) => setValue('location_text', event.target.value)} placeholder="Wpisz lokalizację" className={FIELD_INPUT_CLASS} />
                </FieldFrame>
                <div className="sm:col-span-2">
                  <FieldFrame label="Opis usterki" required error={errors.issue_description}>
                    <textarea
                      value={issueDescription}
                      onChange={(event) => setValue('issue_description', event.target.value)}
                      placeholder="Opisz problem"
                      rows={8}
                      className={`${FIELD_INPUT_CLASS} min-h-[12rem] resize-y`}
                    />
                  </FieldFrame>
                </div>
              </div>
            </FormCard>

            <FormCard title="Dane podwykonawcy" className="h-full">
              <div className="space-y-4">
                <FieldFrame label="Podwykonawca" error={errors.subcontractor_id}>
                  <ComboboxInput
                    value={subcontractorId}
                    suggestions={toComboboxOptions(subcontractors)}
                    disabled={!projectId || subcontractorsLoading}
                    placeholder={projectId ? 'Wybierz podwykonawcę' : 'Najpierw wybierz projekt'}
                    allowCustomValues={false}
                    resolveLabel={(nextValue) => subcontractors.find((item) => item.id === nextValue)?.label ?? nextValue}
                    resolveDescription={(nextValue) => subcontractors.find((item) => item.id === nextValue)?.description ?? null}
                    onChange={(nextValue) => setValue('subcontractor_id', nextValue || undefined)}
                  />
                </FieldFrame>
                <div className="space-y-2 rounded-none border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  <div>Adres: {isHistorical ? (claimRecord?.subcontractor_address ?? '—') : 'Uzupełni się po zapisie'}</div>
                  <div>Email: {isHistorical ? (claimRecord?.subcontractor_email ?? '—') : (selectedSubcontractor?.description ?? 'Uzupełni się po zapisie')}</div>
                  <div>Telefon: {isHistorical ? (claimRecord?.subcontractor_phone ?? '—') : 'Uzupełni się po zapisie'}</div>
                  <div>Osoba kontaktowa: {isHistorical ? (claimRecord?.subcontractor_contact_person ?? '—') : 'Uzupełni się po zapisie'}</div>
                </div>
              </div>
            </FormCard>

            <FormCard title="Załączniki" className="h-full lg:col-span-2">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {mode === 'create'
                    ? 'Pliki zapisują się tymczasowo od razu po dodaniu lub usunięciu. Po utworzeniu zgłoszenia zostaną przypięte do rekordu.'
                    : 'Pliki zapisują się od razu po dodaniu lub usunięciu. Zmiany formularza nadal wymagają osobnego zapisu.'}
                </p>
                <AttachmentsSection
                  entityId={mode === 'create' ? ATTACHMENTS_LIBRARY_ENTITY_ID : WARRANTY_CLAIM_ENTITY_ID}
                  recordId={mode === 'create' ? draftAttachmentRecordId : claimId ?? null}
                  showHeader={false}
                  compact
                  className={[
                    'space-y-1.5',
                    '[&_.grid]:gap-1.5',
                    '[&_.grid>button]:rounded-md',
                    '[&_.grid>button>div:first-child]:aspect-[4/3]',
                    '[&_.grid>button>div:first-child]:flex',
                    '[&_.grid>button>div:first-child]:items-center',
                    '[&_.grid>button>div:first-child]:justify-center',
                    '[&_.grid>button>div:first-child]:overflow-hidden',
                    '[&_.grid>button>div:first-child]:p-0',
                    '[&_.grid>button>div:first-child>img]:h-full',
                    '[&_.grid>button>div:first-child>img]:w-full',
                    '[&_.grid>button>div:first-child>img]:object-cover',
                    '[&_.grid>button>div:first-child>img]:max-h-none',
                    '[&_.grid>button>div:first-child>img]:max-w-none',
                    '[&_.grid>button>div:first-child>div]:h-full',
                    '[&_.grid>button>div:first-child>div]:w-full',
                    '[&_.grid>button>div:last-child]:p-1.5',
                    '[&_.grid>button>div:last-child>div:first-child]:text-[10px]',
                    '[&_.grid>button>div:last-child>div:last-child]:text-[9px]',
                    '[&_.border-dashed]:px-3',
                    '[&_.border-dashed]:py-3',
                    '[&_.border-dashed>svg]:h-4',
                    '[&_.border-dashed>svg]:w-4',
                    '[&_.border-dashed>.mt-2]:mt-1',
                    '[&_.border-dashed>.mt-4]:mt-1.5',
                    '[&_.border-dashed>.mt-4]:px-2',
                    '[&_.border-dashed>.mt-4]:py-1',
                  ].join(' ')}
                />
              </div>
            </FormCard>
          </div>
        )
      },
    },
  ], [claimRecord, loadSubcontractors, lookups, mode, subcontractors, subcontractorsLoading])

  const formSchema = React.useMemo(
    () => (mode === 'create' ? warrantyClaimCreateSchema : warrantyClaimUpdateSchema) as unknown as z.ZodType<FormValues>,
    [mode],
  )

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
          schema={formSchema}
          fields={[]}
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
