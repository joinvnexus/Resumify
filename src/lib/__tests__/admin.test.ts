import { describe, it, expect } from 'vitest'
import { parseAdminAllowlist, isAdminEmail, getAdminAccess } from '@/lib/admin'

describe('parseAdminAllowlist', () => {
  it('returns [] for undefined, null and empty', () => {
    expect(parseAdminAllowlist(undefined)).toEqual([])
    expect(parseAdminAllowlist(null)).toEqual([])
    expect(parseAdminAllowlist('')).toEqual([])
  })
  it('returns [] for whitespace/commas only', () => {
    expect(parseAdminAllowlist('   ')).toEqual([])
    expect(parseAdminAllowlist(' , ,, ')).toEqual([])
  })
  it('trims, lowercases and dedupes', () => {
    expect(parseAdminAllowlist(' A@x.com , b@X.com,a@x.com ')).toEqual(['a@x.com', 'b@x.com'])
  })
})

describe('isAdminEmail', () => {
  it('denies everyone when allowlist is missing', () => {
    expect(isAdminEmail('a@x.com', undefined)).toBe(false)
  })
  it('denies everyone when allowlist is empty or whitespace', () => {
    expect(isAdminEmail('a@x.com', '')).toBe(false)
    expect(isAdminEmail('a@x.com', '  ')).toBe(false)
    expect(isAdminEmail('a@x.com', ',')).toBe(false)
  })
  it('allows an allowlisted email', () => {
    expect(isAdminEmail('a@x.com', 'a@x.com,b@x.com')).toBe(true)
  })
  it('is case-insensitive on both sides', () => {
    expect(isAdminEmail('A@X.com', 'a@x.com')).toBe(true)
    expect(isAdminEmail('a@x.com', 'A@X.COM')).toBe(true)
  })
  it('tolerates whitespace around entries and the input email', () => {
    expect(isAdminEmail('  a@x.com ', ' a@x.com , b@x.com ')).toBe(true)
  })
  it('denies emails not on the list', () => {
    expect(isAdminEmail('evil@x.com', 'a@x.com,b@x.com')).toBe(false)
  })
  it('does not substring-match', () => {
    expect(isAdminEmail('a@x.com', 'aa@x.com')).toBe(false)
    expect(isAdminEmail('a@x.co', 'a@x.com')).toBe(false)
  })
  it('denies null, undefined and empty emails', () => {
    expect(isAdminEmail(null, 'a@x.com')).toBe(false)
    expect(isAdminEmail(undefined, 'a@x.com')).toBe(false)
    expect(isAdminEmail('', 'a@x.com')).toBe(false)
    expect(isAdminEmail('   ', 'a@x.com')).toBe(false)
  })
  it('reads process.env.ADMIN_EMAILS at call time by default', () => {
    const prev = process.env.ADMIN_EMAILS
    try {
      delete process.env.ADMIN_EMAILS
      expect(isAdminEmail('a@x.com')).toBe(false)
      process.env.ADMIN_EMAILS = 'a@x.com'
      expect(isAdminEmail('a@x.com')).toBe(true)
      process.env.ADMIN_EMAILS = ''
      expect(isAdminEmail('a@x.com')).toBe(false)
    } finally {
      if (prev === undefined) delete process.env.ADMIN_EMAILS
      else process.env.ADMIN_EMAILS = prev
    }
  })
})

describe('getAdminAccess', () => {
  it('unauthenticated when there is no session or email', () => {
    expect(getAdminAccess(null, 'a@x.com')).toBe('unauthenticated')
    expect(getAdminAccess(undefined, 'a@x.com')).toBe('unauthenticated')
    expect(getAdminAccess({ user: null }, 'a@x.com')).toBe('unauthenticated')
    expect(getAdminAccess({ user: { email: null } }, 'a@x.com')).toBe('unauthenticated')
  })
  it('forbidden for authenticated non-admin', () => {
    expect(getAdminAccess({ user: { email: 'u@x.com' } }, 'a@x.com')).toBe('forbidden')
  })
  it('forbidden for everyone when allowlist is missing or empty (fail-closed)', () => {
    expect(getAdminAccess({ user: { email: 'a@x.com' } }, undefined)).toBe('forbidden')
    expect(getAdminAccess({ user: { email: 'a@x.com' } }, '')).toBe('forbidden')
  })
  it('ok for allowlisted admin', () => {
    expect(getAdminAccess({ user: { email: 'A@x.com' } }, ' a@x.com ')).toBe('ok')
  })
})
