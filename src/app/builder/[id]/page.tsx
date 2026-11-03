import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getOwnedResume } from '@/lib/resume-sync'
import { BuilderClient } from '@/components/builder/BuilderClient'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) return { title: 'Builder — Resumify' }
  const resume = await getOwnedResume(id, session.user.id)
  return { title: `${resume?.title ?? 'Resume'} — Resumify` }
}

export default async function BuilderPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const { id } = await params
  const resume = await getOwnedResume(id, session.user.id)
  if (!resume) notFound()

  return (
    <BuilderClient
      resumeId={id}
      initialData={resume.data}
      resumeTitle={resume.title}
      userId={session.user.id}
      userPlan={session.user.plan ?? 'FREE'}
    />
  )
}

