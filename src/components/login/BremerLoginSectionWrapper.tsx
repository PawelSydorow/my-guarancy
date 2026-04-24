import type { ReactNode } from 'react'
import BremerLoginSection from './BremerLoginSection'

type Props = {
  children?: ReactNode
}

export default function BremerLoginSectionWrapper({ children }: Props) {
  return <BremerLoginSection>{children}</BremerLoginSection>
}
