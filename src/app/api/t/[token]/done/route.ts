import { NextRequest, NextResponse } from 'next/server'
import { verifyTaskToken } from '@/lib/task-token'
import { completeTaskViaToken } from '@/lib/public-task'
import { trackEvent } from '@/lib/events'

// POST /api/t/:token/done — mark the task completed, no login (token IS the auth)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const payload = verifyTaskToken(token)
  if (!payload) {
    return NextResponse.json({ ok: false, code: 'invalid_token' }, { status: 404 })
  }

  const result = await completeTaskViaToken(payload)

  if (result === 'degraded') {
    return NextResponse.json({ ok: false, code: 'degraded' }, { status: 200 })
  }
  if (result === 'not_found') {
    return NextResponse.json({ ok: false, code: 'not_found' }, { status: 404 })
  }

  await trackEvent('task_done_no_login', { email: payload.email, taskId: payload.taskId, token })

  return NextResponse.json({ ok: true })
}
