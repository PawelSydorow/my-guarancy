import type { ReactNode } from 'react'
import BremerBackofficeLoginSection from './BremerBackofficeLoginSection'

type Props = {
  children?: ReactNode
}

export default function BremerLoginSectionWrapper({ children }: Props) {
  return <BremerBackofficeLoginSection>{children}</BremerBackofficeLoginSection>
}
