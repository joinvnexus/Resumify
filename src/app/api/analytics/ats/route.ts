export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { recordAtsScore } from '@/lib/analytics'

/**
 * POST /api/analytics/ats
 * Body: { resumeId: string, score: number }
 * Records an ATS score snapshot for history tracking.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { resumeId?: string; score?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.resumeId || typeof body.score !== 'number') {
    return NextResponse.json(
      { error: 'Missing resumeId or score' },
      { status: 400 },
    )
  }

  if (body.score < 0 || body.score > 100) {
    return NextResponse.json({ error: 'Score must be 0–100' }, { status: 400 })
  }

  const recorded = await recordAtsScore(session.user.id, body.resumeId, body.score)
  if (!recorded) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
