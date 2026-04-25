import { modules } from '@/.mercato/generated/modules.app.generated'
import { frontendRoutes } from '@/.mercato/generated/frontend-routes.generated'
import { backendRoutes } from '@/.mercato/generated/backend-routes.generated'
import { apiRoutes } from '@/.mercato/generated/api-routes.generated'
import { StartPageContent } from '@/components/StartPageContent'
import type { Metadata } from 'next'
import { resolveLocalizedAppMetadata } from '@/lib/metadata'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { resolveTranslations } from '@open-mercato/shared/lib/i18n/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { EntityManager } from '@mikro-orm/postgresql'

function FeatureBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
      {label}
    </span>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return resolveLocalizedAppMetadata()
}

const routeCountsByModule = modules.reduce((map, module) => {
  map.set(module.id, { frontend: 0, backend: 0, api: 0 })
  return map
}, new Map<string, { frontend: number; backend: number; api: number }>())

for (const route of frontendRoutes) {
  const entry = routeCountsByModule.get(route.moduleId)
  if (entry) entry.frontend += 1
}

for (const route of backendRoutes) {
  const entry = routeCountsByModule.get(route.moduleId)
  if (entry) entry.backend += 1
}

for (const route of apiRoutes) {
  const entry = routeCountsByModule.get(route.moduleId)
  if (entry) entry.api += route.methods.length
}

