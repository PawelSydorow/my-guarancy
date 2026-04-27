'use client'

import React, { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Shield, Users, Briefcase, Info, Rocket, ArrowRight, BookOpen } from 'lucide-react'
import { getApiDocsResources, resolveApiDocsBaseUrl } from '@open-mercato/core/modules/api_docs/lib/resources'
import Link from 'next/link'
import { useT } from '@open-mercato/shared/lib/i18n/context'

interface RoleTileProps {
  icon: ReactNode
  title: string
  description: string
  features: string[]
  loginUrl: string
  variant?: 'default' | 'secondary' | 'outline'
  disabled?: boolean
  disabledCtaLabel?: string
  disabledMessage?: ReactNode
}

function RoleTile({
  icon,
  title,
  description,
  features,
  loginUrl,
  variant = 'default',
  disabled = false,
  disabledCtaLabel,
  disabledMessage,
}: RoleTileProps) {
  const t = useT()
  const defaultDisabledCtaLabel = t('startPage.roleTile.loginUnavailable', 'Login unavailable')

  return (
    <article className="group flex h-full flex-col justify-between border border-border bg-card p-6 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_0.75rem_1.5rem_rgba(1,1,26,0.12)]">
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="flex size-14 items-center justify-center border border-primary/20 bg-primary/8 text-primary">
            {icon}
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">{title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {t('startPage.roleTile.availableFeatures', 'Available Features:')}
          </div>
          <ul className="space-y-2">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm leading-6 text-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {disabled ? (
          <>
            <Button variant="outline" className="w-full cursor-not-allowed opacity-80" disabled>
              {disabledCtaLabel ?? defaultDisabledCtaLabel}
            </Button>
            {disabledMessage ? (
              <p className="text-xs leading-6 text-muted-foreground">
                {disabledMessage}
              </p>
            ) : null}
          </>
        ) : (
          <Button asChild variant={variant} className="w-full justify-between">
            <Link href={loginUrl}>
              <span>{t('startPage.roleTile.loginAs', 'Login as {title}', { title })}</span>
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </article>
  )
}

interface StartPageContentProps {
  showStartPage: boolean
  showOnboardingCta?: boolean
}

export function StartPageContent({ showStartPage: initialShowStartPage, showOnboardingCta = false }: StartPageContentProps) {
  const t = useT()
  const [showStartPage, setShowStartPage] = useState(initialShowStartPage)

  const superAdminDisabled = showOnboardingCta
  const apiDocs = getApiDocsResources()
  const baseUrl = resolveApiDocsBaseUrl()

  const handleCheckboxChange = (checked: boolean) => {
    setShowStartPage(checked)
    document.cookie = `show_start_page=${checked}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`
  }

  return (
    <>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.8fr)]">
        <div className="relative overflow-hidden border border-border bg-card px-6 py-8 sm:px-8">
          <div className="absolute inset-y-0 right-0 hidden w-40 bg-[linear-gradient(180deg,rgba(0,103,255,0.12),rgba(252,60,0,0.12))] sm:block" />
          <div className="relative max-w-3xl space-y-5">
            <span className="inline-flex items-center border border-[#d7d8ea] bg-[#f5f5fb] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#3f4052]">
              Warranty operations
            </span>
            <div className="space-y-3">
              <h2 className="text-foreground">{t('startPage.welcome.title', 'Welcome to Your Open Mercato Installation')}</h2>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Centralize claim intake, assign project responsibility quickly, and keep BREMER teams aligned around one operational flow.
              </p>
            </div>
          </div>
        </div>

        <div className="border border-border bg-[#01011a] p-6 text-white">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">Current focus</div>
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-sm text-white/55">Core workflow</div>
              <div className="mt-1 text-lg font-semibold">Claims, projects, and subcontractors</div>
            </div>
            <div>
              <div className="text-sm text-white/55">Design direction</div>
              <div className="mt-1 text-lg font-semibold">Sharp edges, dark surfaces, blue and orange action accents</div>
            </div>
            <div>
              <div className="text-sm text-white/55">Base URL</div>
              <code className="mt-1 block break-all border border-white/12 bg-white/6 px-3 py-2 text-xs text-white/82">{baseUrl}</code>
            </div>
          </div>
        </div>
      </section>

      {showOnboardingCta ? (
        <section className="border border-primary/25 bg-[linear-gradient(135deg,rgba(0,103,255,0.08),rgba(215,216,234,0.4))] p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center border border-primary bg-primary text-white">
                <Rocket className="size-6" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-foreground">{t('startPage.onboarding.title', 'Launch your own workspace')}</h3>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                  {t('startPage.onboarding.description', 'Create a tenant, organization, and administrator account in minutes. We\'ll verify your email and deliver a pre-seeded environment so you can explore Open Mercato with real data.')}
                </p>
                <ul className="space-y-1 text-sm text-foreground">
                  <li>{t('startPage.onboarding.feature1', 'Automatic tenant and sample data provisioning')}</li>
                  <li>{t('startPage.onboarding.feature2', 'Ready-to-use superadmin credentials after verification')}</li>
                </ul>
              </div>
            </div>
            <Button asChild className="min-w-56 justify-between px-6">
              <Link href="/onboarding">
                <span>{t('startPage.onboarding.cta', 'Start onboarding')}</span>
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      <section className="border border-[#d7d8ea] bg-[#f5f5fb] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">{t('startPage.defaultPassword.title', 'Default Password')}</h3>
            <p className="mt-1 text-sm leading-7 text-[#3f4052]">
              {t('startPage.defaultPassword.description1', 'The default password for all demo accounts is')}{' '}
              <code className="border border-primary/15 bg-white px-1.5 py-0.5 font-mono text-xs text-foreground">secret</code>.
              {' '}{t('startPage.defaultPassword.description2', 'To change passwords, use the CLI command:')}{' '}
              <code className="border border-primary/15 bg-white px-1.5 py-0.5 font-mono text-xs text-foreground">yarn mercato auth set-password --email &lt;email&gt; --password &lt;newPassword&gt;</code>
              <span className="mt-1 block">{t('startPage.defaultPassword.description3', 'Demo account emails are printed in the terminal output during yarn initialize.')}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Access paths</div>
            <h2 className="mt-2 text-foreground">{t('startPage.chooseRole.title', 'Choose Your Role')}</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <RoleTile
            icon={<Shield className="size-6" />}
            title={t('startPage.roles.superAdmin.title', 'Super Admin')}
            description={t('startPage.roles.superAdmin.description', 'Full system access with complete control')}
            features={[
              t('startPage.roles.superAdmin.feature1', 'Manage organization structure'),
              t('startPage.roles.superAdmin.feature2', 'Create and manage roles'),
              t('startPage.roles.superAdmin.feature3', 'Manage all users across organizations'),
              t('startPage.roles.superAdmin.feature4', 'System-wide configuration'),
              t('startPage.roles.superAdmin.feature5', 'Access to all modules and features'),
            ]}
            loginUrl="/login?role=superadmin"
            disabled={superAdminDisabled}
            disabledCtaLabel={t('startPage.roles.superAdmin.disabledCta', 'Superadmin login disabled')}
            disabledMessage={
              <>
                {t('startPage.roles.superAdmin.disabledMessage1', 'Superadmin demo access is not enabled on this instance.')}{' '}
                {t('startPage.roles.superAdmin.disabledMessage2', 'Install Open Mercato locally for full access via')}{' '}
                <a
                  href="https://github.com/open-mercato"
                  target="_blank"
                  rel="noreferrer"
                  className="underline transition-colors hover:text-primary"
                >
                  github.com/open-mercato
                </a>
                .
              </>
            }
          />

          <RoleTile
            icon={<Users className="size-6" />}
            title={t('startPage.roles.admin.title', 'Admin')}
            description={t('startPage.roles.admin.description', 'Organization-level administration')}
            features={[
              t('startPage.roles.admin.feature1', 'Admin specific organization(s)'),
              t('startPage.roles.admin.feature2', 'Manage users within organization'),
              t('startPage.roles.admin.feature3', 'Configure organization settings'),
              t('startPage.roles.admin.feature4', 'Access to admin modules'),
              t('startPage.roles.admin.feature5', 'Report and analytics access'),
            ]}
            loginUrl="/login?role=admin"
            variant="secondary"
          />

          <RoleTile
            icon={<Briefcase className="size-6" />}
            title={t('startPage.roles.employee.title', 'Employee')}
            description={t('startPage.roles.employee.description', 'Work on your daily tasks')}
            features={[
              t('startPage.roles.employee.feature1', 'Work on assigned tasks'),
              t('startPage.roles.employee.feature2', 'Access organization resources'),
              t('startPage.roles.employee.feature3', 'Collaborate with team members'),
              t('startPage.roles.employee.feature4', 'View personal dashboard'),
              t('startPage.roles.employee.feature5', 'Submit reports and updates'),
            ]}
            loginUrl="/login?role=employee"
            variant="outline"
          />
        </div>
      </section>

      <section className="border border-border bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-11 items-center justify-center border border-primary/20 bg-primary/8 text-primary">
              <BookOpen className="size-5" />
            </span>
            <div>
              <h2 className="text-2xl font-semibold text-foreground">{t('startPage.apiResources.title', 'API resources')}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t('startPage.apiResources.description', 'Explore the official documentation and download the generated OpenAPI exports for this installation.')}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {apiDocs.map((resource) => (
            <a
              key={resource.href}
              href={resource.href}
              target={resource.external ? '_blank' : undefined}
              rel={resource.external ? 'noreferrer' : undefined}
              className="border border-border bg-background p-4 text-sm transition-colors hover:border-primary/35"
            >
              <div className="font-semibold text-foreground">{resource.label}</div>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">{resource.description}</p>
              <span className="mt-4 inline-flex text-xs font-bold uppercase tracking-[0.14em] text-primary">
                {resource.actionLabel ?? t('startPage.apiResources.openLink', 'Open link')}
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center gap-3 border border-border bg-card px-4 py-4">
        <Checkbox
          id="show-start-page"
          checked={showStartPage}
          onCheckedChange={handleCheckboxChange}
        />
        <label
          htmlFor="show-start-page"
          className="cursor-pointer text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {t('startPage.showNextTime', 'Display this start page next time')}
        </label>
      </section>
    </>
  )
}
