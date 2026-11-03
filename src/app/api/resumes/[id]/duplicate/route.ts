export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { duplicateResume } from '@/lib/resume-sync'

interface Params {
  params: Promise<{ id: string }>
}

/**
 * POST /api/resumes/:id/duplicate
 * Creates a copy of the resume for the same user.
 */
export async function POST(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const isPro =
    session.user.plan === 'PRO' || session.user.plan === 'ENTERPRISE'

  const result = await duplicateResume(id, session.user.id, isPro)

  if ('error' in result) {
    // Not found / not owned -> 404 (never reveal existence); plan limit -> 403
    const status = result.code === 'NOT_FOUND' ? 404 : 403
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ resume: result }, { status: 201 })
}
