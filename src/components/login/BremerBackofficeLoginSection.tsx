import type { ReactNode } from 'react'
import BremerBackofficeAuthPanel from './BremerBackofficeAuthPanel'

type Props = {
  children?: ReactNode
}

export default function BremerBackofficeLoginSection({ children }: Props) {
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
      {children}
    </BremerBackofficeAuthPanel>
  )
}
