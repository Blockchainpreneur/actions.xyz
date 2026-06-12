import { NextRequest, NextResponse } from 'next/server'
import { verifyTaskToken } from '@/lib/task-token'
import { addCommentViaToken } from '@/lib/public-task'

// POST /api/t/:token/comment — comment on a task without an account
// Body: { body: string, author_name?: string }
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const payload = verifyTaskToken(token)
  if (!payload) {
    return NextResponse.json({ ok: false, code: 'invalid_token' }, { status: 404 })
  }

  let body: { body?: unknown; author_name?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, code: 'invalid_body' }, { status: 400 })
  }

  const text = typeof body.body === 'string' ? body.body.trim() : ''
  if (!text) return NextResponse.json({ ok: false, code: 'empty_comment' }, { status: 400 })

  const authorName = typeof body.author_name === 'string' ? body.author_name.trim() : undefined
  const result = await addCommentViaToken(payload, text, authorName)

  if (result === 'degraded') {
    return NextResponse.json({ ok: false, code: 'degraded' }, { status: 200 })
  }

  return NextResponse.json({ ok: true })
}
