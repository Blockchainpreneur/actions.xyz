'use client'

import { useMemo } from 'react'
import { type ActionItem, type ActionStatus, COLUMN_CONFIG } from '@/lib/types'
import { ActionCard } from './action-card'

interface PipelineColumnProps {
  status: ActionStatus
  actions: ActionItem[]
  newestActionId?: string
  onMove: (id: string, status: ActionStatus) => void
  onDelete: (id: string) => void
  onUpdateEmail: (id: string, email: string) => void
  onAssignEmails?: (id: string, emails: string[]) => Promise<void>
}

// Status icons used in empty state only
const COLUMN_ICONS: Record<ActionStatus, React.ReactNode> = {
  actions: <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="3" /></svg>,
  assigned: <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><circle cx="4" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M1 7.5c0-1.66 1.34-3 3-3s3 1.34 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
  inprogress: <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><circle cx="4" cy="4" r="3" stroke="currentColor" strokeWidth="1.2" /><path d="M4 2.5v1.5l1 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>,
  indeadline: <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><path d="M4 0.5L7.5 7H0.5L4 0.5z" opacity="0.9" /></svg>,
  completed: <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2L6.5 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>,
}

export function PipelineColumn({ status, actions, newestActionId, onMove, onDelete, onUpdateEmail, onAssignEmails }: PipelineColumnProps) {
  const config = COLUMN_CONFIG[status]

  const sorted = useMemo(() => {
    const priorityOrder = { high: 0, med: 1, low: 2 }
    return [...actions].sort((a, b) => {
      const pa = priorityOrder[a.priority]
      const pb = priorityOrder[b.priority]
      if (pa !== pb) return pa - pb
      return b.createdAt - a.createdAt
    })
  }, [actions])

  return (
    <div className="flex flex-col gap-2 flex-shrink-0" style={{ width: 272 }}>
      {/* Top accent line — the only color, no background box */}
      <div style={{ height: 1.5, background: config.textColor, opacity: 0.4, borderRadius: 1, marginBottom: 8 }} />

      <div className="flex items-center justify-between px-0.5 mb-1">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: config.textColor,
            opacity: 0.75,
          }}
        >
          {config.label}
        </span>
        {actions.length > 0 && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: config.textColor,
              opacity: 0.4,
            }}
          >
            {actions.length}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {sorted.map(action => (
          <ActionCard
            key={action.id}
            action={action}
            onMove={onMove}
            onDelete={onDelete}
            onUpdateEmail={onUpdateEmail}
            onAssignEmails={onAssignEmails}
            isNew={action.id === newestActionId}
          />
        ))}
        {actions.length === 0 && (
          <div
            className="flex flex-col items-center justify-center gap-2 py-10 rounded-lg"
            style={{
              border: `1px dashed ${config.borderColor}`,
              color: 'var(--text-muted)',
              background: config.color,
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ border: `1px solid ${config.borderColor}`, color: config.textColor, opacity: 0.5 }}
            >
              {COLUMN_ICONS[status]}
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', opacity: 0.5 }}>empty</span>
          </div>
        )}
      </div>
    </div>
  )
}
