/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Minimal in-memory stand-in for the Prisma client, used by ownership/IDOR
 * tests. It honours `where` filters (equality on every key given), so code
 * that forgets to scope by userId will genuinely leak data in tests.
 */

type Row = Record<string, any>
type Where = Record<string, unknown>

function matches(row: Row, where: Where = {}): boolean {
  return Object.entries(where).every(([k, v]) => row[k] === v)
}

function applyData(row: Row, data: Row) {
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && 'increment' in (v as object)) {
      row[k] = (row[k] ?? 0) + (v as { increment: number }).increment
    } else {
      row[k] = v
    }
  }
  if ('updatedAt' in row) row.updatedAt = new Date()
}

function pick(row: Row | undefined, select?: Record<string, boolean>) {
  if (!row) return row
  if (!select) return { ...row }
  return Object.fromEntries(Object.keys(select).filter((k) => select[k]).map((k) => [k, row[k]]))
}

function notFound() {
  return Object.assign(new Error('Record not found'), { code: 'P2025' })
}

let seq = 0

function table(rows: Row[]) {
  return {
    findFirst: async ({ where, select }: { where?: Where; select?: Record<string, boolean> } = {}) =>
      pick(rows.find((r) => matches(r, where)), select) ?? null,
    findUnique: async ({ where, select }: { where: Where; select?: Record<string, boolean> }) =>
      pick(rows.find((r) => matches(r, where)), select) ?? null,
    findMany: async ({ where }: { where?: Where } = {}) =>
      rows.filter((r) => matches(r, where)).map((r) => ({ ...r })),
    count: async ({ where }: { where?: Where } = {}) => rows.filter((r) => matches(r, where)).length,
    create: async ({ data, select }: { data: Row; select?: Record<string, boolean> }) => {
      const row = { id: `gen-${++seq}`, createdAt: new Date(), updatedAt: new Date(), ...data }
      rows.push(row)
      return pick(row, select)
    },
    update: async ({ where, data, select }: { where: Where; data: Row; select?: Record<string, boolean> }) => {
      const row = rows.find((r) => matches(r, where))
      if (!row) throw notFound()
      applyData(row, data)
      return pick(row, select)
    },
    updateMany: async ({ where, data }: { where?: Where; data: Row }) => {
      const hit = rows.filter((r) => matches(r, where))
      hit.forEach((r) => applyData(r, data))
      return { count: hit.length }
    },
    delete: async ({ where }: { where: Where }) => {
      const i = rows.findIndex((r) => matches(r, where))
      if (i === -1) throw notFound()
      return rows.splice(i, 1)[0]
    },
  }
}

export const store = {
  resume: [] as Row[],
  resumeView: [] as Row[],
  atsScoreHistory: [] as Row[],
}

type Table = ReturnType<typeof table>
interface FakeDb {
  resume: Table
  resumeView: Table
  atsScoreHistory: Table
  $transaction: <T>(fn: (tx: FakeDb) => Promise<T>) => Promise<T>
}

export const fakeDb: FakeDb = {
  resume: table(store.resume),
  resumeView: table(store.resumeView),
  atsScoreHistory: table(store.atsScoreHistory),
  $transaction: async (fn) => fn(fakeDb),
}

export function seedTwoUsers() {
  store.resume.length = 0
  store.resumeView.length = 0
  store.atsScoreHistory.length = 0
  const base = { viewCount: 0, createdAt: new Date(), updatedAt: new Date() }
  store.resume.push(
    { ...base, id: 'a-private', userId: 'user-a', title: 'A private', slug: 'a-priv-slug', isPublic: false, data: { personal: { fname: 'Alice' } } },
    { ...base, id: 'a-public', userId: 'user-a', title: 'A public', slug: 'a-pub-slug', isPublic: true, data: { personal: { fname: 'Alice' } } },
    { ...base, id: 'b-private', userId: 'user-b', title: 'B private', slug: 'b-priv-slug', isPublic: false, data: { personal: { fname: 'Bob' } } },
  )
}
