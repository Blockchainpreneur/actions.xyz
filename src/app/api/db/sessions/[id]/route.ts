import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getSupabase } from '@/lib/supabase'

async function getUserId(email: string): Promise<string | null> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()
  return data?.id ?? null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = await getUserId(session.user.email)

  // Get session — only if owned by this user or user has tasks assigned in it
  const { data } = await supabase
    .from('sessions')
    .select('*, tasks(*, task_assignees(user_id, users(email, name, avatar_url))), transcript_lines(*)')
    .eq('id', id)
    .single()

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify access: owner or has assigned tasks
  const isOwner = data.owner_id === userId
  const hasAssignedTasks = data.tasks?.some((t: { task_assignees?: { user_id: string }[] }) =>
    t.task_assignees?.some(a => a.user_id === userId)
  )

  if (!isOwner && !hasAssignedTasks) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ session: data })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = await getUserId(session.user.email)

  // Only session owner can update
  const { data: existing } = await supabase
    .from('sessions')
    .select('owner_id')
    .eq('id', id)
    .single()

  if (!existing || existing.owner_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as Record<string, unknown>
  const allowed = ['name', 'ended_at', 'key_points', 'participants']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('sessions')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) { console.error('[db] session update failed', error); return NextResponse.json({ error: 'Failed to update session' }, { status: 500 }) }
  return NextResponse.json({ session: data })
}
