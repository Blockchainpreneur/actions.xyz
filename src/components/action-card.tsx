'use client'

import { useState, useRef, useCallback } from 'react'
import { Trash2, ArrowRight, ChevronDown } from 'lucide-react'
import { type ActionItem, type ActionStatus, TAG_CONFIG, COLUMN_CONFIG } from '@/lib/types'
import { relativeTime } from '@/lib/utils'
import { ParticipantAvatar } from './participant-avatar'
import { MultiEmailInput } from './multi-email-input'

interface ActionCardProps {
  action: ActionItem
  onMove: (id: string, status: ActionStatus) => void
  onDelete: (id: string) => void
  onUpdateEmail: (id: string, email: string) => void
  onAssignEmails?: (id: string, emails: string[]) => Promise<void>
  isNew?: boolean
}

// Priority as a left-border signal (taste-skill: left accent > dot)
const PRIORITY_INSET: Record<ActionItem['priority'], string> = {
  high: 'inset 2px 0 0 rgba(248,113,113,0.75)',
  med:  'inset 2px 0 0 rgba(251,191,36,0.5)',
  low:  'inset 2px 0 0 rgba(255,255,255,0.04)',
}

const STATUS_ORDER: ActionStatus[] = ['actions', 'assigned', 'inprogress', 'indeadline', 'completed']

