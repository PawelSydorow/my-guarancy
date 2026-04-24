"use client"

import { usePathname } from 'next/navigation'
import { AuthFooter } from '@open-mercato/ui'

export function AppAuthFooter() {
  const pathname = usePathname()

  if (pathname === '/login') {
    return null
  }

  return <AuthFooter />
}

export default AppAuthFooter
