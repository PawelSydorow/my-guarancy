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
import { PortalCard } from '@open-mercato/ui/portal/components/PortalCard'
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

const FIELD_CLASS = 'w-full rounded-none border border-input bg-background px-3 py-2 text-sm shadow-none outline-none transition-[color,box-shadow,border-color] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  )
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <PortalCard className="rounded-none border-border/70">
      <div className="space-y-1 border-b border-border/70 pb-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="pt-5">{children}</div>
    </PortalCard>
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
      if (!response.ok) throw new Error('Nie udalo sie zaladowac slownikow formularza.')
      return await response.json()
    },
  })

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
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Nie udalo sie utworzyc zgloszenia.')
      }

      const claimId = typeof payload?.id === 'string' ? payload.id : null
      if (!claimId) {
        throw new Error('Nie udalo sie odczytac identyfikatora nowego zgloszenia.')
      }

      let detailHref = `/${orgSlug}/portal/warranty-claims/${claimId}`
      try {
        await transferDraftAttachments(draftAttachmentRecordId, claimId)
      } catch {
        detailHref = `${detailHref}?attachments=partial`
      }

      router.push(detailHref)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Nie udalo sie utworzyc zgloszenia.')
    } finally {
      setSubmitting(false)
    }
  }, [draftAttachmentRecordId, orgSlug, router, values])

  return (
    <div className="space-y-6">
      <PortalPageHeader
        label="Portal klienta"
        title="Nowe zgloszenie gwarancyjne"
        description="Uzupelnij podstawowe dane, a status zostanie ustawiony automatycznie na oczekuje."
        action={(
          <Button asChild variant="outline" className="rounded-none">
            <Link href={`/${orgSlug}/portal/warranty-claims`}>Anuluj</Link>
          </Button>
        )}
      />

      <form className="space-y-6" onSubmit={handleSubmit}>
        {error ? <Notice variant="error">{error}</Notice> : null}
        {lookupsQuery.isError ? (
          <Notice variant="error">
            {lookupsQuery.error instanceof Error ? lookupsQuery.error.message : 'Nie udalo sie zaladowac formularza.'}
          </Notice>
        ) : null}

        <FormSection
          title="Dane podstawowe"
          description="Status nowego zgloszenia zostanie ustawiony automatycznie na oczekuje."
        >
          <div className="space-y-5">
            <div className="rounded-none border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Projekt zostanie przypisany automatycznie na podstawie pierwszego aktywnego projektu Twojej organizacji.
            </div>
            <Field label="Kategoria" required>
              <select
                value={values.categoryKey}
                onChange={(event) => updateValue('categoryKey', event.target.value)}
                className="w-full rounded-none border border-input bg-background px-3 py-2 text-sm shadow-none outline-none transition-[color,box-shadow,border-color] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50"
                disabled={submitting || lookupsQuery.isLoading}
                required
              >
                <option value="">Wybierz kategorię</option>
                {(lookupsQuery.data?.categories ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Priorytet">
              <p className="text-xs text-muted-foreground">
                Domyslnie wybrany jest priorytet startowy, ale mozesz go zmienic przed wyslaniem.
              </p>
              <div className="flex flex-wrap gap-2">
                {(lookupsQuery.data?.priorities ?? []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={[
                      'rounded-none border px-3 py-2 text-xs font-semibold transition-colors',
                      values.priorityKey === item.id
                        ? (WARRANTY_PRIORITY_SEGMENT_CLASSES[item.id] ?? 'border-foreground bg-foreground text-background')
                        : 'border-border bg-background text-muted-foreground hover:text-foreground',
                    ].join(' ')}
                    onClick={() => updateValue('priorityKey', item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Opis"
          description="Uzupelnij dane problemu widoczne pozniej w szczegolach zgloszenia."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <Field label="Tytul" required>
              <Input
                value={values.title}
                onChange={(event) => updateValue('title', event.target.value)}
                minLength={3}
                maxLength={200}
                className="rounded-none"
                disabled={submitting}
                required
              />
            </Field>

            <Field label="Lokalizacja" required>
              <Input
                value={values.locationText}
                onChange={(event) => updateValue('locationText', event.target.value)}
                minLength={1}
                maxLength={300}
                className="rounded-none"
                disabled={submitting}
                required
              />
            </Field>

            <div className="lg:col-span-2">
              <Field label="Opis usterki" required>
                <textarea
                  value={values.issueDescription}
                  onChange={(event) => updateValue('issueDescription', event.target.value)}
                  minLength={10}
                  maxLength={5000}
                  rows={8}
                  className={`${FIELD_CLASS} min-h-[12rem] resize-y`}
                  disabled={submitting}
                  required
                />
              </Field>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Zalaczniki"
          description="Pliki zapisują się tymczasowo od razu po dodaniu lub usunięciu. Po utworzeniu zgłoszenia zostaną przypięte do rekordu."
        >
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
        </FormSection>

        <div className="flex justify-end">
          <Button type="submit" className="rounded-none" disabled={submitting || lookupsQuery.isLoading}>
            {submitting ? 'Zapisywanie...' : 'Utworz zgloszenie'}
          </Button>
        </div>
      </form>
    </div>
  )
}
