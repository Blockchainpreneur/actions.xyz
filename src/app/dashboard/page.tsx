'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Task {
  id: string
  text: string
  description?: string
  status: string
  assignee_name: string
  priority: string
  tag?: string
  due_date?: string
  created_at: string
  session_id: string
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/dashboard')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return

    async function fetchTasks() {
      try {
        const res = await fetch('/api/db/tasks?mine=true')
        if (res.ok) {
          const data = await res.json()
          setTasks(data.tasks ?? [])
        }
      } catch { /* silent */ }
      setLoading(false)
    }

    fetchTasks()
  }, [status])

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--teal-400)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const byStatus = {
    actions: tasks.filter(t => t.status === 'actions'),
    assigned: tasks.filter(t => t.status === 'assigned'),
    inprogress: tasks.filter(t => t.status === 'inprogress'),
    indeadline: tasks.filter(t => t.status === 'indeadline'),
    completed: tasks.filter(t => t.status === 'completed'),
  }

  const totalTasks = tasks.length
  const completedTasks = byStatus.completed.length

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav className="glass flex items-center justify-between" style={{ height: 52, borderBottom: '1px solid var(--border-primary)', padding: '0 16px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="flex items-center gap-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="var(--text-muted)" strokeWidth="1" />
              <path d="M7 4.5v2.5l1.5 1.5" stroke="var(--teal-400)" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              actions<span style={{ color: 'var(--teal-400)' }}>.xyz</span>
            </span>
          </div>
          <div style={{ width: 1, height: 16, background: 'var(--border-primary)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)' }}>
            My Tasks
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{session?.user?.email}</span>
          <a href="/" className="btn-press" style={{ padding: '4px 8px', borderRadius: 6, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500, textDecoration: 'none' }}>
            Record
          </a>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats */}
        <div className="flex items-center gap-6 mb-8">
          <div>
            <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>{totalTasks}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>tasks assigned to you</span>
          </div>
          {totalTasks > 0 && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              {completedTasks}/{totalTasks} completed
            </div>
          )}
        </div>

        {/* Empty state */}
        {totalTasks === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-20" style={{ color: 'var(--text-muted)' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="2" width="24" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <line x1="10" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="10" y1="16" x2="22" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="10" y1="22" x2="16" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'center', lineHeight: 1.7 }}>
              No tasks assigned to you yet.<br />
              When someone assigns you a task, it appears here.
            </p>
          </div>
        )}

        {/* Task list */}
        {['actions', 'assigned', 'inprogress', 'indeadline', 'completed'].map(status => {
          const statusTasks = byStatus[status as keyof typeof byStatus]
          if (!statusTasks.length) return null
          const labels: Record<string, string> = { actions: 'To Do', assigned: 'Assigned', inprogress: 'In Progress', indeadline: 'In Deadline', completed: 'Completed' }

          return (
            <div key={status} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)' }}>
                  {labels[status]}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', opacity: 0.5 }}>
                  {statusTasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {statusTasks.map(task => (
                  <div
                    key={task.id}
                    className="rounded-lg"
                    style={{
                      padding: '12px 14px',
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 500, color: status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: status === 'completed' ? 'line-through' : 'none', marginBottom: 4 }}>
                      {task.text}
                    </p>
                    {task.description && (
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 6 }}>
                        {task.description.slice(0, 200)}{task.description.length > 200 ? '...' : ''}
                      </p>
                    )}
                    <div className="flex items-center gap-3" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                      {task.tag && <span style={{ textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{task.tag}</span>}
                      {task.due_date && <span>{task.due_date}</span>}
                      <span style={{ textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{task.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
