'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { loadSession, HISTORY_STORAGE_KEY, SESSION_STORAGE_KEY } from '@/lib/utils'
import type { ActionItem, Session as LocalSession } from '@/lib/types'

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

// ── Weekly Activity Chart ──────────────────────────────────────────────────
function WeeklyActivityChart({ tasks }: { tasks: Task[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const days = useMemo(() => {
    const result: { label: string; short: string; created: number; completed: number; date: string }[] = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)

      const dayTasks = tasks.filter(t => t.created_at.slice(0, 10) === dateStr)
      const dayCompleted = tasks.filter(
        t => t.status === 'completed' && t.created_at.slice(0, 10) === dateStr
      )

      result.push({
        label: d.toLocaleDateString('en-US', { weekday: 'long' }),
        short: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        created: dayTasks.length,
        completed: dayCompleted.length,
      })
    }
    return result
  }, [tasks])

  const maxVal = Math.max(...days.map(d => d.created), 1)
  const chartH = 80
  const barW = 28
  const gap = 10
  const totalW = days.length * (barW + gap) - gap

  return (
    <div
      className="rounded-xl"
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        padding: '20px 20px 16px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3 }}>
            Weekly Activity
          </p>
          <p style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)', lineHeight: 1 }}>
            {tasks.filter(t => {
              const d = new Date(); d.setDate(d.getDate() - 7)
              return new Date(t.created_at) >= d
            }).length}
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>tasks this week</span>
          </p>
        </div>
        <div className="flex items-center gap-4" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
          <div className="flex items-center gap-1.5">
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--teal-400)', opacity: 0.9 }} />
            <span style={{ color: 'var(--text-muted)' }}>Created</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--success)', opacity: 0.7 }} />
            <span style={{ color: 'var(--text-muted)' }}>Done</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end justify-between" style={{ gap: gap, position: 'relative' }}>
        {/* Y-axis ghost lines */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: chartH, pointerEvents: 'none', opacity: 0.06 }}
          preserveAspectRatio="none"
        >
          {[0.25, 0.5, 0.75, 1].map((f, i) => (
            <line
              key={i}
              x1="0" y1={chartH * (1 - f)}
              x2="100%" y2={chartH * (1 - f)}
              stroke="currentColor"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {days.map((day, i) => {
          const createdH = maxVal > 0 ? (day.created / maxVal) * chartH : 0
          const completedH = maxVal > 0 ? (day.completed / maxVal) * chartH : 0
          const isHovered = hovered === i
          const isToday = i === 6

          return (
            <div
              key={i}
              className="flex flex-col items-center"
              style={{ flex: 1, cursor: 'default', position: 'relative', zIndex: 1 }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: chartH + 32,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                  }}
                >
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>{day.date}</p>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 10, color: 'var(--teal-400)', fontFamily: 'var(--font-mono)' }}>{day.created} created</span>
                    {day.completed > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{day.completed} done</span>
                    )}
                  </div>
                </div>
              )}

              {/* Bars */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: chartH,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  gap: 3,
                }}
              >
                {/* Created bar */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: Math.max(createdH, createdH > 0 ? 3 : 0) }}
                  transition={{ duration: 0.5, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    width: '45%',
                    borderRadius: '3px 3px 1px 1px',
                    background: isToday
                      ? 'var(--teal-400)'
                      : isHovered
                        ? 'var(--teal-300)'
                        : 'var(--teal-600)',
                    opacity: isHovered ? 1 : isToday ? 0.9 : 0.55,
                    transition: 'opacity 150ms ease, background 150ms ease',
                    alignSelf: 'flex-end',
                  }}
                />
                {/* Completed bar */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: Math.max(completedH, completedH > 0 ? 2 : 0) }}
                  transition={{ duration: 0.5, delay: i * 0.04 + 0.08, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    width: '45%',
                    borderRadius: '3px 3px 1px 1px',
                    background: 'var(--success)',
                    opacity: isHovered ? 0.85 : 0.4,
                    transition: 'opacity 150ms ease',
                    alignSelf: 'flex-end',
                  }}
                />
              </div>

              {/* Day label */}
              <p
                style={{
                  marginTop: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: isToday ? 'var(--teal-400)' : isHovered ? 'var(--text-secondary)' : 'var(--text-muted)',
                  transition: 'color 150ms ease',
                }}
              >
                {day.short}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  accent,
  delay = 0,
}: {
  label: string
  value: number
  accent: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl"
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        padding: '14px 16px',
        flex: 1,
      }}
    >
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', color: accent }}>
        {value}
      </p>
    </motion.div>
  )
}

// ── Priority dot ───────────────────────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = {
  high: '#f06060',
  med: 'var(--warning)',
  low: 'var(--text-muted)',
}

