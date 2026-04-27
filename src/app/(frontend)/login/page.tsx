'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { translateWithFallback } from '@open-mercato/shared/lib/i18n/translate'
import { clearAllOperations } from '@open-mercato/ui/backend/operations/store'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { InjectionSpot } from '@open-mercato/ui/backend/injection/InjectionSpot'
import { X } from 'lucide-react'
import BremerBackofficeAuthPanel from '@/components/login/BremerBackofficeAuthPanel'

const loginTenantKey = 'om_login_tenant'
const loginTenantCookieMaxAge = 60 * 60 * 24 * 14

function readTenantCookie(): string | null {
  if (typeof document === 'undefined') return null
  for (const entry of document.cookie.split(';')) {
    const [name, ...rest] = entry.trim().split('=')
    if (name === loginTenantKey) return decodeURIComponent(rest.join('='))
  }
  return null
}

function setTenantCookie(value: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${loginTenantKey}=${encodeURIComponent(value)}; path=/; max-age=${loginTenantCookieMaxAge}; samesite=lax`
}

function clearTenantCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${loginTenantKey}=; path=/; max-age=0; samesite=lax`
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload) return null
  if (typeof payload === 'string') return payload
  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const resolved = extractErrorMessage(entry)
      if (resolved) return resolved
    }
    return null
  }
  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    for (const key of ['error', 'message', 'detail', 'details', 'description']) {
      const resolved = extractErrorMessage(record[key])
      if (resolved) return resolved
    }
  }
  return null
}

function looksLikeJsonString(value: string) {
  const trimmed = value.trim()
  return trimmed.startsWith('{') || trimmed.startsWith('[')
}

