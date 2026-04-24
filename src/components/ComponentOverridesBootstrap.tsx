'use client'

import * as React from 'react'
import { componentOverrideEntries } from '@/.mercato/generated/component-overrides.generated'
import { registerComponentOverrides } from '@open-mercato/shared/modules/widgets/component-registry'
import { ComponentOverrideProvider } from '@open-mercato/ui/backend/injection/ComponentOverrideProvider'

export function ComponentOverridesBootstrap({ children }: { children: React.ReactNode }) {
  const overrides = React.useMemo(
    () => componentOverrideEntries.flatMap((entry) => entry.componentOverrides ?? []),
    [],
  )

  if (typeof window !== 'undefined') {
    registerComponentOverrides(overrides)
  }

  return (
    <ComponentOverrideProvider overrides={overrides}>
      {children}
    </ComponentOverrideProvider>
  )
}

export default ComponentOverridesBootstrap