// The cloud DB can be unreachable (paused project, network) — the kanban is
// localStorage-first, so the dashboard falls back to the same local data
// rather than rendering an empty shell.
function loadLocalTasks(): Task[] {
  const current = loadSession<LocalSession>(SESSION_STORAGE_KEY)
  const history = loadSession<LocalSession[]>(HISTORY_STORAGE_KEY) ?? []
  const sessions = [current, ...history].filter((s): s is LocalSession => Boolean(s))
  const seen = new Set<string>()
  const tasks: Task[] = []
  for (const s of sessions) {
    for (const a of s.actions as ActionItem[]) {
      if (seen.has(a.id)) continue
      seen.add(a.id)
      tasks.push({
        id: a.id,
        text: a.text,
        description: a.description,
        status: a.status,
        assignee_name: a.assigneeName,
        priority: a.priority,
        tag: a.tag,
        created_at: new Date(a.createdAt).toISOString(),
        session_id: s.id,
      })
    }
  }
  return tasks
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [localOnly, setLocalOnly] = useState(false)
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
        } else {
          setTasks(loadLocalTasks())
          setLocalOnly(true)
        }
      } catch {
        setTasks(loadLocalTasks())
        setLocalOnly(true)
      }
      setLoading(false)
    }

    fetchTasks()
  }, [status])

  const byStatus = useMemo(() => ({
    actions: tasks.filter(t => t.status === 'actions'),
    assigned: tasks.filter(t => t.status === 'assigned'),
    inprogress: tasks.filter(t => t.status === 'inprogress'),
    indeadline: tasks.filter(t => t.status === 'indeadline'),
    completed: tasks.filter(t => t.status === 'completed'),
  }), [tasks])

  const active = tasks.filter(t => t.status !== 'completed').length

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <div
          className="w-5 h-5 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--teal-400)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  const STATUS_META = {
    actions:   { label: 'To Do',       color: '#22d3ee' },
    assigned:  { label: 'Assigned',    color: '#a5b4fc' },
    inprogress:{ label: 'In Progress', color: '#fde047' },
    indeadline:{ label: 'In Deadline', color: '#fdba74' },
    completed: { label: 'Completed',   color: 'var(--success)' },
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav
        className="glass flex items-center justify-between"
        style={{
          height: 52,
          borderBottom: '1px solid var(--border-primary)',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
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
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Dashboard
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{session?.user?.email}</span>
          <a
            href="/"
            className="btn-press"
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 500,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            Record
          </a>
        </div>
      </nav>

      {localOnly && (
        <div
          data-testid="local-data-note"
          className="px-4 py-1.5 text-center"
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--surface-1)',
          }}
        >
          LOCAL DATA — cloud sync unavailable, showing this browser&apos;s boards
        </div>
      )}

      {/* Page content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 64px' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 24 }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', marginBottom: 2 }}>
            {session?.user?.name ? `Hey, ${session.user.name.split(' ')[0]}` : 'My Dashboard'}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {active > 0
              ? `${active} active task${active !== 1 ? 's' : ''} · ${byStatus.completed.length} completed`
              : 'All caught up'}
          </p>
        </motion.div>

        {/* Stat cards */}
        <div className="flex gap-3 mb-5" style={{ flexWrap: 'wrap' }}>
          <StatCard label="Total" value={tasks.length} accent="var(--text-primary)" delay={0} />
          <StatCard label="Active" value={active} accent="#22d3ee" delay={0.04} />
          <StatCard label="In Deadline" value={byStatus.indeadline.length} accent="#fdba74" delay={0.08} />
          <StatCard label="Completed" value={byStatus.completed.length} accent="var(--success)" delay={0.12} />
        </div>

        {/* Weekly activity chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 28 }}
        >
          <WeeklyActivityChart tasks={tasks} />
        </motion.div>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div
            className="flex flex-col items-center justify-center gap-4 py-20"
            style={{ color: 'var(--text-muted)' }}
          >
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

        {/* Task sections */}
        {tasks.length > 0 && (
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
              Tasks
            </p>
            {(['actions', 'indeadline', 'inprogress', 'assigned', 'completed'] as const).map((s, sectionI) => {
              const list = byStatus[s]
              if (!list.length) return null
              const meta = STATUS_META[s]

              return (
                <motion.div
                  key={s}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.25 + sectionI * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  style={{ marginBottom: 20 }}
                >
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: meta.color, opacity: 0.85 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: meta.color, opacity: 0.85 }}>
                      {meta.label}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', opacity: 0.5 }}>
                      {list.length}
                    </span>
                  </div>

                  {/* Task rows */}
                  <div className="flex flex-col" style={{ gap: 2 }}>
                    {list.map(task => (
                      <div
                        key={task.id}
                        className="rounded-lg"
                        style={{
                          padding: '11px 14px',
                          background: 'var(--surface-1)',
                          border: '1px solid var(--border-subtle)',
                          transition: 'border-color 150ms ease, background 150ms ease',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'
                          ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-primary)'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-1)'
                          ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)'
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: s === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                              textDecoration: s === 'completed' ? 'line-through' : 'none',
                              lineHeight: 1.45,
                              flex: 1,
                            }}
                          >
                            {task.text}
                          </p>
                          {/* Priority pill */}
                          <div
                            style={{
                              flexShrink: 0,
                              marginTop: 1,
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: PRIORITY_COLOR[task.priority] ?? 'var(--text-muted)',
                              opacity: 0.75,
                            }}
                            title={task.priority}
                          />
                        </div>

                        {task.description && (
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 4, marginBottom: 5 }}>
                            {task.description.slice(0, 160)}{task.description.length > 160 ? '…' : ''}
                          </p>
                        )}

                        <div
                          className="flex items-center gap-3"
                          style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: task.description ? 0 : 5 }}
                        >
                          {task.tag && (
                            <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{task.tag}</span>
                          )}
                          {task.due_date && (
                            <span style={{ color: s === 'indeadline' ? '#fdba74' : 'var(--text-muted)' }}>
                              {task.due_date}
                            </span>
                          )}
                          <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.6 }}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
