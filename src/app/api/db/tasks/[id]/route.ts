import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getSupabase } from '@/lib/supabase'

// Verify the caller owns the session this task belongs to
async function verifyTaskAccess(taskId: string, userEmail: string): Promise<boolean> {
  const supabase = getSupabase()
  const { data: task } = await supabase
    .from('tasks')
    .select('session_id, sessions!inner(owner_id)')
    .eq('id', taskId)
    .single()

  if (!task) return false

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', userEmail.toLowerCase())
    .single()

  if (!user) return false

  const sessions = task.sessions as unknown as { owner_id: string }[] | { owner_id: string }
  const ownerId = Array.isArray(sessions) ? sessions[0]?.owner_id : sessions?.owner_id
  return ownerId === user.id
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await verifyTaskAccess(id, session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as Record<string, unknown>
  const allowed = ['text', 'description', 'status', 'assignee_type', 'assignee_name', 'priority', 'tag', 'due_date', 'blocked_reason']
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length <= 1) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) { console.error('[db] task op failed', error); return NextResponse.json({ error: 'Operation failed' }, { status: 500 }) }
  return NextResponse.json({ task: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await verifyTaskAccess(id, session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) { console.error('[db] task op failed', error); return NextResponse.json({ error: 'Operation failed' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}
