export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-guard'
import { getAdminStats, getUserGrowthData } from '@/lib/analytics'

/**
 * GET /api/admin/stats
 * Returns aggregate platform statistics.
 * Restricted to allowlisted admin emails. ADMIN_EMAILS must be set;
 * if it is missing or empty, all access is denied (fail-closed).
 */
export async function GET() {
  const denied = await requireAdminApi()
  if (denied) return denied

  const [stats, growth] = await Promise.all([
    getAdminStats(),
    getUserGrowthData(30),
  ])

  return NextResponse.json({ stats, growth })
}
