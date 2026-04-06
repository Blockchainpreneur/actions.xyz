'use client'

import { useMemo } from 'react'
import { type ActionItem, type ActionStatus, type Session } from '@/lib/types'
import { PipelineColumn } from './pipeline-column'

const STATUSES: ActionStatus[] = ['actions', 'assigned', 'inprogress', 'indeadline', 'completed']

interface PipelineBoardProps {
  session: Session
  newestActionId?: string
  onMove: (id: string, status: ActionStatus) => void
  onDelete: (id: string) => void
  onUpdateEmail: (id: string, email: string) => void
  onAssignEmails?: (id: string, emails: string[]) => Promise<void>
}

function PriorityBar({ actions }: { actions: ActionItem[] }) {
  const active = actions.filter(a => a.status !== 'completed')
  const high = active.filter(a => a.priority === 'high')
  const med = active.filter(a => a.priority === 'med')
  const deadline = active.filter(a => a.status === 'indeadline')
  const assigned = active.filter(a => a.assigneeEmail || (a.assigneeEmails?.length ?? 0) > 0)

  if (!active.length) return null

  return (
    <div
      className="flex items-center gap-3 flex-shrink-0 px-5 py-2"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      {/* Priority tags */}
      <div className="flex items-center gap-2 flex-wrap flex-1">
        {high.length > 0 && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.18)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 500,
              color: '#f87171',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f87171' }} />
            {high.length} high priority
          </span>
        )}
        {deadline.length > 0 && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(249,115,22,0.08)',
              border: '1px solid rgba(249,115,22,0.18)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 500,
              color: '#fdba74',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fdba74' }} />
            {deadline.length} in deadline
          </span>
        )}
        {med.length > 0 && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(251,191,36,0.06)',
              border: '1px solid rgba(251,191,36,0.14)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 500,
              color: 'rgba(251,191,36,0.7)',
            }}
          >
            {med.length} medium
          </span>
        )}
        {assigned.length > 0 && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.14)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 500,
              color: '#a5b4fc',
            }}
          >
            {assigned.length} assigned
          </span>
        )}
      </div>

      {/* Summary */}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
        {active.length} active
      </span>
    </div>
  )
}

export function PipelineBoard({ session, newestActionId, onMove, onDelete, onUpdateEmail, onAssignEmails }: PipelineBoardProps) {
  const actionsByStatus = useMemo(() => {
    const grouped: Record<ActionStatus, ActionItem[]> = {
      actions: [],
      assigned: [],
      inprogress: [],
      indeadline: [],
      completed: [],
    }
    for (const action of session.actions) {
      if (grouped[action.status]) {
        grouped[action.status].push(action)
      } else {
        grouped['actions'].push(action)
      }
    }
    return grouped
  }, [session.actions])

  return (
    <main className="flex-1 overflow-x-auto overflow-y-auto flex flex-col">
      <PriorityBar actions={session.actions} />
      <div className="flex gap-3 items-start flex-1 px-5 py-3" style={{ minWidth: 'max-content' }}>
        {STATUSES.map(status => (
          <PipelineColumn
            key={status}
            status={status}
            actions={actionsByStatus[status]}
            newestActionId={newestActionId}
            onMove={onMove}
            onDelete={onDelete}
            onUpdateEmail={onUpdateEmail}
            onAssignEmails={onAssignEmails}
          />
        ))}
      </div>
    </main>
  )
}
