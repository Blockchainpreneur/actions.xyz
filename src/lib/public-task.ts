import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'
import type { TaskTokenPayload } from '@/lib/task-token'

// Data layer for the public (no-login) task page /t/[token].
//
// Every function here is FAIL-OPEN: the Supabase project can be paused
// (NXDOMAIN) — callers must always get a typed result, never an exception.

export interface PublicComment {
  id: string
  author_name: string | null
  author_email: string | null
  body: string
  created_at: string
}

export interface PublicTask {
  id: string
  text: string
  description: string | null
  status: string
  due_date: string | null
  created_at: string
  meeting_name: string
  assigner_name: string | null
  assignee_email: string
  comments: PublicComment[]
}

export type PublicTaskResult =
  | { state: 'ok'; task: PublicTask }
  | { state: 'not_found' }
  | { state: 'degraded' }

export type MutationResult = 'ok' | 'not_found' | 'degraded'

function tryGetSupabase(): SupabaseClient | null {
  try {
    return getSupabase()
  } catch {
    return null
  }
}

export async function getPublicTask(payload: TaskTokenPayload): Promise<PublicTaskResult> {
  const supabase = tryGetSupabase()
  if (!supabase) return { state: 'degraded' }

  try {
    const { data: task, error } = await supabase
      .from('tasks')
      .select('id, text, description, status, due_date, created_at, sessions!inner(name)')
      .eq('id', payload.taskId)
      .maybeSingle()

    if (error) {
      console.warn('[public-task] task lookup failed:', error.message)
      return { state: 'degraded' }
    }
    if (!task) return { state: 'not_found' }

    // Assigner name (best-effort — page renders without it)
    let assignerName: string | null = null
    try {
      const { data: assignment } = await supabase
        .from('task_assignees')
        .select('assigned_by')
        .eq('task_id', payload.taskId)
        .limit(1)
        .maybeSingle()
      if (assignment?.assigned_by) {
        const { data: assigner } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', assignment.assigned_by)
          .maybeSingle()
        assignerName = assigner?.name || assigner?.email || null
      }
    } catch { /* best-effort */ }

    // Comments (best-effort — table may not be migrated yet)
    let comments: PublicComment[] = []
    try {
      const { data } = await supabase
        .from('task_comments')
        .select('id, author_name, author_email, body, created_at')
        .eq('task_id', payload.taskId)
        .order('created_at', { ascending: true })
        .limit(50)
      comments = (data ?? []) as PublicComment[]
    } catch { /* best-effort */ }

    const sessions = task.sessions as unknown as { name: string }[] | { name: string }
    const meetingName = (Array.isArray(sessions) ? sessions[0]?.name : sessions?.name) || 'a meeting'

    return {
      state: 'ok',
      task: {
        id: task.id,
        text: task.text,
        description: task.description,
        status: task.status,
        due_date: task.due_date,
        created_at: task.created_at,
        meeting_name: meetingName,
        assigner_name: assignerName,
        assignee_email: payload.email,
        comments,
      },
    }
  } catch (err) {
    console.warn('[public-task] lookup failed:', (err as Error).message)
    return { state: 'degraded' }
  }
}

export async function completeTaskViaToken(payload: TaskTokenPayload): Promise<MutationResult> {
  const supabase = tryGetSupabase()
  if (!supabase) return 'degraded'

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', payload.taskId)
      .select('id')
      .maybeSingle()

    if (error) {
      console.warn('[public-task] complete failed:', error.message)
      return 'degraded'
    }
    return data ? 'ok' : 'not_found'
  } catch (err) {
    console.warn('[public-task] complete failed:', (err as Error).message)
    return 'degraded'
  }
}

export async function addCommentViaToken(
  payload: TaskTokenPayload,
  body: string,
  authorName?: string,
): Promise<MutationResult> {
  const supabase = tryGetSupabase()
  if (!supabase) return 'degraded'

  try {
    const { error } = await supabase.from('task_comments').insert({
      task_id: payload.taskId,
      author_email: payload.email,
      author_name: authorName?.slice(0, 100) || payload.email.split('@')[0],
      body: body.slice(0, 2000),
    })
    if (error) {
      console.warn('[public-task] comment failed:', error.message)
      return 'degraded'
    }
    return 'ok'
  } catch (err) {
    console.warn('[public-task] comment failed:', (err as Error).message)
    return 'degraded'
  }
}
