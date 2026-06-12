import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getEmailSender, buildDigestEmail, type DigestTask } from '@/lib/email'
import { signTaskToken } from '@/lib/task-token'

// GET /api/cron/weekly-digest — Vercel Cron (Mondays 9:00 UTC, see vercel.json)
// Groups open tasks by assignee email and sends "You have N open tasks from
// your meetings" with /t/[token] links. Every email is an acquisition surface.
//
// Protected by CRON_SECRET (Vercel sends `Authorization: Bearer <CRON_SECRET>`
// automatically when the env var is set). Fail-open: a paused/unreachable DB
// returns 200 { ok: false, code: 'degraded' } — never a crash.

export const dynamic = 'force-dynamic'

const MAX_RECIPIENTS_PER_RUN = 100
const MAX_OPEN_TASKS_SCANNED = 1000

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { ok: false, code: 'cron_unavailable', detail: 'CRON_SECRET is not configured' },
      { status: 503 },
    )
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, code: 'unauthorized' }, { status: 401 })
  }

  let supabase
  try {
    supabase = getSupabase()
  } catch {
    return NextResponse.json({ ok: false, code: 'degraded', detail: 'Supabase env not configured' }, { status: 200 })
  }

  try {
    // 1. Open tasks (anything not completed) with their board name
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, text, status, due_date, sessions(name)')
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(MAX_OPEN_TASKS_SCANNED)

    if (tasksError) {
      console.warn('[digest] tasks query failed:', tasksError.message)
      return NextResponse.json({ ok: false, code: 'degraded' }, { status: 200 })
    }
    if (!tasks?.length) return NextResponse.json({ ok: true, recipients: 0, sent: 0 })

    const taskIds = tasks.map(t => t.id)

    // 2. Who is assigned to them
    const { data: assignments, error: assignError } = await supabase
      .from('task_assignees')
      .select('task_id, user_id')
      .in('task_id', taskIds)

    if (assignError) {
      console.warn('[digest] assignees query failed:', assignError.message)
      return NextResponse.json({ ok: false, code: 'degraded' }, { status: 200 })
    }
    if (!assignments?.length) return NextResponse.json({ ok: true, recipients: 0, sent: 0 })

    // 3. Assignee emails
    const userIds = [...new Set(assignments.map(a => a.user_id))]
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .in('id', userIds)

    if (usersError) {
      console.warn('[digest] users query failed:', usersError.message)
      return NextResponse.json({ ok: false, code: 'degraded' }, { status: 200 })
    }

    const emailByUserId = new Map((users ?? []).map(u => [u.id, u.email as string]))
    const taskById = new Map(tasks.map(t => [t.id, t]))

    // Group open tasks per assignee email
    const byEmail = new Map<string, DigestTask[]>()
    for (const a of assignments) {
      const email = emailByUserId.get(a.user_id)
      const task = taskById.get(a.task_id)
      if (!email || !task) continue
      const token = signTaskToken({ taskId: task.id, email })
      if (!token) continue // no signing secret — links would be broken, skip
      const sessions = task.sessions as unknown as { name: string }[] | { name: string } | null
      const meetingName = (Array.isArray(sessions) ? sessions[0]?.name : sessions?.name) || 'a meeting'
      const list = byEmail.get(email) ?? []
      list.push({ text: task.text, meetingName, dueDate: task.due_date, token })
      byEmail.set(email, list)
    }

    const sender = getEmailSender()
    let sent = 0
    let skipped = 0
    const recipients = [...byEmail.entries()].slice(0, MAX_RECIPIENTS_PER_RUN)

    for (const [email, digestTasks] of recipients) {
      const result = await sender.send(buildDigestEmail(email, digestTasks))
      if (result.ok) sent++
      else skipped++
    }

    return NextResponse.json({ ok: true, recipients: recipients.length, sent, skipped })
  } catch (err) {
    console.warn('[digest] failed:', (err as Error).message)
    return NextResponse.json({ ok: false, code: 'degraded' }, { status: 200 })
  }
}
