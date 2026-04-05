import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getSupabase } from '@/lib/supabase'

const MAX_BATCH_SIZE = 50

// POST /api/db/tasks/batch — batch create tasks from AI extraction
export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { session_id: string; tasks: Array<Record<string, unknown>> }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.tasks?.length) return NextResponse.json({ tasks: [] })
  if (body.tasks.length > MAX_BATCH_SIZE) {
    return NextResponse.json({ error: `Max ${MAX_BATCH_SIZE} tasks per batch` }, { status: 400 })
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
    .eq('id', body.session_id)
    .eq('owner_id', user.id)
    .single()

  if (!sessionCheck) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = body.tasks.map(t => ({
    session_id: body.session_id,
    text: String(t.text || '').slice(0, 500),
    description: t.description ? String(t.description).slice(0, 2000) : null,
    status: t.assignee_type === 'agent' ? 'assigned' : 'actions',
    assignee_type: t.assignee_type || 'human',
    assignee_name: String(t.assignee_name || 'Unassigned').slice(0, 100),
    priority: t.priority || 'med',
    tag: t.tag || null,
    due_date: t.due_date || null,
    source_text: t.source_text ? String(t.source_text).slice(0, 500) : null,
  }))

  const { data: tasks, error } = await supabase
    .from('tasks')
    .insert(rows)
    .select()

  if (error) {
    console.error('[db] batch create failed', error)
    return NextResponse.json({ error: 'Failed to create tasks' }, { status: 500 })
  }
  return NextResponse.json({ tasks: tasks ?? [] })
}