export default function BackofficeLoginPage() {
  const t = useT()
  const translate = useCallback(
    (key: string, fallback: string, params?: Record<string, string>) =>
      translateWithFallback(t, key, fallback, params),
    [t],
  )
  const router = useRouter()
  const searchParams = useSearchParams()

  const requireRole = (searchParams.get('requireRole') || searchParams.get('role') || '').trim()
  const requireFeature = (searchParams.get('requireFeature') || '').trim()
  const requiredRoles = requireRole ? requireRole.split(',').map((v) => v.trim()).filter(Boolean) : []
  const requiredFeatures = requireFeature ? requireFeature.split(',').map((v) => v.trim()).filter(Boolean) : []
  const translatedRoles = requiredRoles.map((role) => translate(`auth.roles.${role}`, role))
  const translatedFeatures = requiredFeatures.map((feature) => translate(`features.${feature}`, feature))

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [clientReady, setClientReady] = useState(false)
  const [email, setEmail] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState<string | null>(null)
  const [tenantLoading, setTenantLoading] = useState(false)
  const [tenantInvalid, setTenantInvalid] = useState<string | null>(null)
  const showTenantInvalid = tenantId != null && tenantInvalid === tenantId

  useEffect(() => {
    setClientReady(true)
  }, [])

  useEffect(() => {
    const tenantParam = (searchParams.get('tenant') || '').trim()
    if (tenantParam) {
      setTenantId(tenantParam)
      window.localStorage.setItem(loginTenantKey, tenantParam)
      setTenantCookie(tenantParam)
      return
    }
    const storedTenant = window.localStorage.getItem(loginTenantKey) || readTenantCookie()
    if (storedTenant) setTenantId(storedTenant)
  }, [searchParams])

  useEffect(() => {
    if (!tenantId) {
      setTenantName(null)
      setTenantInvalid(null)
      return
    }
    if (tenantInvalid === tenantId) {
      setTenantName(null)
      setTenantLoading(false)
      return
    }
    let active = true
    setTenantLoading(true)
    setTenantInvalid(null)
    apiCall<{ ok: boolean; tenant?: { name: string } }>(
      `/api/directory/tenants/lookup?tenantId=${encodeURIComponent(tenantId)}`,
    ).then(({ result }) => {
      if (!active) return
      if (result?.ok && result.tenant) {
        setTenantName(result.tenant.name)
        return
      }
      setTenantName(null)
      setTenantInvalid(tenantId)
      setError(null)
    }).catch(() => {
      if (!active) return
      setTenantName(null)
      setTenantInvalid(tenantId)
      setError(null)
    }).finally(() => {
      if (active) setTenantLoading(false)
    })
    return () => { active = false }
  }, [tenantId, translate])

  function handleClearTenant() {
    window.localStorage.removeItem(loginTenantKey)
    clearTenantCookie()
    setTenantId(null)
    setTenantName(null)
    setTenantInvalid(null)
    const params = new URLSearchParams(searchParams)
    params.delete('tenant')
    setError(null)
    const query = params.toString()
    router.replace(query ? `/login?${query}` : '/login')
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!clientReady) return
    setError(null)
    setSubmitting(true)
    try {
      const form = new FormData(e.currentTarget)
      if (requiredRoles.length) form.set('requireRole', requiredRoles.join(','))
      const redirectParam = searchParams.get('redirect')
      if (redirectParam) form.set('redirect', redirectParam)
      const res = await fetch('/api/auth/login', { method: 'POST', body: form })
      if (res.redirected) {
        clearAllOperations()
        router.replace(res.url)
        return
      }
      if (!res.ok) {
        const fallback = (() => {
          if (res.status === 403) return translate('auth.login.errors.permissionDenied', 'You do not have permission to access this area. Please contact your administrator.')
          if (res.status === 401 || res.status === 400) return translate('auth.login.errors.invalidCredentials', 'Invalid email or password')
          return translate('auth.login.errors.generic', 'An error occurred. Please try again.')
        })()
        const cloned = res.clone()
        let errorMessage = ''
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          try {
            const data = await res.json()
            errorMessage = extractErrorMessage(data) || ''
          } catch {
            try {
              const text = await cloned.text()
              const trimmed = text.trim()
              if (trimmed && !looksLikeJsonString(trimmed)) errorMessage = trimmed
            } catch { errorMessage = '' }
          }
        } else {
          try {
            const text = await res.text()
            const trimmed = text.trim()
            if (trimmed && !looksLikeJsonString(trimmed)) errorMessage = trimmed
          } catch { errorMessage = '' }
        }
        setError(errorMessage || fallback)
        return
      }
      const data = await res.json().catch(() => null)
      clearAllOperations()
      if (data && typeof data.redirect === 'string' && data.redirect.length > 0) {
        router.replace(data.redirect)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setError(message || translate('auth.login.errors.generic', 'An error occurred. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const loginFormContext = useMemo(() => ({
    email,
    tenantId,
    searchParams,
    setAuthOverride: () => {},
    setAuthOverridePending: () => {},
    setError,
  }), [email, tenantId, searchParams])

  return (
    <BremerBackofficeAuthPanel
      title="Backoffice BREMER"
      description="Panel administracyjny dla zespolu wewnetrznego, obslugi procesow i nadzoru operacyjnego."
      footer={(
        <p className="mb-6 text-xs leading-5 text-muted-foreground/70">
          Dostep przeznaczony wylacznie dla pracownikow i uprawnionych administratorow.
        </p>
      )}
    >
      <form className="grid gap-3" onSubmit={onSubmit} noValidate data-auth-ready={clientReady ? '1' : '0'}>
        {tenantId ? <input type="hidden" name="tenantId" value={tenantId} /> : null}

        {!!translatedRoles.length && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs text-blue-800">
            {translate(
              translatedRoles.length > 1 ? 'auth.login.requireRolesMessage' : 'auth.login.requireRoleMessage',
              translatedRoles.length > 1 ? 'Access requires one of the following roles: {roles}' : 'Access requires role: {roles}',
              { roles: translatedRoles.join(', ') },
            )}
          </div>
        )}

        {!!translatedFeatures.length && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs text-blue-800">
            {translate('auth.login.featureDenied', "You don't have access to this feature ({feature}). Please contact your administrator.", {
              feature: translatedFeatures.join(', '),
            })}
          </div>
        )}

        {showTenantInvalid ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-700">
            <div className="font-medium">{translate('auth.login.errors.tenantInvalid', 'Tenant not found. Clear the tenant selection and try again.')}</div>
            <Button type="button" variant="outline" size="sm" className="mt-2 border-red-300 text-red-700" onClick={handleClearTenant}>
              <X className="mr-2 size-4" aria-hidden="true" />
              {translate('auth.login.tenantClear', 'Clear')}
            </Button>
          </div>
        ) : tenantId ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-900">
            <div className="font-medium">
              {tenantLoading
                ? translate('auth.login.tenantLoading', 'Loading tenant details...')
                : translate('auth.login.tenantBanner', "You're logging in to {tenant} tenant.", { tenant: tenantName || tenantId })}
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-2 border-emerald-300 text-emerald-900" onClick={handleClearTenant}>
              <X className="mr-2 size-4" aria-hidden="true" />
              {translate('auth.login.tenantClear', 'Clear')}
            </Button>
          </div>
        ) : null}

        {error && !showTenantInvalid && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <div className="grid gap-1">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            aria-invalid={!!error}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={(e) => setEmail(e.target.value)}
          />
        </div>

        <InjectionSpot spotId="auth.login:form" context={loginFormContext} />

        <div className="grid gap-1">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <Input id="password" name="password" type="password" required aria-invalid={!!error} />
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" name="remember" className="accent-foreground" />
          <span>{translate('auth.login.rememberMe', 'Remember me')}</span>
        </label>

        <Button type="submit" disabled={submitting || !clientReady} className="h-10 mt-2">
          {submitting ? translate('auth.login.loading', 'Loading...') : translate('auth.signIn', 'Sign in')}
        </Button>

        <div className="text-xs text-muted-foreground mt-2">
          <Link className="underline" href="/reset">
            {translate('auth.login.forgotPassword', 'Forgot password?')}
          </Link>
        </div>
      </form>
    </BremerBackofficeAuthPanel>
  )
}
