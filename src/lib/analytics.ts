/**
 * Server-side analytics helpers.
 *
 * Covers:
 * - Recording resume view events (with referrer / country)
 * - Recording ATS score history
 * - Querying per-user stats for the dashboard
 * - Querying admin-level aggregate stats
 */

import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

// ─── Record events ────────────────────────────────────────────

/**
 * Records a view event for a public resume.
 * Does nothing (and writes nothing) if the resume doesn't exist or isn't
 * public, so private/unknown ids can't be used to create analytics rows.
 * Also increments the denormalized viewCount on the Resume row.
 * Call from the /api/resumes/[id]/view endpoint.
 */
export async function recordResumeView(
  resumeId: string,
  options: { referrer?: string; country?: string } = {},
): Promise<boolean> {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const { count } = await tx.resume.updateMany({
      where: { id: resumeId, isPublic: true },
      data: { viewCount: { increment: 1 } },
    })
    if (count === 0) return false

    await tx.resumeView.create({
      data: {
        resumeId,
        referrer: options.referrer?.slice(0, 200) ?? null,
        country: options.country ?? null,
      },
    })
    return true
  })
}

/**
 * Records an ATS score snapshot for a resume the user owns.
 * Returns false (and writes nothing) if the resume doesn't exist or belongs
 * to another user.
 */
export async function recordAtsScore(
  userId: string,
  resumeId: string,
  score: number,
): Promise<boolean> {
  const owned = await db.resume.findFirst({
    where: { id: resumeId, userId },
    select: { id: true },
  })
  if (!owned) return false

  await db.atsScoreHistory.create({
    data: { userId, resumeId, score },
  })
  return true
}

// ─── User dashboard queries ───────────────────────────────────

export interface ResumeAnalyticsSummary {
  resumeId: string
  title: string
  slug: string
  isPublic: boolean
  totalViews: number
  last30DayViews: number
  latestAtsScore: number | null
  viewsPerDay: { date: string; views: number }[]
}

/**
 * Returns analytics summary for all of a user's resumes.
 */
export async function getUserResumeAnalytics(
  userId: string,
): Promise<ResumeAnalyticsSummary[]> {
  const resumes = await db.resume.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      slug: true,
      isPublic: true,
      viewCount: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const results = await Promise.all(
    resumes.map(async (resume: {
      id: string
      title: string
      slug: string
      isPublic: boolean
      viewCount: number
    }) => {
      // Views in last 30 days (only for public resumes)
      const [recentViews, atsHistory] = await Promise.all([
        resume.isPublic
          ? db.resumeView.findMany({
              where: { resumeId: resume.id, viewedAt: { gte: thirtyDaysAgo } },
              select: { viewedAt: true },
              orderBy: { viewedAt: 'asc' },
            })
          : Promise.resolve([]),
        db.atsScoreHistory.findFirst({
          where: { resumeId: resume.id, userId },
          orderBy: { createdAt: 'desc' },
          select: { score: true },
        }),
      ])

      // Group views by date (YYYY-MM-DD)
      const viewsByDate = new Map<string, number>()
      for (const view of recentViews) {
        const date = view.viewedAt.toISOString().slice(0, 10)
        viewsByDate.set(date, (viewsByDate.get(date) ?? 0) + 1)
      }

      // Build last-30-days array with zero-fill
      const viewsPerDay: { date: string; views: number }[] = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const date = d.toISOString().slice(0, 10)
        viewsPerDay.push({ date, views: viewsByDate.get(date) ?? 0 })
      }

      return {
        resumeId: resume.id,
        title: resume.title,
        slug: resume.slug,
        isPublic: resume.isPublic,
        totalViews: resume.viewCount,
        last30DayViews: recentViews.length,
        latestAtsScore: atsHistory?.score ?? null,
        viewsPerDay,
      }
    }),
  )

  return results
}

export interface AtsScorePoint {
  date: string
  score: number
  resumeId: string
}

/**
 * Returns ATS score history for a user's resume (last 90 days).
 */
export async function getAtsScoreHistory(
  userId: string,
  resumeId: string,
  days = 90,
): Promise<AtsScorePoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const records = await db.atsScoreHistory.findMany({
    where: { userId, resumeId, createdAt: { gte: since } },
    orderBy: { createdAt: 'asc' },
    select: { score: true, createdAt: true, resumeId: true },
  })

  return records.map((r: { score: number; createdAt: Date; resumeId: string }) => ({
    date: r.createdAt.toISOString().slice(0, 10),
    score: r.score,
    resumeId: r.resumeId,
  }))
}

// ─── Admin aggregate stats ────────────────────────────────────

export interface AdminStats {
  totalUsers: number
  proUsers: number
  freeUsers: number
  totalResumes: number
  publicResumes: number
  totalViews: number
  totalAiCalls: number
  newUsersLast7Days: number
  newUsersLast30Days: number
  conversionRate: number  // pro / total * 100
}

/**
 * Admin-only: aggregate platform statistics.
 * Cache this result — do NOT call on every request.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    proUsers,
    totalResumes,
    publicResumes,
    totalViews,
    totalAiCalls,
    newUsers7,
    newUsers30,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { plan: 'PRO' } }),
    db.resume.count(),
    db.resume.count({ where: { isPublic: true } }),
    db.resumeView.count(),
    db.aiUsage.count(),
    db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
  ])

  return {
    totalUsers,
    proUsers,
    freeUsers: totalUsers - proUsers,
    totalResumes,
    publicResumes,
    totalViews,
    totalAiCalls,
    newUsersLast7Days: newUsers7,
    newUsersLast30Days: newUsers30,
    conversionRate: totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0,
  }
}

/**
 * Returns daily new-user counts for the last N days (for a chart).
 */
export async function getUserGrowthData(
  days = 30,
): Promise<{ date: string; users: number }[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const users = await db.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const byDate = new Map<string, number>()
  for (const u of users) {
    const date = u.createdAt.toISOString().slice(0, 10)
    byDate.set(date, (byDate.get(date) ?? 0) + 1)
  }

  const result: { date: string; users: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const date = d.toISOString().slice(0, 10)
    result.push({ date, users: byDate.get(date) ?? 0 })
  }

  return result
}
