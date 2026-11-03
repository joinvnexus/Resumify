import { requireAdminPage } from '@/lib/admin-guard'
import { getAdminStats, getUserGrowthData } from '@/lib/analytics'
import { AdminDashboard } from '@/components/analytics/AdminDashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin — Resumify' }

export default async function AdminPage() {
  await requireAdminPage()

  const [stats, growth] = await Promise.all([
    getAdminStats(),
    getUserGrowthData(30),
  ])

  return <AdminDashboard stats={stats} growth={growth} />
}

