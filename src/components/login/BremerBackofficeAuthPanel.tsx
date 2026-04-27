'use client'

import { type ReactNode } from 'react'
import BremerBackofficeLoginHero from './BremerBackofficeLoginHero'

type Props = {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
  hero?: ReactNode
  badge?: string
}

export default function BremerBackofficeAuthPanel({ title, description, children, footer, hero, badge }: Props) {
  return (
    <div className="flex min-h-svh">
      <div
        className="hidden lg:block lg:w-1/2 shrink-0"
        style={{ backgroundImage: 'url("/login-bg-backend.jpg")', backgroundSize: 'cover', backgroundPosition: '35% 58%' }}
      >
        {hero ?? <BremerBackofficeLoginHero />}
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-16 font-[var(--font-inter),var(--font-sans)]">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-10">
            <header className="flex flex-col gap-8">
              <div className="flex items-center">
                <span className="text-[var(--login-primary)] text-3xl font-black uppercase tracking-[-0.06em]">
                  BREMER
                </span>
                <div className="mx-3 h-6 w-px bg-border/30" aria-hidden="true" />
                <span className="text-xs font-medium uppercase tracking-[0.32em] text-muted-foreground">
                  {badge ?? 'POLSKA'}
                </span>
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
                <p className="text-sm font-medium text-muted-foreground">{description}</p>
              </div>
            </header>

            {children}

            <footer className="border-t border-border/20 pt-8">
              {footer ?? null}
              <div className="flex flex-wrap gap-6 text-xs font-semibold tracking-[0.16em] text-muted-foreground">
                <a href="/support" className="transition-colors hover:text-[var(--login-primary)]">WSPARCIE</a>
                <a href="/privacy" className="transition-colors hover:text-[var(--login-primary)]">PRYWATNOSC</a>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
