export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getOwnedResume, updateOwnedResume, deleteOwnedResume } from '@/lib/resume-sync'
import { z } from 'zod'

interface Params {
  params: Promise<{ id: string }>
}

const updateResumeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  data: z.unknown().optional(),
  isPublic: z.boolean().optional(),
})

// GET /api/resumes/:id — owner only.
// Public viewing goes through /r/[slug]; other users (and private/nonexistent
// ids) all get the same 404 so existence is never leaked.
export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const resume = await getOwnedResume(id, session.user.id)
  if (!resume) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
  }

  return NextResponse.json({ resume })
}

// PATCH /api/resumes/:id — update title, data, isPublic
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const parsed = updateResumeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const updated = await updateOwnedResume(id, session.user.id, {
    ...(parsed.data.title !== undefined && { title: parsed.data.title }),
    ...(parsed.data.data !== undefined && { data: parsed.data.data as object }),
    ...(parsed.data.isPublic !== undefined && { isPublic: parsed.data.isPublic }),
  })
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ resume: updated })
}

// DELETE /api/resumes/:id
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const deleted = await deleteOwnedResume(id, session.user.id)
  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ message: 'Resume deleted' })
}
