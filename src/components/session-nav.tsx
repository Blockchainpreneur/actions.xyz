'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Radio, Square, RefreshCw } from 'lucide-react'
import { type Participant, type Session } from '@/lib/types'
import { ParticipantAvatar } from './participant-avatar'

interface SessionNavProps {
  session: Session | null
  isListening: boolean
  isSupported: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onAddParticipant: (name: string) => void
  onUpdateName: (name: string) => void
  onNewSession: () => void
}

export function SessionNav({
  session,
  isListening,
  isSupported,
  onStartRecording,
  onStopRecording,
  onAddParticipant,
  onUpdateName,
  onNewSession,
}: SessionNavProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [addingParticipant, setAddingParticipant] = useState(false)
  const [participantName, setParticipantName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const participantInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingName])

  useEffect(() => {
    if (addingParticipant && participantInputRef.current) {
      participantInputRef.current.focus()
    }
  }, [addingParticipant])

  const handleNameClick = () => {
    setNameValue(session?.name ?? '')
    setEditingName(true)
  }

  const handleNameSubmit = () => {
    if (nameValue.trim()) onUpdateName(nameValue.trim())
    setEditingName(false)
  }

  const handleParticipantSubmit = () => {
    if (participantName.trim()) {
      onAddParticipant(participantName.trim())
      setParticipantName('')
    }
    setAddingParticipant(false)
  }

  return (
    <nav
      className="flex items-center justify-between px-4 flex-shrink-0"
      style={{
        height: 56,
        background: 'rgba(5, 13, 26, 0.95)',
        borderBottom: '1px solid var(--border-primary)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500, letterSpacing: '-0.02em' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="rgba(34,211,238,0.3)" strokeWidth="1" />
          <path d="M8 5v3l2 2" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span style={{ color: 'var(--text-primary)' }}>actions</span>
        <span style={{ color: 'var(--cyan-400)' }}>.xyz</span>
      </div>

      {/* Session info */}
      <div className="flex items-center gap-3">
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={e => { if (e.key === 'Enter') handleNameSubmit(); if (e.key === 'Escape') setEditingName(false) }}
            className="text-sm px-2 py-1 rounded outline-none"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-accent)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              width: 180,
            }}
          />
        ) : (
          <button
            onClick={handleNameClick}
            className="text-sm transition-colors hover:opacity-80"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}
          >
            {session?.name ?? '—'}
          </button>
        )}

        {/* Participants */}
        <div className="flex items-center">
          {session?.participants.map((p, i) => (
            <ParticipantAvatar
              key={p.id}
              name={p.name}
              initial={p.initial}
              colorKey={p.color}
              size="sm"
              className={i === 0 ? '' : '-ml-1.5'}
            />
          ))}
          <button
            onClick={() => setAddingParticipant(true)}
            className="flex items-center justify-center rounded-full transition-colors hover:opacity-80"
            style={{
              width: 28,
              height: 28,
              marginLeft: session?.participants.length ? -6 : 0,
              background: 'var(--surface-3)',
              border: '1px dashed rgba(34,211,238,0.2)',
              color: 'var(--text-muted)',
            }}
            title="Add participant"
          >
            <Plus size={11} />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNewSession}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            fontSize: 12,
          }}
          title="New session"
        >
          <RefreshCw size={11} />
          New
        </button>

        {isListening ? (
          <button
            onClick={onStopRecording}
            className="flex items-center gap-2 px-3 py-1.5 rounded transition-all"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse-record" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.8)' }} />
            Recording
            <Square size={10} />
          </button>
        ) : (
          <button
            onClick={onStartRecording}
            disabled={!isSupported}
            className="flex items-center gap-2 px-3 py-1.5 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'var(--teal-500)',
              border: '1px solid var(--teal-400)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 500,
              boxShadow: isSupported ? '0 0 16px rgba(13,148,136,0.3)' : undefined,
            }}
          >
            <Radio size={12} />
            Record
          </button>
        )}
      </div>

      {/* Add participant modal-ish inline */}
      {addingParticipant && (
        <div
          className="absolute top-full right-4 mt-1 p-3 rounded-lg z-50"
          style={{
            background: 'var(--ocean-800)',
            border: '1px solid var(--border-accent)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            width: 220,
          }}
        >
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
            ADD PARTICIPANT
          </p>
          <input
            ref={participantInputRef}
            value={participantName}
            onChange={e => setParticipantName(e.target.value)}
            onBlur={() => { handleParticipantSubmit(); }}
            onKeyDown={e => {
              if (e.key === 'Enter') handleParticipantSubmit()
              if (e.key === 'Escape') setAddingParticipant(false)
            }}
            placeholder="Name..."
            className="w-full px-2 py-1.5 rounded outline-none"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
            }}
          />
        </div>
      )}
    </nav>
  )
}