export function ActionCard({ action, onMove, onDelete, onUpdateEmail, onAssignEmails, isNew = false }: ActionCardProps) {
  const [showControls, setShowControls] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState(action.assigneeEmail ?? '')
  const [expanded, setExpanded] = useState(false)
  const [assignedEmails, setAssignedEmails] = useState<string[]>(action.assigneeEmails ?? (action.assigneeEmail ? [action.assigneeEmail] : []))
  const [isAssigning, setIsAssigning] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)

  const handleAddEmail = useCallback(async (email: string) => {
    if (assignedEmails.includes(email)) return
    setAssignedEmails(prev => [...prev, email])
    setIsAssigning(true)

    // Call assign API (sends notification email + creates ghost user)
    if (onAssignEmails) {
      try {
        await onAssignEmails(action.id, [email])
      } catch { /* best effort */ }
    } else {
      // Fallback to legacy single-email
      onUpdateEmail(action.id, email)
    }
    setIsAssigning(false)
  }, [assignedEmails, action.id, onAssignEmails, onUpdateEmail])

  const handleRemoveEmail = useCallback((email: string) => {
    setAssignedEmails(prev => prev.filter(e => e !== email))
    if (assignedEmails.length <= 1) {
      onUpdateEmail(action.id, '')
    }
  }, [assignedEmails, action.id, onUpdateEmail])

  const tagConfig = action.tag ? TAG_CONFIG[action.tag] : null
  const isDone = action.status === 'completed'
  const currentIdx = STATUS_ORDER.indexOf(action.status)
  const nextStatus = STATUS_ORDER[currentIdx + 1] as ActionStatus | undefined

  function commitEmail() {
    setEditingEmail(false)
    const trimmed = emailDraft.trim()
    const prev = action.assigneeEmail ?? ''
    if (trimmed === prev) return

    onUpdateEmail(action.id, trimmed)

    if (trimmed && action.status === 'actions') {
      onMove(action.id, 'assigned')
    } else if (!trimmed && action.status === 'assigned' && action.assigneeType !== 'agent') {
      onMove(action.id, 'actions')
    }
  }

  return (
    <div
      className={`group relative rounded-lg cursor-pointer ${isNew ? 'animate-card-enter' : ''}`}
      style={{
        padding: '9px 11px',
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        /* Left priority border + inset highlight + diffusion shadow */
        boxShadow: [
          PRIORITY_INSET[action.priority],
          'inset 0 1px 0 rgba(255,255,255,0.05)',
          isNew
            ? '0 0 16px rgba(40,204,230,0.06)'
            : '0 2px 12px -4px rgba(0,0,0,0.35)',
        ].join(', '),
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
      }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onFocus={() => setShowControls(true)}
      onBlur={() => setShowControls(false)}
    >
      {/* New card top shimmer */}
      {isNew && (
        <div
          className="absolute top-0 left-0 right-0 h-px rounded-t-lg"
          style={{ background: 'linear-gradient(90deg, transparent 10%, var(--cyan-400) 50%, transparent 90%)', opacity: 0.45 }}
        />
      )}

      {/* Hover controls — move + delete */}
      <div
        className={`absolute top-2 right-2 flex items-center gap-1 transition-opacity duration-100 ${showControls && !editingEmail ? 'opacity-100' : 'opacity-0'}`}
      >
        {nextStatus && (
          <button
            onClick={(e) => { e.stopPropagation(); onMove(action.id, nextStatus) }}
            className="btn-press flex items-center gap-1 px-2 py-1 rounded-full"
            style={{
              background: 'var(--surface-3)',
              color: COLUMN_CONFIG[nextStatus].textColor,
              border: '1px solid var(--border-subtle)',
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
            }}
            title={`Move to ${COLUMN_CONFIG[nextStatus].label}`}
          >
            <ArrowRight size={9} />
            {COLUMN_CONFIG[nextStatus].label}
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(action.id) }}
          className="btn-press flex items-center justify-center rounded-full"
          style={{ width: 22, height: 22, background: 'var(--surface-3)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
          title="Delete"
        >
          <Trash2 size={9} />
        </button>
      </div>

      {/* Task title — the hero */}
      <p
        className="leading-snug pr-14 mb-2"
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: isDone ? 'line-through' : 'none',
          textDecorationColor: 'var(--text-muted)',
          letterSpacing: '-0.01em',
        }}
      >
        {action.text}
      </p>

      {/* Description — expandable, taste-skill inline reveal */}
      {action.description && (
        <div className="mb-2.5">
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }}
            className="btn-press flex items-center gap-1.5 mb-1.5"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ChevronDown
              size={9}
              style={{
                color: 'var(--text-muted)',
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 150ms var(--ease-spring)',
              }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              {expanded ? 'less' : 'context'}
            </span>
          </button>
          {expanded && (
            <p
              style={{
                fontSize: 11,
                lineHeight: 1.65,
                color: 'var(--text-secondary)',
                paddingLeft: 10,
                paddingTop: 5,
                paddingBottom: 5,
                borderLeft: '2px solid var(--border-accent)',
              }}
            >
              {action.description}
            </p>
          )}
        </div>
      )}

      {/* Tag — eyebrow style (taste-skill: rounded-full, tight tracking) */}
      {tagConfig && (
        <div className="mb-2.5">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full"
            style={{
              background: tagConfig.bg,
              color: tagConfig.text,
              border: `1px solid ${tagConfig.border}`,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {tagConfig.label}
          </span>
        </div>
      )}

      {/* Footer — consolidated assignee + email + timestamp */}
      <div className="flex items-center justify-between gap-2 mt-1">
        {/* Left: assignee + email (integrated) */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <ParticipantAvatar
            name={action.assigneeName}
            initial={action.assigneeInitial ?? '?'}
            colorKey={action.assigneeColor ?? 'indigo'}
            isAgent={action.assigneeType === 'agent'}
            size="xs"
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 80,
            }}
          >
            {action.assigneeName}
          </span>

          {/* Multi-email assignment — the viral loop */}
          <MultiEmailInput
            emails={assignedEmails}
            onAdd={handleAddEmail}
            onRemove={handleRemoveEmail}
            isAssigning={isAssigning}
          />
        </div>

        {/* Right: timestamp / due date */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: isDone ? 'var(--success)' : 'var(--text-muted)',
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}
        >
          {isDone ? '✓ done' : (action.dueDate ?? relativeTime(action.createdAt))}
        </span>
      </div>
    </div>
  )
}
