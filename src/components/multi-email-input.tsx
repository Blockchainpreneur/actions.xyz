'use client'

import { useState, useRef } from 'react'
import { Mail, X, Plus } from 'lucide-react'

interface MultiEmailInputProps {
  emails: string[]
  onAdd: (email: string) => void
  onRemove: (email: string) => void
  isAssigning?: boolean
}

export function MultiEmailInput({ emails, onAdd, onRemove, isAssigning }: MultiEmailInputProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function submit() {
    const email = draft.trim().toLowerCase()
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      onAdd(email)
      setDraft('')
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="email"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={submit}
        onKeyDown={e => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') { setEditing(false); setDraft('') }
        }}
        placeholder="email@company.com"
        autoFocus
        onClick={e => e.stopPropagation()}
        className="outline-none"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border-accent)',
          borderRadius: 4,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          padding: '1px 6px',
          width: 140,
        }}
      />
    )
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {emails.map(email => (
        <span
          key={email}
          className="inline-flex items-center gap-1 rounded-full"
          style={{
            background: 'rgba(40,204,230,0.07)',
            border: '1px solid var(--border-accent)',
            padding: '1px 6px',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--cyan-400)',
          }}
        >
          {email.length > 20 ? email.slice(0, 18) + '...' : email}
          <button
            onClick={e => { e.stopPropagation(); onRemove(email) }}
            className="btn-press"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}
          >
            <X size={7} />
          </button>
        </span>
      ))}
      <button
        onClick={e => { e.stopPropagation(); setEditing(true) }}
        disabled={isAssigning}
        className="btn-press flex items-center gap-1"
        style={{
          background: 'transparent',
          border: '1px solid var(--border-subtle)',
          borderRadius: 20,
          padding: '1px 5px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          cursor: 'pointer',
          opacity: isAssigning ? 0.5 : 1,
        }}
      >
        {isAssigning ? (
          <span className="animate-pulse-record inline-block w-1 h-1 rounded-full" style={{ background: 'var(--teal-400)' }} />
        ) : emails.length > 0 ? (
          <Plus size={7} />
        ) : (
          <Mail size={8} />
        )}
        {emails.length === 0 ? 'assign' : ''}
      </button>
    </div>
  )
}
