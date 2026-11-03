import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const authMock = vi.fn()
vi.mock('@/lib/auth', () => ({ auth: () => authMock() }))

// Mimic Next's redirect(): it throws and never returns.
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))

import { requireAdminApi, requireAdminPage } from '@/lib/admin-guard'

const ORIGINAL = process.env.ADMIN_EMAILS

beforeEach(() => {
  authMock.mockReset()
})
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.ADMIN_EMAILS
  else process.env.ADMIN_EMAILS = ORIGINAL
})

describe('requireAdminApi', () => {
  it('401 when unauthenticated', async () => {
    process.env.ADMIN_EMAILS = 'a@x.com'
    authMock.mockResolvedValue(null)
    const res = await requireAdminApi()
    expect(res?.status).toBe(401)
  })

  it('403 for authenticated non-admin', async () => {
    process.env.ADMIN_EMAILS = 'a@x.com'
    authMock.mockResolvedValue({ user: { email: 'u@x.com' } })
    const res = await requireAdminApi()
    expect(res?.status).toBe(403)
  })

  it('403 for any user when ADMIN_EMAILS is unset', async () => {
    delete process.env.ADMIN_EMAILS
    authMock.mockResolvedValue({ user: { email: 'a@x.com' } })
    expect((await requireAdminApi())?.status).toBe(403)
  })

  it('403 for any user when ADMIN_EMAILS is empty or whitespace', async () => {
    authMock.mockResolvedValue({ user: { email: 'a@x.com' } })
    process.env.ADMIN_EMAILS = ''
    expect((await requireAdminApi())?.status).toBe(403)
    process.env.ADMIN_EMAILS = '   '
    expect((await requireAdminApi())?.status).toBe(403)
  })

  it('null (allowed) for allowlisted admin, case/whitespace-insensitive', async () => {
    process.env.ADMIN_EMAILS = ' Admin@X.com '
    authMock.mockResolvedValue({ user: { email: 'admin@x.com' } })
    expect(await requireAdminApi()).toBeNull()
  })
})

describe('requireAdminPage', () => {
  it('redirects unauthenticated users to /auth/login', async () => {
    process.env.ADMIN_EMAILS = 'a@x.com'
    authMock.mockResolvedValue(null)
    await expect(requireAdminPage()).rejects.toThrow('NEXT_REDIRECT:/auth/login')
  })

  it('redirects non-admins to /dashboard', async () => {
    process.env.ADMIN_EMAILS = 'a@x.com'
    authMock.mockResolvedValue({ user: { email: 'u@x.com' } })
    await expect(requireAdminPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard')
  })

  it('redirects everyone to /dashboard when ADMIN_EMAILS is unset', async () => {
    delete process.env.ADMIN_EMAILS
    authMock.mockResolvedValue({ user: { email: 'a@x.com' } })
    await expect(requireAdminPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard')
  })

  it('resolves for allowlisted admin', async () => {
    process.env.ADMIN_EMAILS = 'a@x.com'
    authMock.mockResolvedValue({ user: { email: 'A@x.com' } })
    await expect(requireAdminPage()).resolves.toBeUndefined()
  })
})
