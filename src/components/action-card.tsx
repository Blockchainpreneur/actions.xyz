'use client'

import { useState } from 'react'
import { Trash2, GripVertical, ArrowRight } from 'lucide-react'
import { type ActionItem, type ActionStatus, TAG_CONFIG, COLUMN_CONFIG } from '@/lib/types'
import { relativeTime } from '@/lib/utils'
import { ParticipantAvatar } from './participant-avatar'

interface ActionCardProps {
  action: ActionItem
  onMove: (id: string, status: ActionStatus) => void
  onDelete: (id: string) => void
  isNew?: boolean
}

const PRIORITY_COLORS: Record<ActionItem['priority'], string> = {
  high: '#ef4444',
  med: '#f59e0b',
  low: '#475569',
}

const PRIORITY_GLOW: Record<ActionItem['priority'], string> = {
  high: '0 0 6px rgba(239,68,68,0.5)',
  med: '',
  low: '',
}

const STATUS_ORDER: ActionStatus[] = ['captured', 'inprogress', 'blocked', 'done']

export function ActionCard({ action, onMove, onDelete, isNew = false }: ActionCardProps) {
  const [showActions, setShowActions] = useState(false)

  const tagConfig = action.tag ? TAG_CONFIG[action.tag] : null
  const isDone = action.status === 'done'

  const nextStatus = STATUS_ORDER[STATUS_ORDER.indexOf(action.status) + 1] as ActionStatus | undefined

  return (
    <div
      className={`group relative rounded-lg p-3 cursor-pointer transition-all duration-150 ${isNew ? 'animate-card-enter' : ''}`}
      style={{
        background: 'var(--surface-1)',
        border: `1px solid ${isNew ? 'rgba(34,211,238,0.25)' : 'var(--border-subtle)'}`,
        boxShadow: isNew ? '0 0 12px rgba(34,211,238,0.06)' : undefined,
        backdropFilter: 'blur(12px)',
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onFocus={() => setShowActions(true)}
      onBlur={() => setShowActions(false)}
    >
      {/* Top shimmer line on new cards */}
      {isNew && (
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.4), transparent)',
          }}
        />
      )}

      {/* Hover controls */}
      <div
        className={`absolute top-2 right-2 flex items-center gap-1 transition-opacity duration-100 ${showActions ? 'opacity-100' : 'opacity-0'}`}
      >
        {nextStatus && (
          <button
            onClick={(e) => { e.stopPropagation(); onMove(action.id, nextStatus) }}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
            style={{
              background: 'var(--surface-3)',
              color: COLUMN_CONFIG[nextStatus].textColor,
              border: '1px solid var(--border-subtle)',
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
            }}
            title={`Move to ${COLUMN_CONFIG[nextStatus].label}`}
          >
            <ArrowRight size={10} />
            {COLUMN_CONFIG[nextStatus].label}
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(action.id) }}
          className="flex items-center justify-center w-6 h-6 rounded transition-colors"
          style={{ background: 'var(--surface-3)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
          title="Delete"
        >
          <Trash2 size={10} />
        </button>
      </div>

      {/* Card body */}
      <div className="flex items-start gap-2 mb-2">
        {/* Priority dot */}
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
          style={{
            background: PRIORITY_COLORS[action.priority],
            boxShadow: PRIORITY_GLOW[action.priority],
          }}
        />
        <p
          className="text-sm leading-snug flex-1 pr-12"
          style={{
            color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: isDone ? 'line-through' : 'none',
            textDecorationColor: 'var(--text-muted)',
          }}
        >
          {action.text}
        </p>
      </div>

      {/* Tag */}
      {tagConfig && (
        <div className="mb-2">
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs"
            style={{
              background: tagConfig.bg,
              color: tagConfig.text,
              border: `1px solid ${tagConfig.border}`,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
            }}
          >
            {tagConfig.label}
          </span>
        </div>
      )}

      {/* Blocked reason */}
      {action.status === 'blocked' && action.blockedReason && (
        <div
          className="mb-2 px-2 py-1.5 rounded text-xs"
          style={{
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.15)',
            color: '#fdba74',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
          }}
        >
          ⚠ {action.blockedReason}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        {/* Assignee badge */}
        <div
          className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-xs transition-colors"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <ParticipantAvatar
            name={action.assigneeName}
            initial={action.assigneeInitial ?? '?'}
            colorKey={action.assigneeColor ?? 'indigo'}
            isAgent={action.assigneeType === 'agent'}
            size="xs"
          />
          <span style={{ fontWeight: 500, fontSize: 11 }}>{action.assigneeName}</span>
        </div>

        {/* Time / due */}
        <span
          style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: isDone ? '#6ee7b7' : 'var(--text-muted)' }}
        >
          {isDone ? '✓ done' : (action.dueDate ?? relativeTime(action.createdAt))}
        </span>
      </div>
    </div>
  )
}
