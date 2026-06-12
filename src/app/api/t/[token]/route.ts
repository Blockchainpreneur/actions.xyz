import { NextRequest, NextResponse } from 'next/server'
import { verifyTaskToken } from '@/lib/task-token'
import { getPublicTask } from '@/lib/public-task'
import { trackEvent } from '@/lib/events'

// GET /api/t/:token — public task data for /t/[token] (no auth, token IS the auth)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const payload = verifyTaskToken(token)
  if (!payload) {
    return NextResponse.json({ ok: false, code: 'invalid_token' }, { status: 404 })
  }

  const result = await getPublicTask(payload)

  if (result.state === 'degraded') {
    // DB unreachable — the page degrades gracefully, this is not an error for the client
    return NextResponse.json({ ok: false, code: 'degraded' }, { status: 200 })
  }
  if (result.state === 'not_found') {
    return NextResponse.json({ ok: false, code: 'not_found' }, { status: 404 })
  }

  await trackEvent('task_page_view', { email: payload.email, taskId: payload.taskId, token })

  return NextResponse.json({ ok: true, task: result.task })
}
