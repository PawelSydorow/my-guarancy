import type { ReactNode } from 'react'
import { z } from 'zod'
import type { ComponentOverride } from '@open-mercato/shared/modules/widgets/component-registry'
import { ComponentReplacementHandles } from '@open-mercato/shared/modules/widgets/component-registry'
import BremerLoginSectionWrapper from '@/components/login/BremerLoginSectionWrapper'

type LoginSectionProps = {
  children?: ReactNode
}

export const componentOverrides: ComponentOverride<LoginSectionProps>[] = [
  {
    target: { componentId: ComponentReplacementHandles.section('auth.login', 'form') },
    priority: 100,
    metadata: { module: 'warranty_claims' },
    replacement: BremerLoginSectionWrapper,
    propsSchema: z.object({ children: z.any() }),
  },
]

export default componentOverrides
