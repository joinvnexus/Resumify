import 'server-only'

import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getAdminAccess } from '@/lib/admin'

/**
 * For admin pages / layouts (Server Components).
 * - not signed in        -> /auth/login
 * - signed in, not admin -> /dashboard
 * Missing/empty ADMIN_EMAILS denies everyone.
 * `redirect()` never returns when access is denied.
 */
export async function requireAdminPage(): Promise<void> {
  const session = await auth()
  const access = getAdminAccess(session)
  if (access === 'unauthenticated') redirect('/auth/login')
  if (access === 'forbidden') redirect('/dashboard')
}

/**
 * For admin API route handlers.
 * Returns a NextResponse (401 / 403) to return early, or null if allowed.
 *
 *   const denied = await requireAdminApi()
 *   if (denied) return denied
 */
export async function requireAdminApi(): Promise<NextResponse | null> {
  const session = await auth()
  const access = getAdminAccess(session)
  if (access === 'unauthenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (access === 'forbidden') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}
