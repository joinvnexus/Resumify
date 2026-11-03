/**
 * Server-side helpers for syncing resume data with the database.
 * Import only in Server Components, API routes, and server actions.
 */

import { db } from '@/lib/db'
import { DEFAULT_RESUME_STATE } from '@/lib/constants'
import { generateSlug } from '@/utils'
import type { ResumeState } from '@/types'

// ─── Types ────────────────────────────────────────────────────

/** Full resume row. Owner-only: never return this to anyone but the owner. */
export interface DbResume {
  id: string
  title: string
  slug: string
  isPublic: boolean
  viewCount: number
  data: ResumeState
  createdAt: Date
  updatedAt: Date
  userId: string
}

/**
 * What a public (share-link) visitor may see.
 * Deliberately excludes userId and any ownership/internal fields.
 */
export interface PublicResume {
  id: string
  title: string
  slug: string
  viewCount: number
  data: ResumeState
}

/** Prisma "record to update/delete not found" (P2025) without importing Prisma types. */
export function isRecordNotFound(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2025'
}

// ─── Read ─────────────────────────────────────────────────────

/**
 * Load a resume owned by `userId`.
 * Returns null if it doesn't exist OR belongs to someone else (callers must
 * treat both identically, e.g. 404, so existence is never leaked).
 * Public resumes are NOT readable through this function by non-owners —
 * use getResumeBySlug for public viewing.
 */
export async function getOwnedResume(
  id: string,
  userId: string,
): Promise<DbResume | null> {
  const resume = await db.resume.findFirst({ where: { id, userId } })
  if (!resume) return null

  return {
    ...resume,
    data: (resume.data as unknown as ResumeState) ?? DEFAULT_RESUME_STATE,
  }
}

/**
 * Load a resume by its public share slug.
 * Only returns public resumes, and only public-safe fields.
 */
export async function getResumeBySlug(slug: string): Promise<PublicResume | null> {
  const resume = await db.resume.findFirst({
    where: { slug, isPublic: true },
    select: { id: true, title: true, slug: true, viewCount: true, data: true },
  })
  if (!resume) return null
  return {
    id: resume.id,
    title: resume.title,
    slug: resume.slug,
    viewCount: resume.viewCount,
    data: (resume.data as unknown as ResumeState) ?? DEFAULT_RESUME_STATE,
  }
}

/**
 * List all resumes for a user, newest first.
 */
export async function listResumesForUser(userId: string) {
  return db.resume.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      isPublic: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

// ─── Write ────────────────────────────────────────────────────

/**
 * Persist resume state to the database.
 * Also updates the title from personal.fname + personal.lname if provided.
 *
 * Accepts partial data — any fields omitted from `data` are merged from
 * the existing stored value, so clients can send only changed fields
 * (e.g. to avoid re-uploading unchanged base64 photo data).
 */
export async function saveResumeData(
  id: string,
  userId: string,
  data: Partial<ResumeState>,
  titleOverride?: string,
): Promise<{ id: string; updatedAt: Date } | null> {
  const resume = await db.resume.findFirst({
    where: { id, userId },
    select: { data: true },
  })
  if (!resume) return null

  // Merge incoming partial data with existing stored state
  const existingData = (resume.data as unknown as ResumeState) ?? DEFAULT_RESUME_STATE
  const mergedData = { ...existingData, ...data }

  // Auto-derive title from name fields when no override given
  const autoTitle =
    titleOverride ??
    ([mergedData.personal?.fname, mergedData.personal?.lname].filter(Boolean).join(' ') || 'Untitled Resume')

  try {
    return await db.resume.update({
      where: { id, userId },
      data: { data: mergedData as object, title: autoTitle },
      select: { id: true, updatedAt: true },
    })
  } catch (err) {
    if (isRecordNotFound(err)) return null
    throw err
  }
}

/**
 * Duplicate a resume for the same user.
 * Enforces the 3-resume free-plan limit.
 */
export async function duplicateResume(
  sourceId: string,
  userId: string,
  isPro: boolean,
): Promise<
  { id: string; title: string } | { error: string; code: 'NOT_FOUND' | 'LIMIT_REACHED' }
> {
  const source = await db.resume.findFirst({ where: { id: sourceId, userId } })
  if (!source) return { error: 'Not found', code: 'NOT_FOUND' }

  if (!isPro) {
    const count = await db.resume.count({ where: { userId } })
    if (count >= 3) {
      return { error: 'Free plan allows up to 3 resumes. Upgrade to Pro.', code: 'LIMIT_REACHED' }
    }
  }

  const copy = await db.resume.create({
    data: {
      userId,
      title: `${source.title} (copy)`,
      slug: generateSlug(),
      data: source.data ?? {},
    },
    select: { id: true, title: true },
  })

  return copy
}

/**
 * Toggle the public/private status of a resume.
 */
export async function toggleResumePublic(
  id: string,
  userId: string,
): Promise<{ isPublic: boolean; slug: string } | null> {
  const resume = await db.resume.findFirst({
    where: { id, userId },
    select: { isPublic: true },
  })
  if (!resume) return null

  try {
    return await db.resume.update({
      where: { id, userId },
      data: { isPublic: !resume.isPublic },
      select: { isPublic: true, slug: true },
    })
  } catch (err) {
    if (isRecordNotFound(err)) return null
    throw err
  }
}

/**
 * Update a resume owned by `userId`. Returns null if not found / not owned.
 */
export async function updateOwnedResume(
  id: string,
  userId: string,
  data: { title?: string; data?: object; isPublic?: boolean },
) {
  try {
    return await db.resume.update({
      where: { id, userId },
      data,
      select: { id: true, title: true, slug: true, isPublic: true, updatedAt: true },
    })
  } catch (err) {
    if (isRecordNotFound(err)) return null
    throw err
  }
}

/**
 * Delete a resume owned by `userId`. Returns false if not found / not owned.
 */
export async function deleteOwnedResume(id: string, userId: string): Promise<boolean> {
  try {
    await db.resume.delete({ where: { id, userId } })
    return true
  } catch (err) {
    if (isRecordNotFound(err)) return false
    throw err
  }
}
