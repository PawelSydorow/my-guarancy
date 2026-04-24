"use client"

import Link from 'next/link'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { Notice } from '@open-mercato/ui/primitives/Notice'
import { PortalCard } from '@open-mercato/ui/portal/components/PortalCard'
import { PortalPageHeader } from '@open-mercato/ui/portal/components/PortalPageHeader'
import { WARRANTY_DEFAULT_CREATE_PRIORITY_KEY, WARRANTY_DEFAULT_CREATE_STATUS_KEY } from '../../lib/constants'
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
  projectId: string
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

export default function PortalClaimCreateForm({ orgSlug }: Props) {
  const router = useRouter()
  const [values, setValues] = React.useState<FormValues>({
    title: '',
    issueDescription: '',
    locationText: '',
    priorityKey: WARRANTY_DEFAULT_CREATE_PRIORITY_KEY,
    categoryKey: '',
    projectId: '',
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

      router.push(`/${orgSlug}/portal/warranty-claims/${claimId}`)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Nie udalo sie utworzyc zgloszenia.')
    } finally {
      setSubmitting(false)
    }
  }, [orgSlug, router, values])

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

      <PortalCard className="rounded-none border-border/70">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error ? <Notice variant="error">{error}</Notice> : null}
          {lookupsQuery.isError ? (
            <Notice variant="error">
              {lookupsQuery.error instanceof Error ? lookupsQuery.error.message : 'Nie udalo sie zaladowac formularza.'}
            </Notice>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Field label="Projekt" required>
              <select
                value={values.projectId}
                onChange={(event) => updateValue('projectId', event.target.value)}
                className={FIELD_CLASS}
                disabled={submitting || lookupsQuery.isLoading}
                required
              >
                <option value="">Wybierz projekt</option>
                {(lookupsQuery.data?.projects ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Kategoria" required>
              <select
                value={values.categoryKey}
                onChange={(event) => updateValue('categoryKey', event.target.value)}
                className={FIELD_CLASS}
                disabled={submitting || lookupsQuery.isLoading}
                required
              >
                <option value="">Wybierz kategorie</option>
                {(lookupsQuery.data?.categories ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </Field>

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

            <Field label="Lokalizacja">
              <Input
                value={values.locationText}
                onChange={(event) => updateValue('locationText', event.target.value)}
                maxLength={300}
                className="rounded-none"
                disabled={submitting}
              />
            </Field>
          </div>

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

          <div className="grid gap-4 border-t pt-5 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Status startowy</p>
              <p className="text-sm text-foreground">{WARRANTY_DEFAULT_CREATE_STATUS_KEY}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Data zgloszenia</p>
              <p className="text-sm text-foreground">Nadawana automatycznie przy zapisie</p>
            </div>
            <div className="flex items-end justify-start sm:justify-end">
              <Button type="submit" className="rounded-none" disabled={submitting || lookupsQuery.isLoading}>
                {submitting ? 'Zapisywanie...' : 'Utworz zgloszenie'}
              </Button>
            </div>
          </div>
        </form>
      </PortalCard>
    </div>
  )
}
