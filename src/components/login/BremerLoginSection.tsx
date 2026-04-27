import type { ReactNode } from 'react'
import BremerAuthPanel from './BremerAuthPanel'

type Props = {
  children?: ReactNode
}

export default function BremerLoginSection({ children }: Props) {
  return (
    <BremerAuthPanel
      title="Portal Klienta BREMER"
      description="Dostep do zgloszen gwarancyjnych, historii spraw i komunikacji projektowej."
      footer={(
        <p className="mb-6 text-xs leading-5 text-muted-foreground/70">
          Nie masz jeszcze konta? Skontaktuj sie ze swoim kierownikiem projektu BREMER.
        </p>
      )}
    >
      {children}
    </BremerAuthPanel>
  )
}