export default async function Home() {
  const { t } = await resolveTranslations()

  const cookieStore = await cookies()
  const showStartPageCookie = cookieStore.get('show_start_page')
  const showStartPage = showStartPageCookie?.value !== 'false'

  let dbStatus = t('app.page.dbStatus.unknown', 'Unknown')
  let usersCount = 0
  let tenantsCount = 0
  let orgsCount = 0
  try {
    const container = await createRequestContainer()
    const em = container.resolve<EntityManager>('em')
    usersCount = await em.count('User', {})
    tenantsCount = await em.count('Tenant', {})
    orgsCount = await em.count('Organization', {})
    dbStatus = t('app.page.dbStatus.connected', 'Connected')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : t('app.page.dbStatus.noConnection', 'no connection')
    dbStatus = t('app.page.dbStatus.error', 'Error: {message}', { message })
  }

  const onboardingAvailable =
    process.env.SELF_SERVICE_ONBOARDING_ENABLED === 'true' &&
    Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) &&
    Boolean(process.env.APP_URL && process.env.APP_URL.trim())

  return (
    <main className="min-h-svh w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6">
        <header className="relative overflow-hidden border border-[#01011a] bg-[#01011a] px-6 py-10 text-white sm:px-8 lg:px-10">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[linear-gradient(135deg,rgba(0,103,255,0.82),rgba(252,60,0,0.32))] lg:block" />
          <div className="absolute right-6 top-6 h-24 w-24 border border-white/15 bg-white/5" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div className="max-w-3xl space-y-5">
              <span className="inline-flex items-center border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/75">
                BREMER Polska
              </span>
              <div className="space-y-4">
                <h1 className="max-w-2xl text-white">BREMER Warranty Hub</h1>
                <p className="max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                  Operations workspace for warranty claims, subcontractor coordination, and project follow-up aligned with the BREMER design language.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <Link className="inline-flex min-h-11 items-center border border-primary bg-primary px-5 font-bold text-white transition-colors hover:bg-[#0053cc]" href="/login">
                  {t('app.page.quickLinks.login', 'Login')}
                </Link>
                <Link className="inline-flex min-h-11 items-center border border-white/24 px-5 font-bold text-white transition-colors hover:bg-white/10" href="/backend/warranty-claims">
                  Open claims workspace
                </Link>
              </div>
            </div>
            <div className="relative grid gap-px border border-white/12 bg-white/12 text-sm">
              <div className="grid grid-cols-2 gap-px">
                <div className="bg-white px-4 py-5 text-[#01011a]">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-[#494949]">Status</div>
                  <div className="mt-2 text-xl font-semibold">{dbStatus}</div>
                </div>
                <div className="bg-[#f8f8f8] px-4 py-5 text-[#01011a]">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-[#494949]">Modules</div>
                  <div className="mt-2 text-xl font-semibold">{modules.length}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-px">
                <div className="bg-white/6 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-white/55">{t('app.page.dbStatus.users', 'Users')}</div>
                  <div className="mt-1 font-mono text-lg font-semibold text-white">{usersCount}</div>
                </div>
                <div className="bg-white/6 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-white/55">{t('app.page.dbStatus.tenants', 'Tenants')}</div>
                  <div className="mt-1 font-mono text-lg font-semibold text-white">{tenantsCount}</div>
                </div>
                <div className="bg-white/6 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-white/55">{t('app.page.dbStatus.organizations', 'Organizations')}</div>
                  <div className="mt-1 font-mono text-lg font-semibold text-white">{orgsCount}</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <StartPageContent showStartPage={showStartPage} showOnboardingCta={onboardingAvailable} />

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.9fr)]">
          <div className="border border-border bg-card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">System landscape</div>
                <h2 className="mt-2 text-3xl text-foreground">{t('app.page.activeModules.title', 'Active Modules')}</h2>
              </div>
              <span className="border border-[#d7d8ea] bg-[#f5f5fb] px-3 py-1 text-xs font-medium text-[#3f4052]">
                {modules.length} registered
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {modules.map((m) => {
                const counts = routeCountsByModule.get(m.id) ?? { frontend: 0, backend: 0, api: 0 }
                const fe = counts.frontend
                const be = counts.backend
                const api = counts.api
                const i18n = m.translations ? Object.keys(m.translations).length : 0
                return (
                  <div key={m.id} className="border border-border bg-background p-4 transition-colors hover:border-primary/35">
                    <div className="text-sm font-semibold text-foreground">
                      {m.info?.title || m.id}
                      {m.info?.version ? <span className="ml-2 text-xs font-medium text-muted-foreground">v{m.info.version}</span> : null}
                    </div>
                    {m.info?.description ? <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{m.info.description}</div> : null}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {fe ? <FeatureBadge label={`FE ${fe}`} /> : null}
                      {be ? <FeatureBadge label={`BE ${be}`} /> : null}
                      {api ? <FeatureBadge label={`API ${api}`} /> : null}
                      {i18n ? <FeatureBadge label={`i18n ${i18n}`} /> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <section className="border border-border bg-card p-5 sm:p-6">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Environment</div>
              <h2 className="mt-2 text-3xl text-foreground">{t('app.page.dbStatus.title', 'Database Status')}</h2>
              <div className="mt-5 border border-border bg-muted/50 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{t('app.page.dbStatus.label', 'Status')}</div>
                <div className="mt-2 text-lg font-semibold text-foreground">{dbStatus}</div>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-muted-foreground">{t('app.page.dbStatus.users', 'Users')}</span>
                  <span className="font-mono font-semibold text-foreground">{usersCount}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-muted-foreground">{t('app.page.dbStatus.tenants', 'Tenants')}</span>
                  <span className="font-mono font-semibold text-foreground">{tenantsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('app.page.dbStatus.organizations', 'Organizations')}</span>
                  <span className="font-mono font-semibold text-foreground">{orgsCount}</span>
                </div>
              </div>
            </section>

            <section className="border border-border bg-card p-5 sm:p-6">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Navigation</div>
              <h2 className="mt-2 text-3xl text-foreground">{t('app.page.quickLinks.title', 'Quick Links')}</h2>
              <div className="mt-5 flex flex-col gap-2 text-sm">
                <Link className="border border-border px-4 py-3 transition-colors hover:border-primary hover:text-primary" href="/login">{t('app.page.quickLinks.login', 'Login')}</Link>
                <Link className="border border-border px-4 py-3 transition-colors hover:border-primary hover:text-primary" href="/backend/warranty-claims">Warranty claims board</Link>
                <Link className="border border-border px-4 py-3 transition-colors hover:border-primary hover:text-primary" href="/backend/warranty-claims-new">Create new claim</Link>
                <Link className="border border-border px-4 py-3 transition-colors hover:border-primary hover:text-primary" href="/example">{t('app.page.quickLinks.examplePage', 'Example Page')}</Link>
              </div>
            </section>
          </aside>
        </section>

        <footer className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
          BREMER Warranty Hub. Built on Next.js, MikroORM, and Awilix.
        </footer>
      </div>
    </main>
  )
}
