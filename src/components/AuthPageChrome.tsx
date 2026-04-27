"use client"

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import BremerBackofficeLoginHero from '@/components/login/BremerBackofficeLoginHero'

function resolveAuthPage(pathname: string | null): '' | 'reset-request' | 'reset-token' {
  if (!pathname) return ''
  if (pathname === '/reset') return 'reset-request'
  if (pathname.startsWith('/reset/')) return 'reset-token'
  return ''
}

export default function AuthPageChrome() {
  const pathname = usePathname()
  const authPage = resolveAuthPage(pathname)

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (authPage) {
      document.body.dataset.bremerAuthPage = authPage
    } else {
      delete document.body.dataset.bremerAuthPage
    }

    return () => {
      delete document.body.dataset.bremerAuthPage
    }
  }, [authPage])

  if (!authPage) return null

  return <BremerBackofficeLoginHero />
}
