'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Radio, Square, RefreshCw, Moon, Sun } from 'lucide-react'
import { type Session } from '@/lib/types'
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

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') as 'dark' | 'light' | null
    setTheme(current ?? 'dark')
  }, [])

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      try { localStorage.setItem('theme', next) } catch {}
      return next
    })
  }, [])

  return { theme, toggle }
}

export function SessionNav({
  session, isListening, isSupported,
  onStartRecording, onStopRecording,
  onAddParticipant, onUpdateName, onNewSession,
}: SessionNavProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [addingParticipant, setAddingParticipant] = useState(false)
  const [participantName, setParticipantName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const participantInputRef = useRef<HTMLInputElement>(null)
  const { theme, toggle } = useTheme()

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
      className="glass flex items-center flex-shrink-0"
      style={{
        height: 52,
        borderBottom: '1px solid var(--border-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      {/* Left — logo + new */}
      <div className="flex items-center gap-3" style={{ flex: '0 0 auto' }}>
        {/* Logo mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="var(--text-muted)" strokeWidth="1" />
            <path d="M7 4.5v2.5l1.5 1.5" stroke="var(--teal-400)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.04em',
            color: 'var(--text-muted)',
          }}>
            actions<span style={{ color: 'var(--teal-400)' }}>.xyz</span>
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: 'var(--border-primary)' }} />

        <button
          onClick={onNewSession}
          className="btn-press flex items-center gap-1.5"
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
          }}
          title="New session"
        >
          <RefreshCw size={10} />
          New
        </button>
      </div>

      {/* Center — session title (the hero element) */}
      <div className="flex-1 flex items-center justify-center gap-3">
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={e => {
              if (e.key === 'Enter') handleNameSubmit()
              if (e.key === 'Escape') setEditingName(false)
            }}
            style={{
              background: 'var(--surface-3)',
              border: '1px solid var(--border-accent)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'var(--font-body)',
              letterSpacing: '-0.01em',
              padding: '3px 10px',
              width: 240,
              outline: 'none',
              textAlign: 'center',
            }}
          />
        ) : (
          <button
            onClick={() => { setNameValue(session?.name ?? ''); setEditingName(true) }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'text',
              padding: '3px 8px',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'var(--font-body)',
              letterSpacing: '-0.015em',
            }}
            className="hover:opacity-70 transition-opacity"
          >
            {session?.name ?? 'Untitled Meeting'}
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
            className="btn-press flex items-center justify-center rounded-full"
            style={{
              width: 24,
              height: 24,
              marginLeft: (session?.participants.length ?? 0) > 0 ? -6 : 0,
              background: 'var(--surface-2)',
              border: '1px dashed var(--border-primary)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
            title="Add participant"
          >
            <Plus size={9} />
          </button>
        </div>
      </div>

      {/* Right — theme + record */}
      <div className="flex items-center gap-2" style={{ flex: '0 0 auto' }}>
        <button
          onClick={toggle}
          className="btn-press flex items-center justify-center rounded-md"
          style={{
            width: 30,
            height: 30,
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
        </button>

        {isListening ? (
          <button
            onClick={onStopRecording}
            className="btn-press flex items-center gap-2 rounded-lg"
            style={{
              padding: '6px 14px',
              background: 'rgba(240, 96, 96, 0.1)',
              border: '1px solid rgba(240, 96, 96, 0.22)',
              color: '#f87171',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-record"
              style={{ background: '#f87171', boxShadow: '0 0 5px rgba(240,96,96,0.6)', flexShrink: 0 }}
            />
            Recording
            <Square size={9} />
          </button>
        ) : (
          <button
            onClick={onStartRecording}
            disabled={!isSupported}
            className="btn-press flex items-center gap-2 rounded-lg disabled:opacity-35 disabled:cursor-not-allowed"
            style={{
              padding: '6px 14px',
              background: 'var(--teal-500)',
              border: '1px solid var(--teal-400)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: isSupported ? '0 0 18px rgba(14,145,136,0.25), 0 1px 3px rgba(0,0,0,0.3)' : undefined,
            }}
          >
            <Radio size={11} />
            Record
          </button>
        )}
      </div>

      {/* Add participant dropdown */}
      {addingParticipant && (
        <div
          className="absolute top-full animate-slide-up"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: 6,
            padding: '12px 14px',
            borderRadius: 10,
            background: 'var(--gray-800)',
            border: '1px solid var(--border-accent)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            width: 220,
            zIndex: 60,
          }}
        >
          <p style={{
            fontSize: 9,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 8,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Add participant
          </p>
          <input
            ref={participantInputRef}
            value={participantName}
            onChange={e => setParticipantName(e.target.value)}
            onBlur={() => { handleParticipantSubmit() }}
            onKeyDown={e => {
              if (e.key === 'Enter') handleParticipantSubmit()
              if (e.key === 'Escape') setAddingParticipant(false)
            }}
            placeholder="Name..."
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              background: 'var(--surface-3)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              outline: 'none',
            }}
          />
        </div>
      )}
    </nav>
  )
}
