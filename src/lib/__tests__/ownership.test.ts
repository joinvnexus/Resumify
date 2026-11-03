import { describe, it, expect, vi, beforeEach } from 'vitest'

const authMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: () => authMock() }))
vi.mock('@/lib/db', async () => {
  const m = await import('@/__mocks__/fake-db')
  return { db: m.fakeDb }
})

import { store, seedTwoUsers } from '@/__mocks__/fake-db'
import * as resumeRoute from '@/app/api/resumes/[id]/route'
import * as saveRoute from '@/app/api/resumes/[id]/save/route'
import * as duplicateRoute from '@/app/api/resumes/[id]/duplicate/route'
import * as visibilityRoute from '@/app/api/resumes/[id]/visibility/route'
import * as viewRoute from '@/app/api/resumes/[id]/view/route'
import * as atsRoute from '@/app/api/analytics/ats/route'
import { getOwnedResume, getResumeBySlug } from '@/lib/resume-sync'

const asUser = (id: string | null) =>
  authMock.mockResolvedValue(id ? { user: { id, plan: 'PRO', email: `${id}@x.com` } } : null)

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const json = (body: unknown) =>
  new Request('http://t/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
const resume = (id: string) => store.resume.find((r) => r.id === id)

beforeEach(() => {
  authMock.mockReset()
  seedTwoUsers()
})

describe('IDOR: user B attacking user A\'s resumes', () => {
  beforeEach(() => asUser('user-b'))

  it.each(['a-private', 'a-public'])('GET /api/resumes/%s -> 404 (no data, no existence leak)', async (id) => {
    const res = await resumeRoute.GET(new Request('http://t'), ctx(id))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: 'Resume not found' })
  })

  it('GET of a nonexistent id looks identical to another user\'s private id', async () => {
    const a = await resumeRoute.GET(new Request('http://t'), ctx('a-private'))
    const b = await resumeRoute.GET(new Request('http://t'), ctx('does-not-exist'))
    expect(a.status).toBe(b.status)
    expect(await a.json()).toEqual(await b.json())
  })

  it.each(['a-private', 'a-public'])('PATCH /api/resumes/%s -> 404 and nothing changes', async (id) => {
    const before = structuredClone(resume(id))
    const res = await resumeRoute.PATCH(json({ title: 'pwned', isPublic: true }), ctx(id))
    expect(res.status).toBe(404)
    expect(resume(id)).toEqual(before)
  })

  it.each(['a-private', 'a-public'])('DELETE /api/resumes/%s -> 404 and resume survives', async (id) => {
    const res = await resumeRoute.DELETE(new Request('http://t'), ctx(id))
    expect(res.status).toBe(404)
    expect(resume(id)).toBeDefined()
  })

  it('POST save -> 404 and data/title unchanged', async () => {
    const before = structuredClone(resume('a-private'))
    const res = await saveRoute.POST(json({ data: { about: 'pwned' }, title: 'pwned' }), ctx('a-private'))
    expect(res.status).toBe(404)
    expect(resume('a-private')).toEqual(before)
  })

  it('POST duplicate -> 404 (not 403) and no copy is created', async () => {
    const count = store.resume.length
    const res = await duplicateRoute.POST(new Request('http://t', { method: 'POST' }), ctx('a-public'))
    expect(res.status).toBe(404)
    expect(store.resume.length).toBe(count)
  })

  it('PATCH visibility -> 404 and isPublic unchanged', async () => {
    const res = await visibilityRoute.PATCH(new Request('http://t', { method: 'PATCH' }), ctx('a-private'))
    expect(res.status).toBe(404)
    expect(resume('a-private')!.isPublic).toBe(false)
  })

  it('POST /api/analytics/ats for A\'s resume -> 404 and no history row', async () => {
    const res = await atsRoute.POST(json({ resumeId: 'a-private', score: 90 }))
    expect(res.status).toBe(404)
    expect(store.atsScoreHistory).toHaveLength(0)
  })

  it('getOwnedResume never returns another user\'s resume, even if public (builder page)', async () => {
    expect(await getOwnedResume('a-public', 'user-b')).toBeNull()
    expect(await getOwnedResume('a-private', 'user-b')).toBeNull()
  })
})

