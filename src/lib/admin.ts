import 'server-only'

/**
 * Admin allowlist policy (pure logic, no I/O).
 *
 * Fail-closed: if ADMIN_EMAILS is missing, empty, or contains only
 * whitespace/commas, NOBODY is an admin.
 */

/** Parse a comma-separated allowlist into trimmed, lowercased, unique emails. */
export function parseAdminAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return []
  const emails = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set(emails))
}

/**
 * Returns true only if `email` is explicitly in the allowlist.
 * The allowlist is read at call time (not module load) so config changes and
 * tests behave predictably.
 */
export function isAdminEmail(
  email: string | null | undefined,
  rawAllowlist: string | undefined | null = process.env.ADMIN_EMAILS,
): boolean {
  if (typeof email !== 'string') return false
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false
  return parseAdminAllowlist(rawAllowlist).includes(normalized)
}

export type AdminAccess = 'ok' | 'unauthenticated' | 'forbidden'

/** Decide admin access from a session-like object. */
export function getAdminAccess(
  session: { user?: { email?: string | null } | null } | null | undefined,
  rawAllowlist: string | undefined | null = process.env.ADMIN_EMAILS,
): AdminAccess {
  const email = session?.user?.email
  if (!email) return 'unauthenticated'
  return isAdminEmail(email, rawAllowlist) ? 'ok' : 'forbidden'
}
