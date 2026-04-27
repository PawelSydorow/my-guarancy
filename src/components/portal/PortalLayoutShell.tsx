"use client"

import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as LucideIcons from 'lucide-react'
import type { CustomerAuthContext } from '@open-mercato/shared/modules/customer-auth'
import type { InjectionMenuItem } from '@open-mercato/shared/modules/widgets/injection'
import { useT, type TranslateFn } from '@open-mercato/shared/lib/i18n/context'
import { cn } from '@open-mercato/shared/lib/utils'
import { PortalProvider, usePortalContext } from '@open-mercato/ui/portal/PortalContext'
import { PortalNotificationBell } from '@open-mercato/ui/portal/components/PortalNotificationBell'
import { usePortalInjectedMenuItems } from '@open-mercato/ui/portal/hooks/usePortalInjectedMenuItems'
import { usePortalEventBridge } from '@open-mercato/ui/portal/hooks/usePortalEventBridge'
import { mergeMenuItems, type MergedMenuItem } from '@open-mercato/ui/backend/injection/mergeMenuItems'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { Button } from '@open-mercato/ui/primitives/button'
import { IconButton } from '@open-mercato/ui/primitives/icon-button'

type PortalLayoutShellProps = {
  children: ReactNode
  orgSlug: string
  organizationName: string | null
  tenantId: string | null
  organizationId: string | null
  authenticated: boolean
  userName: string | null
  userEmail: string | null
  customerAuth: CustomerAuthContext | null
}

type PortalNavEntry = {
  id: string
  label: string
  labelKey?: string
  href: string
  icon?: string
  order: number
}

type PortalNavGroupData = {
  id: 'main' | 'account'
  items: PortalNavEntry[]
}

type PortalMergedNavSeed = {
  id: string
  label?: string
  labelKey?: string
  href?: string
  icon?: string
}

const ICONS = LucideIcons as unknown as Record<string, ComponentType<{ className?: string }>>

function normalizeIconName(icon?: string): string | null {
  if (!icon) return null
  const raw = icon.startsWith('lucide:') ? icon.slice('lucide:'.length) : icon
  const pascal = raw
    .split(/[-_:]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return pascal.length > 0 ? pascal : null
}

function resolveIcon(icon?: string): ComponentType<{ className?: string }> | null {
  const iconName = normalizeIconName(icon)
  if (!iconName) return null
  return ICONS[iconName] ?? null
}

function normalizePathname(pathname: string): string {
  if (!pathname) return '/'
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed.length > 0 ? trimmed : '/'
}

function getMenuItemMatchScore(pathname: string, href?: string): number {
  if (!href) return -1

  const normalizedPathname = normalizePathname(pathname)
  const normalizedHref = normalizePathname(href)

  if (normalizedPathname === normalizedHref) return normalizedHref.length
  if (normalizedPathname.startsWith(`${normalizedHref}/`)) return normalizedHref.length

  return -1
}

function resolveActiveMenuHref(items: Array<{ href?: string }>, pathname: string): string | null {
  let bestHref: string | null = null
  let bestScore = -1

  for (const item of items) {
    const score = getMenuItemMatchScore(pathname, item.href)
    if (score > bestScore) {
      bestScore = score
      bestHref = item.href ?? null
    }
  }

  return bestHref
}

function applyInjectedMenuOverrides(
  builtIn: PortalMergedNavSeed[],
  injected: InjectionMenuItem[],
): PortalMergedNavSeed[] {
  return builtIn.map((item) => {
    const override = injected.find((candidate) => candidate.id === item.id || (candidate.href && candidate.href === item.href))
    if (!override) return item

    return {
      ...item,
      label: override.label ?? item.label,
      labelKey: override.labelKey ?? item.labelKey,
      icon: override.icon ?? item.icon,
    }
  })
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 3v18" />
    </svg>
  )
}

function UserAvatar({ name, className }: { name?: string; className?: string }) {
  const initials = name
    ? name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className={cn('flex items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary ring-1 ring-inset ring-primary/20', className ?? 'size-8')}>
      {initials}
    </div>
  )
}

function useOptionalPortalContext() {
  try {
    return usePortalContext()
  } catch {
    return null
  }
}

function PortalEventBridgeMount() {
  usePortalEventBridge()
  return null
}

function SidebarIcon({
  icon,
  active,
}: {
  icon?: string
  active: boolean
}) {
  const Icon = resolveIcon(icon)
  if (!Icon) {
    return (
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center transition-colors',
          active
            ? 'text-white'
            : 'text-primary group-hover:text-primary',
        )}
      >
        <span className="size-2 rounded-full bg-current" />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'flex size-7 shrink-0 items-center justify-center transition-colors',
        active
          ? 'text-white'
          : 'text-primary group-hover:text-primary',
      )}
    >
      <Icon className="size-4.5" />
    </span>
  )
}

