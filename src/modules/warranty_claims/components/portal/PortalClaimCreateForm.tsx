"use client"

import Link from 'next/link'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AttachmentsSection } from '@open-mercato/ui/backend/detail'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { Notice } from '@open-mercato/ui/primitives/Notice'
import { PortalPageHeader } from '@open-mercato/ui/portal/components/PortalPageHeader'
import { ATTACHMENTS_LIBRARY_ENTITY_ID, createDraftAttachmentRecordId, transferDraftAttachments } from '../../lib/attachments'
import { WARRANTY_DEFAULT_CREATE_PRIORITY_KEY } from '../../lib/constants'
import { WARRANTY_PRIORITY_SEGMENT_CLASSES } from '../../lib/statusStyles'
import type { PortalLookupBundle } from '../../lib/portal'

type Props = {
  orgSlug: string
}

type FormValues = {
  title: string
  issueDescription: string
  locationText: string
  priorityKey: string
  categoryKey: string
}

const FIELD_INPUT_CLASS =
  'w-full min-h-11 rounded-none border border-input bg-background px-3 py-2 text-sm shadow-none outline-none transition-[color,box-shadow,border-color] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground'

function FormCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={['rounded-lg border bg-card px-4 py-4 sm:px-5 sm:py-5', className].filter(Boolean).join(' ')}>
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
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
  options: Array<{ value: string; label: string }>
  onChange: (value: string | undefined) => void
  colorMap?: Record<string, string>
}) {
  const selectedValue = typeof value === 'string' ? value : ''

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option.value === selectedValue
        const toneClass = colorMap?.[option.value] ?? 'border-slate-200 bg-slate-50 text-slate-700'
        return (
          <button
            key={option.value}
            type="button"
            className={[
              'inline-flex min-h-11 items-center rounded-none border px-3 text-sm font-semibold transition-colors',
              isActive ? toneClass : 'border-border bg-background text-muted-foreground',
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

export default function PortalClaimCreateForm({ orgSlug }: Props) {
  const router = useRouter()
  const [draftAttachmentRecordId] = React.useState(createDraftAttachmentRecordId)
  const [values, setValues] = React.useState<FormValues>({
    title: '',
    issueDescription: '',
    locationText: '',
    priorityKey: WARRANTY_DEFAULT_CREATE_PRIORITY_KEY,
    categoryKey: '',
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const lookupsQuery = useQuery<PortalLookupBundle>({
    queryKey: ['portal-warranty-claim-create-lookups', orgSlug],
    queryFn: async () => {
      const response = await fetch('/api/warranty_claims/portal/lookups', { credentials: 'include' })
      if (!response.ok) throw new Error('Nie udało się załadować słowników formularza.')
      return await response.json()
    },
  })

  const categories = lookupsQuery.data?.categories ?? []
  const priorities = lookupsQuery.data?.priorities ?? []

  const updateValue = React.useCallback(<K extends keyof FormValues>(key: K, nextValue: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: nextValue }))
  }, [])

  const handleSubmit = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/warranty_claims/portal/claims', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Nie udało się utworzyć zgłoszenia.')
      }

      const claimId = typeof payload?.id === 'string' ? payload.id : null
      if (!claimId) {
        throw new Error('Nie udało się odczytać identyfikatora nowego zgłoszenia.')
      }

      let detailHref = `/${orgSlug}/portal/warranty-claims/${claimId}`
      try {
        await transferDraftAttachments(draftAttachmentRecordId, claimId)
      } catch {
        detailHref = `${detailHref}?attachments=partial`
      }

      router.push(detailHref)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Nie udało się utworzyć zgłoszenia.')
    } finally {
      setSubmitting(false)
    }
  }, [draftAttachmentRecordId, orgSlug, router, values])

  const handleKeyboardSubmit = React.useCallback((event: React.KeyboardEvent<HTMLFormElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !submitting) {
      event.preventDefault()
      const form = event.currentTarget
      if (form.requestSubmit) {
        form.requestSubmit()
      } else {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      }
    }
  }, [submitting])

  return (
    <div className="space-y-6">
      <PortalPageHeader
        label="Portal klienta"
        title="Nowe zgłoszenie gwarancyjne"
        description="Wypełnij dane podstawowe, opisz problem i dodaj załączniki. Układ odpowiada formularzom używanym w backendzie."
        action={(
          <Button asChild variant="outline" className="rounded-none">
            <Link href={`/${orgSlug}/portal/warranty-claims`}>Anuluj</Link>
          </Button>
        )}
      />

      {error ? <Notice variant="error">{error}</Notice> : null}
      {lookupsQuery.isError ? (
        <Notice variant="error">
          {lookupsQuery.error instanceof Error ? lookupsQuery.error.message : 'Nie udało się załadować formularza.'}
        </Notice>
      ) : null}

      <form className="space-y-6" onSubmit={handleSubmit} onKeyDown={handleKeyboardSubmit}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
          <FormCard
            title="Dane podstawowe"
            description="Najpierw uzupełnij pola, które są potrzebne do klasyfikacji zgłoszenia."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldFrame label="Tytuł" required>
                  <Input
                    value={values.title}
                    onChange={(event) => updateValue('title', event.target.value)}
                    minLength={3}
                    maxLength={200}
                    className={FIELD_INPUT_CLASS}
                    placeholder="Wpisz tytuł zgłoszenia"
                    disabled={submitting}
                    required
                  />
                </FieldFrame>
              </div>

              <div className="sm:col-span-2">
                <FieldFrame label="Pilność">
                  <SegmentedSelectField
                    value={values.priorityKey}
                    options={priorities.map((item) => ({ value: item.id, label: item.label }))}
                    onChange={(nextValue) => updateValue('priorityKey', nextValue ?? values.priorityKey)}
                    colorMap={WARRANTY_PRIORITY_SEGMENT_CLASSES}
                  />
                </FieldFrame>
              </div>

              <div className="sm:col-span-2">
                <FieldFrame label="Opis usterki" required>
                  <textarea
                    value={values.issueDescription}
                    onChange={(event) => updateValue('issueDescription', event.target.value)}
                    minLength={10}
                    maxLength={5000}
                    rows={8}
                    className={`${FIELD_INPUT_CLASS} min-h-[12rem] resize-y`}
                    placeholder="Opisz problem"
                    disabled={submitting}
                    required
                  />
                </FieldFrame>
              </div>
            </div>
          </FormCard>

          <FormCard
            title="Opis i załączniki"
            description="Dodaj szczegóły zgłoszenia i pliki w jednym kroku."
          >
            <div className="space-y-6">
              <FieldFrame label="Lokalizacja" required>
                <Input
                  value={values.locationText}
                  onChange={(event) => updateValue('locationText', event.target.value)}
                  minLength={1}
                  maxLength={300}
                  className={FIELD_INPUT_CLASS}
                  placeholder="Wpisz lokalizację"
                  disabled={submitting}
                  required
                />
              </FieldFrame>

              <FieldFrame label="Kategoria" required>
                <select
                  value={values.categoryKey}
                  onChange={(event) => updateValue('categoryKey', event.target.value)}
                  className={FIELD_INPUT_CLASS}
                  disabled={submitting || lookupsQuery.isLoading}
                  required
                >
                  <option value="">Wybierz kategorię</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </FieldFrame>

              <div className="space-y-3">
                <div className="text-sm font-medium text-foreground">Załączniki</div>
                <AttachmentsSection
                  entityId={ATTACHMENTS_LIBRARY_ENTITY_ID}
                  recordId={draftAttachmentRecordId}
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
            </div>
          </FormCard>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" className="rounded-none" asChild>
              <Link href={`/${orgSlug}/portal/warranty-claims`}>Anuluj</Link>
            </Button>
            <Button type="submit" className="rounded-none" disabled={submitting || lookupsQuery.isLoading}>
              {submitting ? 'Zapisywanie...' : 'Utwórz zgłoszenie'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
