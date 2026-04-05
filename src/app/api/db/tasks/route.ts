import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getSupabase } from '@/lib/supabase'

const TASK_FIELDS = 'id, session_id, text, description, status, assignee_type, assignee_name, priority, tag, source_text, due_date, created_at, updated_at'

// GET /api/db/tasks — list tasks for current user
// ?session_id=X  — filter by session (must own it)
// ?mine=true     — only tasks assigned to me
export async function GET(req: NextRequest) {
  const supabase = getSupabase()
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email.toLowerCase())
    .single()

  if (!user) return NextResponse.json({ tasks: [] })

  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')
  const mine = searchParams.get('mine') === 'true'

  if (mine) {
    const { data: assignees } = await supabase
      .from('task_assignees')
      .select('task_id')
      .eq('user_id', user.id)

    const taskIds = (assignees ?? []).map(a => a.task_id)
    if (!taskIds.length) return NextResponse.json({ tasks: [] })

    const { data: tasks } = await supabase
      .from('tasks')
      .select(`${TASK_FIELDS}, task_assignees(user_id, users(email, name, avatar_url))`)
      .in('id', taskIds)
      .order('created_at', { ascending: false })

    return NextResponse.json({ tasks: tasks ?? [] })
  }

  if (sessionId) {
    // Verify caller owns this session
    const { data: sessionCheck } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('owner_id', user.id)
      .single()

    if (!sessionCheck) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: tasks } = await supabase
      .from('tasks')
      .select(`${TASK_FIELDS}, task_assignees(user_id, users(email, name, avatar_url))`)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })

    return NextResponse.json({ tasks: tasks ?? [] })
  }

  // All tasks from sessions I own
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('owner_id', user.id)

  const sessionIds = (sessions ?? []).map(s => s.id)
  if (!sessionIds.length) return NextResponse.json({ tasks: [] })

  const { data: tasks } = await supabase
    .from('tasks')
    .select(`${TASK_FIELDS}, task_assignees(user_id, users(email, name, avatar_url))`)
    .in('session_id', sessionIds)
    .order('created_at', { ascending: false })

  return NextResponse.json({ tasks: tasks ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email.toLowerCase())
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Verify caller owns the session
  const { data: sessionCheck } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', body.session_id as string)
    .eq('owner_id', user.id)
    .single()

  if (!sessionCheck) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      session_id: body.session_id as string,
      text: String(body.text || '').slice(0, 500),
      description: body.description ? String(body.description).slice(0, 2000) : null,
      status: body.status || 'actions',
      assignee_type: body.assignee_type || 'human',
      assignee_name: String(body.assignee_name || 'Unassigned').slice(0, 100),
      priority: body.priority || 'med',
      tag: body.tag || null,
      source_text: body.source_text ? String(body.source_text).slice(0, 500) : null,
      due_date: body.due_date || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[db] task create failed', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
  return NextResponse.json({ task })
}