function SidebarNavItem({
  item,
  active,
  t,
  onClick,
}: {
  item: MergedMenuItem | InjectionMenuItem
  active: boolean
  t: (key: string, fallback?: string) => string
  onClick?: () => void
}) {
  const label = item.labelKey ? t(item.labelKey, item.label) : item.label
  if (!label) return null

  const cls = cn(
    'group relative flex w-full items-center gap-2 overflow-hidden border px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
    active
      ? 'rounded-md border-primary bg-primary text-white shadow-sm shadow-primary/15'
      : 'rounded-xl border-transparent text-slate-950 hover:bg-slate-100 hover:text-slate-950',
  )

  const content = (
    <>
      <SidebarIcon icon={item.icon} active={active} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {item.badge != null ? (
        <span
          className={cn(
            'ml-auto inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
            active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700',
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </>
  )

  if (item.href) {
    return (
      <Link href={item.href} className={cls} data-menu-item-id={item.id} onClick={onClick}>
        {content}
      </Link>
    )
  }

  if (item.onClick) {
    return (
      <button type="button" className={cls} data-menu-item-id={item.id} onClick={() => { item.onClick?.(); onClick?.() }}>
        {content}
      </button>
    )
  }

  return null
}

function ShellFrame({
  sidebar,
  headerTitle,
  portalHome,
  loginHref,
  authenticated,
  mobileOpen,
  setMobileOpen,
  children,
  t,
}: {
  sidebar: ReactNode
  headerTitle: string
  portalHome: string
  loginHref: string
  authenticated: boolean
  mobileOpen: boolean
  setMobileOpen: (value: boolean) => void
  children: ReactNode
  t: TranslateFn
}) {
  const pathname = usePathname()
  const isPortalLoginPage = pathname.endsWith('/portal/login')

  if (!authenticated) {
    if (isPortalLoginPage) {
      return (
        <div className="min-h-svh bg-background text-foreground" data-customer-portal-shell="public-auth">
          {children}
        </div>
      )
    }

    return (
      <div className="flex min-h-svh flex-col bg-slate-50 text-foreground" data-customer-portal-shell="public">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="mx-auto flex h-16 w-full max-w-screen-lg items-center justify-between px-6">
            <Link href={portalHome} className="flex items-center gap-2.5 text-foreground transition hover:opacity-80" aria-label={headerTitle}>
              <Image src="/open-mercato.svg" alt="" width={28} height={28} priority />
              <span className="text-[15px] font-semibold tracking-tight">{headerTitle}</span>
            </Link>
            <nav aria-label="Primary" className="flex items-center gap-1">
              <Button asChild variant="ghost" size="sm" className="text-[13px]">
                <Link href={loginHref}>{t('portal.nav.login', 'Log In')}</Link>
              </Button>
            </nav>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-8 px-6 py-12 sm:py-20">
            {children}
          </div>
        </main>

        <footer className="border-t border-slate-200/80 bg-white/80">
          <div className="mx-auto flex w-full max-w-screen-lg items-center justify-between px-6 py-6">
            <Link href={portalHome} className="flex items-center gap-2 text-muted-foreground transition hover:text-foreground">
              <Image src="/open-mercato.svg" alt="" width={20} height={20} />
              <span className="text-sm font-medium text-foreground">{headerTitle}</span>
            </Link>
            <p className="text-xs text-muted-foreground/60">
              {t('portal.footer.copyright', 'Copyright {year} All rights reserved.', { year: new Date().getFullYear() })}
            </p>
          </div>
        </footer>
      </div>
    )
  }

  return (
      <div className="flex min-h-svh bg-slate-50" data-customer-portal-shell="authenticated">
      <aside className="hidden w-[288px] shrink-0 border-r border-slate-200 bg-slate-100 lg:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 h-full w-[288px] border-r border-slate-200 bg-slate-100 shadow-2xl">
            <div className="absolute right-3 top-3 z-20">
              <IconButton variant="ghost" size="sm" type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                <XIcon className="size-4" />
              </IconButton>
            </div>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 lg:px-8">
          <div className="flex items-center gap-3">
            <IconButton
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setMobileOpen(true)}
              className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
              aria-label="Open menu"
            >
              <MenuIcon className="size-5" />
            </IconButton>
          </div>
          <div className="flex items-center gap-3">
            <PortalNotificationBell t={t} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-slate-50/80 px-4 py-4 lg:px-8">
          <p className="text-[11px] text-muted-foreground/50">
            {t('portal.footer.copyright', 'Copyright {year} All rights reserved.', { year: new Date().getFullYear() })}
          </p>
        </footer>
      </div>
    </div>
  )
}

export function PortalLayoutShell({
  children,
  orgSlug,
  organizationName,
  tenantId,
  organizationId,
  authenticated,
  userName,
  userEmail,
  customerAuth,
}: PortalLayoutShellProps) {
  return (
    <PortalProvider
      orgSlug={orgSlug}
      initialAuth={customerAuth}
      initialTenant={{
        tenantId: tenantId ?? undefined,
        organizationId: organizationId ?? undefined,
        organizationName: organizationName ?? undefined,
      }}
    >
      <PortalShellFrame
        authenticated={authenticated}
        orgSlug={orgSlug}
        organizationName={organizationName ?? undefined}
        userName={userName ?? undefined}
        userEmail={userEmail ?? undefined}
        enableEventBridge={authenticated}
      >
        {children}
      </PortalShellFrame>
    </PortalProvider>
  )
}

function PortalShellFrame({
  children,
  authenticated,
  orgSlug,
  organizationName,
  userName,
  userEmail,
  enableEventBridge,
}: {
  children: ReactNode
  authenticated: boolean
  orgSlug: string
  organizationName?: string
  userName?: string
  userEmail?: string
  enableEventBridge: boolean
}) {
  const t = useT()
  const pathname = usePathname()
  const portalCtx = useOptionalPortalContext()
  const [mobileOpen, setMobileOpen] = useState(false)

  const resolvedOrgSlug = portalCtx?.orgSlug ?? orgSlug
  const resolvedOrgName = portalCtx?.tenant.organizationName ?? organizationName
  const resolvedUser = portalCtx?.auth.user ?? null
  const resolvedAuthenticated = authenticated && !!resolvedUser
  const logout = portalCtx?.auth.logout ?? (async () => {})

  const portalHome = resolvedOrgSlug ? `/${resolvedOrgSlug}/portal` : '/portal'
  const loginHref = resolvedOrgSlug ? `/${resolvedOrgSlug}/portal/login` : '/portal/login'
  const headerTitle = resolvedOrgName || t('portal.title', 'Customer Portal')
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  const { items: injectedMainItems } = usePortalInjectedMenuItems('menu:portal:sidebar:main')

  const [autoNavGroups, setAutoNavGroups] = useState<PortalNavGroupData[]>([])

  useEffect(() => {
    if (!resolvedAuthenticated) {
      setAutoNavGroups([])
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const { ok, result } = await apiCall<{ ok: boolean; groups?: PortalNavGroupData[] }>(
          '/api/customer_accounts/portal/nav',
        )
        if (cancelled || !ok || !result?.ok) return
        setAutoNavGroups(Array.isArray(result.groups) ? result.groups : [])
      } catch {
        if (!cancelled) setAutoNavGroups([])
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [resolvedAuthenticated])

  const mergedNavItems = useMemo(() => {
    if (!resolvedAuthenticated) return []
    const discovered = autoNavGroups.find((group) => group.id === 'main')?.items ?? []
    const builtIn = discovered.map((item) => ({
      id: item.id,
      labelKey: item.labelKey,
      label: item.label,
      href: item.href,
      icon: item.icon,
    }))
    const overriddenBuiltIn = applyInjectedMenuOverrides(builtIn, injectedMainItems)
    return mergeMenuItems(overriddenBuiltIn, injectedMainItems)
  }, [resolvedAuthenticated, autoNavGroups, injectedMainItems])

  const activeMenuHref = useMemo(
    () => resolveActiveMenuHref(mergedNavItems, pathname),
    [mergedNavItems, pathname],
  )

  const sidebar = (
    <div className="flex h-full flex-col px-4 py-4" data-customer-portal-sidebar>
      <div className="flex h-16 items-center justify-center px-2">
        <Link href={portalHome} className="text-slate-900 transition hover:opacity-90" aria-label={headerTitle}>
          <div className="flex items-center justify-center">
            <span className="text-[var(--login-primary)] text-3xl font-black uppercase tracking-[-0.06em]">BREMER</span>
            <div className="mx-3 h-6 w-px bg-border/30" aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-[0.32em] text-muted-foreground">POLSKA</span>
          </div>
        </Link>
      </div>

      <div className="mx-2 h-px shrink-0 bg-slate-200/80" aria-hidden="true" />

      <nav aria-label="Portal navigation" className="flex-1 overflow-y-auto py-5">
        <div className="space-y-1">
          {mergedNavItems.map((item) => (
            <SidebarNavItem
              key={item.id}
              item={item}
              active={item.href != null && item.href === activeMenuHref}
              t={t}
              onClick={closeMobile}
            />
          ))}
        </div>

      </nav>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3 px-1 py-1.5">
          <UserAvatar name={userName} className="size-9" />
          <div className="min-w-0 flex-1">
            {userName ? (
              <p className="truncate text-[13px] font-medium leading-tight text-slate-900">{userName}</p>
            ) : (
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            )}
            {userEmail ? (
              <p className="truncate text-[11px] text-slate-500">{userEmail}</p>
            ) : (
              <div className="mt-1 h-3 w-32 animate-pulse rounded bg-slate-200" />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => { void logout() }}
          className="group mt-2 flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:border-primary/20 hover:bg-primary/10 hover:text-primary"
          data-menu-item-id="portal-logout"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <LogOutIcon className="size-4" />
          </span>
          <span className="truncate">
            {t('portal.nav.logout', 'Log Out')}
          </span>
        </button>
      </div>
    </div>
  )

  return (
    <ShellFrame
      sidebar={sidebar}
      headerTitle={headerTitle}
      portalHome={portalHome}
      loginHref={loginHref}
      authenticated={resolvedAuthenticated}
      mobileOpen={mobileOpen}
      setMobileOpen={setMobileOpen}
      t={t}
    >
      {enableEventBridge ? <PortalEventBridgeMount /> : null}
      {children}
    </ShellFrame>
  )
}

export default PortalLayoutShell
