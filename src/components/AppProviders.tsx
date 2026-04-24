"use client"

import type { ReactNode } from 'react'
import type { Locale } from '@open-mercato/shared/lib/i18n/config'
import type { Dict } from '@open-mercato/shared/lib/i18n/context'
import { I18nProvider } from '@open-mercato/shared/lib/i18n/context'
import { ThemeProvider, FrontendLayout, QueryProvider } from '@open-mercato/ui'
import { ClientBootstrapProvider } from '@/components/ClientBootstrap'
import { AppAuthFooter } from '@/components/AppAuthFooter'
import { GlobalNoticeBars } from '@/components/GlobalNoticeBars'
import { ComponentOverridesBootstrap } from '@/components/ComponentOverridesBootstrap'
import AuthPageChrome from '@/components/AuthPageChrome'

type AppProvidersProps = {
  children: ReactNode
  locale: Locale
  dict: Dict
  demoModeEnabled: boolean
  noticeBarsEnabled: boolean
}

export function AppProviders({ children, locale, dict, demoModeEnabled, noticeBarsEnabled }: AppProvidersProps) {
  return (
    <I18nProvider locale={locale} dict={dict}>
      <ClientBootstrapProvider>
        <ComponentOverridesBootstrap>
          <ThemeProvider>
            <QueryProvider>
              <AuthPageChrome />
              <FrontendLayout footer={<AppAuthFooter />}>{children}</FrontendLayout>
              {noticeBarsEnabled ? <GlobalNoticeBars demoModeEnabled={demoModeEnabled} /> : null}
            </QueryProvider>
          </ThemeProvider>
        </ComponentOverridesBootstrap>
      </ClientBootstrapProvider>
    </I18nProvider>
  )
}
