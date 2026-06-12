import { NextRequest, NextResponse } from 'next/server'
import { verifyTaskToken, signTaskToken } from '@/lib/task-token'
import { getPublicTask } from '@/lib/public-task'
import { getSupabase, getOrCreateUser } from '@/lib/supabase'
import { sendTaskAssignmentEmail, isValidEmail } from '@/lib/email'
import { trackEvent } from '@/lib/events'

// POST /api/t/:token/reassign — hand the task off to another email, no login.
// Body: { email: string }
// The new assignee gets their own signed token + assignment email — this is
// the viral loop propagating itself.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const payload = verifyTaskToken(token)
  if (!payload) {
    return NextResponse.json({ ok: false, code: 'invalid_token' }, { status: 404 })
  }

  let body: { email?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, code: 'invalid_body' }, { status: 400 })
  }

  const newEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!newEmail || !isValidEmail(newEmail)) {
    return NextResponse.json({ ok: false, code: 'invalid_email' }, { status: 400 })
  }
  if (newEmail === payload.email) {
    return NextResponse.json({ ok: false, code: 'already_assigned' }, { status: 400 })
  }

  // Need the task to exist (and its details for the email)
  const taskResult = await getPublicTask(payload)
  if (taskResult.state === 'degraded') {
    return NextResponse.json({ ok: false, code: 'degraded' }, { status: 200 })
  }
  if (taskResult.state === 'not_found') {
    return NextResponse.json({ ok: false, code: 'not_found' }, { status: 404 })
  }
  const task = taskResult.task

  try {
    const supabase = getSupabase()

    // Ghost users for both sides (reassigner becomes assigned_by)
    const reassigner = await getOrCreateUser(payload.email)
    const assignee = await getOrCreateUser(newEmail)

    const { error: assignError } = await supabase
      .from('task_assignees')
      .upsert(
        { task_id: task.id, user_id: assignee.id, assigned_by: reassigner.id },
        { onConflict: 'task_id,user_id' },
      )
    if (assignError) {
      console.warn('[reassign] upsert failed:', assignError.message)
      return NextResponse.json({ ok: false, code: 'degraded' }, { status: 200 })
    }

    // New token for the new assignee + assignment email (best-effort)
    const newToken = signTaskToken({ taskId: task.id, email: newEmail })
    try {
      const sent = await sendTaskAssignmentEmail({
        to: newEmail,
        assignerName: reassigner.name || payload.email,
        taskText: task.text,
        taskDescription: task.description || '',
        meetingName: task.meeting_name,
        token: newToken,
        dueDate: task.due_date,
      })
      if (sent.ok) {
        await trackEvent('assigned_email_sent', {
          email: newEmail,
          taskId: task.id,
          token: newToken ?? undefined,
          metadata: { via: 'reassign' },
        })
      }
      if (newToken) {
        await supabase
          .from('task_assignees')
          .update({ access_token: newToken })
          .eq('task_id', task.id)
          .eq('user_id', assignee.id)
      }
    } catch { /* email/token persistence is best-effort */ }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.warn('[reassign] failed:', (err as Error).message)
    return NextResponse.json({ ok: false, code: 'degraded' }, { status: 200 })
  }
}
