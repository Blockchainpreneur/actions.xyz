import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getSupabase, getOrCreateUser } from '@/lib/supabase'
import { sendTaskAssignmentEmail, isValidEmail } from '@/lib/email'
import { signTaskToken } from '@/lib/task-token'
import { trackEvent } from '@/lib/events'

const MAX_ASSIGNEES_PER_REQUEST = 20

// POST /api/db/tasks/:id/assign
// Body: { emails: string[] }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id: taskId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: assigner } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('email', session.user.email.toLowerCase())
    .single()

  if (!assigner) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json() as { emails: string[] }
  const emails = (body.emails ?? [])
    .map(e => e.trim().toLowerCase())
    .filter(e => e && isValidEmail(e))
    .slice(0, MAX_ASSIGNEES_PER_REQUEST)

  if (!emails.length) return NextResponse.json({ error: 'No valid emails provided' }, { status: 400 })

  // Get the task AND verify the caller owns the session it belongs to
  const { data: task } = await supabase
    .from('tasks')
    .select('*, sessions!inner(name, owner_id)')
    .eq('id', taskId)
    .single()

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // Authorization: only the session owner or an existing assignee can assign others
  const isOwner = task.sessions?.owner_id === assigner.id
  if (!isOwner) {
    const { data: isAssignee } = await supabase
      .from('task_assignees')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', assigner.id)
      .single()

    if (!isAssignee) {
      return NextResponse.json({ error: 'Not authorized to assign this task' }, { status: 403 })
    }
  }

  const results = []

  for (const email of emails) {
    try {
      const user = await getOrCreateUser(email)

      const { error: assignError } = await supabase
        .from('task_assignees')
        .upsert(
          { task_id: taskId, user_id: user.id, assigned_by: assigner.id },
          { onConflict: 'task_id,user_id' }
        )

      if (assignError) {
        results.push({ email, error: assignError.message })
        continue
      }

      // Signed token for the public task page (/t/[token]) — the email's CTA.
      // Stateless HMAC, so it works even if persistence below fails.
      const token = signTaskToken({ taskId, email })

      // Send notification email (best-effort)
      try {
        const sent = await sendTaskAssignmentEmail({
          to: email,
          assignerName: assigner.name || assigner.email,
          taskText: task.text,
          taskDescription: task.description || '',
          meetingName: task.sessions?.name || 'a meeting',
          token,
          dueDate: task.due_date || null,
        })

        if (sent.ok) {
          await trackEvent('assigned_email_sent', {
            email,
            taskId,
            token: token ?? undefined,
            metadata: { via: 'assign' },
          })
        }

        await supabase
          .from('task_assignees')
          .update({ notified_at: new Date().toISOString() })
          .eq('task_id', taskId)
          .eq('user_id', user.id)

        // Separate best-effort write: the access_token column only exists
        // once the email_loop migration is applied — must not break notified_at
        if (token) {
          await supabase
            .from('task_assignees')
            .update({ access_token: token })
            .eq('task_id', taskId)
            .eq('user_id', user.id)
        }

        await supabase
          .from('email_invites')
          .insert({ email, task_id: taskId, invited_by: assigner.id })
      } catch {
        // Email failed but assignment succeeded — still ok
      }

      results.push({ email, ok: true })
    } catch (err) {
      results.push({ email, error: (err as Error).message })
    }
  }

  // Auto-move task to "assigned" if it was in "actions"
  if (task.status === 'actions' && results.some(r => 'ok' in r)) {
    await supabase
      .from('tasks')
      .update({ status: 'assigned', updated_at: new Date().toISOString() })
      .eq('id', taskId)
  }

  return NextResponse.json({ results })
}
