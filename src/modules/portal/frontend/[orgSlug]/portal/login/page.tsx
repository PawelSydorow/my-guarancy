"use client"

import { useCallback, useMemo, useState } from 'react'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { Notice } from '@open-mercato/ui/primitives/Notice'
import { Spinner } from '@open-mercato/ui/primitives/spinner'
import { usePortalContext } from '@open-mercato/ui/portal/PortalContext'
import BremerLoginSection from '@/components/login/BremerLoginSection'

type Props = {
  params: { orgSlug: string }
}

export default function PortalLoginPage({ params }: Props) {
  const t = useT()
  const orgSlug = params.orgSlug
  const { tenant } = usePortalContext()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fallbackError = useMemo(
    () => t('portal.login.error.generic', 'Login failed. Please try again.'),
    [t],
  )

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setError(null)

      if (!tenant.tenantId || !tenant.organizationId) {
        setError(t('portal.org.invalid', 'Organization not found.'))
        return
      }

      setSubmitting(true)
      try {
        const result = await apiCall<{ ok: boolean; error?: string }>('/api/customer_accounts/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            tenantId: tenant.tenantId,
          }),
        })

        if (result.ok && result.result?.ok) {
          window.location.assign(`/${orgSlug}/portal/warranty-claims`)
          return
        }

        if (result.status === 423) {
          setError(t('portal.login.error.locked', 'Account locked. Try again later.'))
          return
        }

        if (result.status === 401) {
          setError(t('portal.login.error.invalidCredentials', 'Invalid email or password.'))
          return
        }

        setError(result.result?.error || fallbackError)
      } catch {
        setError(fallbackError)
      } finally {
        setSubmitting(false)
      }
    },
    [email, fallbackError, orgSlug, password, t, tenant.organizationId, tenant.tenantId],
  )

  const isDisabled = submitting || tenant.loading

  return (
    <div>
      <BremerLoginSection>
          {tenant.error ? (
            <Notice variant="error">{t('portal.org.invalid', 'Organization not found.')}</Notice>
          ) : (
            <form className="grid gap-3" onSubmit={handleSubmit} noValidate data-auth-ready>
              {error ? (
                <div
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700"
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </div>
              ) : null}

              <div className="grid gap-1">
                <Label htmlFor="portal-login-email">{t('portal.login.email', 'Email')}</Label>
                <Input
                  id="portal-login-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={t('portal.login.email.placeholder', 'Wpisz adres e-mail')}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isDisabled}
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="portal-login-password">{t('portal.login.password', 'Password')}</Label>
                <Input
                  id="portal-login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder={t('portal.login.password.placeholder', 'Wpisz haslo')}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isDisabled}
                />
              </div>

              <Button type="submit" disabled={isDisabled} className="mt-2 h-10">
                {tenant.loading ? <Spinner className="size-4" /> : submitting ? t('portal.login.submitting', 'Signing in...') : t('portal.login.submit', 'Sign In')}
              </Button>
            </form>
          )}
        </BremerLoginSection>
    </div>
  )
}
