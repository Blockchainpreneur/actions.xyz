import type { Metadata } from 'next'
import { verifyTaskToken } from '@/lib/task-token'
import { getPublicTask } from '@/lib/public-task'
import { TaskView } from './task-view'

// Public, no-login task page. The token in the URL is the credential.
// Everything degrades gracefully when the DB is unreachable.

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params

  // Best-effort: richer OG when the DB is reachable, generic otherwise
  let title = 'You have a task on actions.xyz'
  let description = 'Open to view details, mark it done, or hand it off — no account needed.'
  try {
    const payload = verifyTaskToken(token)
    if (payload) {
      const result = await getPublicTask(payload)
      if (result.state === 'ok') {
        title = `Task: ${result.task.text.slice(0, 70)}`
        description = `${result.task.assigner_name ? `${result.task.assigner_name} assigned you this task` : 'A task assigned to you'} from ${result.task.meeting_name} on actions.xyz.`
      }
    }
  } catch { /* generic metadata is fine */ }

  return {
    title: `${title} · actions.xyz`,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      siteName: 'actions.xyz',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function PublicTaskPage({ params }: PageProps) {
  const { token } = await params
  return <TaskView token={token} />
}
