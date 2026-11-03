import { requireAdminPage } from '@/lib/admin-guard'
import Link from 'next/link'
import { FileText, LayoutDashboard, Users } from 'lucide-react'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminPage()

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Admin sidebar */}
      <aside className="hidden lg:flex flex-col w-[200px] min-h-screen border-r border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <Link href="/admin" className="flex items-center gap-2 text-[var(--accent)] no-underline">
            <span className="bg-[var(--accent)] text-white w-7 h-7 rounded-[6px] grid place-items-center">
              <FileText size={13} />
            </span>
            <span className="font-serif font-bold text-[0.95rem]">Admin</span>
          </Link>
        </div>
        <nav className="px-3 py-4 flex flex-col gap-0.5">
          <NavLink href="/admin" icon={<LayoutDashboard size={14} />}>
            Dashboard
          </NavLink>
          <NavLink href="/dashboard" icon={<Users size={14} />}>
            ← User view
          </NavLink>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
          <span className="font-serif font-bold text-[var(--text)]">Admin Dashboard</span>
          <Link href="/dashboard" className="text-sm text-[var(--accent)] hover:underline">
            ← User view
          </Link>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-sm)] text-[0.85rem] font-medium text-[var(--text2)] hover:bg-[var(--surface2)] hover:text-[var(--text)] no-underline transition-colors"
    >
      {icon}
      {children}
    </Link>
  )
}