describe('unauthenticated requests -> 401', () => {
  beforeEach(() => asUser(null))

  it('all owner-only endpoints reject', async () => {
    const r = new Request('http://t', { method: 'POST' })
    const results = await Promise.all([
      resumeRoute.GET(r, ctx('a-public')),
      resumeRoute.PATCH(json({ title: 'x' }), ctx('a-public')),
      resumeRoute.DELETE(r, ctx('a-public')),
      saveRoute.POST(json({ data: {} }), ctx('a-public')),
      duplicateRoute.POST(r, ctx('a-public')),
      visibilityRoute.PATCH(r, ctx('a-public')),
      atsRoute.POST(json({ resumeId: 'a-public', score: 1 })),
    ])
    expect(results.map((x) => x.status)).toEqual([401, 401, 401, 401, 401, 401, 401])
    expect(store.resume).toHaveLength(3)
  })
})

describe('owner (user A) still works', () => {
  beforeEach(() => asUser('user-a'))

  it('GET returns own private resume', async () => {
    const res = await resumeRoute.GET(new Request('http://t'), ctx('a-private'))
    expect(res.status).toBe(200)
    expect((await res.json()).resume.id).toBe('a-private')
  })

  it('PATCH updates own resume', async () => {
    const res = await resumeRoute.PATCH(json({ title: 'New title' }), ctx('a-private'))
    expect(res.status).toBe(200)
    expect(resume('a-private')!.title).toBe('New title')
  })

  it('save merges partial data for own resume', async () => {
    const res = await saveRoute.POST(json({ data: { about: 'hello' } }), ctx('a-private'))
    expect(res.status).toBe(200)
    expect(resume('a-private')!.data).toMatchObject({ about: 'hello', personal: { fname: 'Alice' } })
  })

  it('duplicate creates a copy owned by A', async () => {
    const res = await duplicateRoute.POST(new Request('http://t', { method: 'POST' }), ctx('a-private'))
    expect(res.status).toBe(201)
    expect(store.resume.filter((r) => r.userId === 'user-a')).toHaveLength(3)
  })

  it('visibility toggles own resume', async () => {
    const res = await visibilityRoute.PATCH(new Request('http://t', { method: 'PATCH' }), ctx('a-private'))
    expect(res.status).toBe(200)
    expect(resume('a-private')!.isPublic).toBe(true)
  })

  it('DELETE removes own resume', async () => {
    const res = await resumeRoute.DELETE(new Request('http://t'), ctx('a-private'))
    expect(res.status).toBe(200)
    expect(resume('a-private')).toBeUndefined()
  })

  it('records ATS score for own resume', async () => {
    const res = await atsRoute.POST(json({ resumeId: 'a-private', score: 77 }))
    expect(res.status).toBe(200)
    expect(store.atsScoreHistory).toEqual([expect.objectContaining({ userId: 'user-a', resumeId: 'a-private', score: 77 })])
  })
})

describe('public resume exposure', () => {
  it('getResumeBySlug returns only public-safe fields for public resumes', async () => {
    const pub = await getResumeBySlug('a-pub-slug')
    expect(pub).not.toBeNull()
    expect(Object.keys(pub!).sort()).toEqual(['data', 'id', 'slug', 'title', 'viewCount'])
    expect(pub).not.toHaveProperty('userId')
    expect(pub).not.toHaveProperty('isPublic')
  })

  it('getResumeBySlug returns null for private resumes and unknown slugs', async () => {
    expect(await getResumeBySlug('a-priv-slug')).toBeNull()
    expect(await getResumeBySlug('nope')).toBeNull()
  })
})

describe('view tracking (no auth)', () => {
  const post = (id: string) => viewRoute.POST(new Request('http://t', { method: 'POST' }), ctx(id))

  it('records a view for a public resume', async () => {
    expect((await post('a-public')).status).toBe(200)
    expect(store.resumeView).toHaveLength(1)
    expect(resume('a-public')!.viewCount).toBe(1)
  })

  it('writes nothing for private or unknown resumes', async () => {
    await post('a-private')
    await post('does-not-exist')
    expect(store.resumeView).toHaveLength(0)
    expect(resume('a-private')!.viewCount).toBe(0)
  })
})
