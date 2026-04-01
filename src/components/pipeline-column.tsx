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
}

const COLUMN_ICONS: Record<ActionStatus, React.ReactNode> = {
  captured: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <circle cx="5" cy="5" r="4" />
    </svg>
  ),
  inprogress: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 3v2l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  blocked: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <path d="M5 1L9 9H1L5 1z" opacity="0.85" />
    </svg>
  ),
  done: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

export function PipelineColumn({ status, actions, newestActionId, onMove, onDelete }: PipelineColumnProps) {
  const config = COLUMN_CONFIG[status]

  const sorted = useMemo(() => {
    const priorityOrder = { high: 0, med: 1, low: 2 }
    return [...actions].sort((a, b) => {
      // Newest first within same priority
      const pa = priorityOrder[a.priority]
      const pb = priorityOrder[b.priority]
      if (pa !== pb) return pa - pb
      return b.createdAt - a.createdAt
    })
  }, [actions])

  return (
    <div className="flex flex-col gap-2 flex-shrink-0" style={{ width: 272 }}>
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-md mb-1"
        style={{
          background: config.color,
          border: `1px solid ${config.borderColor}`,
        }}
      >
        <div
          className="flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase"
          style={{ color: config.textColor, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em' }}
        >
          <span style={{ color: config.textColor }}>{COLUMN_ICONS[status]}</span>
          {config.label}
        </div>
        <span
          className="text-xs px-1.5 py-0.5 rounded-full"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-muted)',
            background: 'var(--surface-3)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {actions.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {sorted.map(action => (
          <ActionCard
            key={action.id}
            action={action}
            onMove={onMove}
            onDelete={onDelete}
            isNew={action.id === newestActionId}
          />
        ))}
        {actions.length === 0 && (
          <div
            className="flex items-center justify-center py-8 rounded-lg text-xs"
            style={{
              border: `1px dashed ${config.borderColor}`,
              color: 'var(--text-muted)',
              background: `${config.color.replace('0.04', '0.02')}`,
            }}
          >
            —
          </div>
        )}
      </div>
    </div>
  )
}
