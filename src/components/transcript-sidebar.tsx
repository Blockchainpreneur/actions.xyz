'use client'

import { useEffect, useRef, useState } from 'react'
import { type TranscriptLine } from '@/lib/types'
import { formatTime } from '@/lib/utils'
import { ParticipantAvatar } from './participant-avatar'
import { MeetingsPanel } from './meetings-panel'
import type { CalendarMeeting } from '@/lib/calendar'
import type { BotStatus } from '@/lib/bot-manager'

interface TranscriptSidebarProps {
  lines: TranscriptLine[]
  interimText: string
  isListening: boolean
  isExtracting: boolean
  // meetings panel props
  meetings: CalendarMeeting[]
  isSignedIn: boolean
  calendarLoading: boolean
  activeMeetingId: string | null
  botStatus: BotStatus
  onStartBot: (meeting: CalendarMeeting) => void
  onStopBot: () => void
  onRefreshCalendar: () => void
  userEmail?: string | null
}

type Tab = 'transcript' | 'meetings'

export function TranscriptSidebar({
  lines, interimText, isListening, isExtracting,
  meetings, isSignedIn, calendarLoading, activeMeetingId, botStatus,
  onStartBot, onStopBot, onRefreshCalendar, userEmail,
}: TranscriptSidebarProps) {
  const [tab, setTab] = useState<Tab>('transcript')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines.length, interimText])

  // Auto-switch to meetings tab when user signs in
  useEffect(() => {
    if (isSignedIn) setTab('meetings')
  }, [isSignedIn])

  return (
    <aside
      className="flex flex-col flex-shrink-0"
      style={{
        width: 288,
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--border-primary)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Tab switcher */}
      <div
        className="flex flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        {(['transcript', 'meetings'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-xs font-medium transition-colors capitalize"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: tab === t ? 'var(--cyan-400)' : 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--cyan-400)' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {t}
            {t === 'meetings' && !isSignedIn && (
              <span
                className="ml-1 w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: 'var(--teal-400)', verticalAlign: 'middle' }}
              />
            )}
            {t === 'meetings' && activeMeetingId && (
              <span
                className="ml-1 w-1.5 h-1.5 rounded-full inline-block animate-pulse-live"
                style={{ background: '#4ade80', verticalAlign: 'middle' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Meetings panel */}
      {tab === 'meetings' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <MeetingsPanel
            meetings={meetings}
            isSignedIn={isSignedIn}
            loading={calendarLoading}
            activeMeetingId={activeMeetingId}
            botStatus={botStatus}
            onStartBot={onStartBot}
            onStopBot={onStopBot}
            onRefresh={onRefreshCalendar}
            userEmail={userEmail}
          />
        </div>
      )}

      {/* Transcript panel */}
      {tab === 'transcript' && <>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Transcript
        </span>
        {isListening && (
          <span
            className="flex items-center gap-1.5 px-2 py-0.5 rounded"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#4ade80',
              background: 'rgba(74, 222, 128, 0.08)',
              border: '1px solid rgba(74, 222, 128, 0.15)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-live"
              style={{ background: '#4ade80' }}
            />
            Live
          </span>
        )}
        {!isListening && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
            }}
          >
            {lines.length} lines
          </span>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        {lines.length === 0 && !isListening && (
          <div
            className="flex flex-col items-center justify-center gap-3 pt-12"
            style={{ color: 'var(--text-muted)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border-subtle)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </svg>
            </div>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                textAlign: 'center',
                lineHeight: 1.6,
                letterSpacing: '0.04em',
              }}
            >
              Press Record to start<br />capturing your meeting
            </p>
          </div>
        )}

        {lines.map((line) => (
          <TranscriptEntry key={line.id} line={line} />
        ))}

        {/* Interim text (currently being spoken) */}
        {interimText && (
          <div className="flex gap-2 items-start animate-transcript-in opacity-60">
            <div
              className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center"
              style={{ background: 'var(--surface-3)', fontSize: 8, color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
            >
              ?
            </div>
            <div>
              <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                {interimText}
                <span
                  className="inline-block w-0.5 h-3 ml-0.5 align-text-bottom animate-blink-cursor"
                  style={{ background: 'var(--cyan-400)' }}
                />
              </p>
            </div>
          </div>
        )}

        {isExtracting && (
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded"
            style={{
              background: 'rgba(13,148,136,0.06)',
              border: '1px solid rgba(13,148,136,0.12)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--teal-400)',
            }}
          >
            <span className="animate-pulse-record inline-block w-1.5 h-1.5 rounded-full bg-teal-400" />
            extracting actions...
          </div>
        )}

        <div ref={bottomRef} />
      </div>
      </>}
    </aside>
  )
}

function TranscriptEntry({ line }: { line: TranscriptLine }) {
  return (
    <div className="flex gap-2 items-start animate-transcript-in">
      <ParticipantAvatar
        name={line.participantName}
        initial={line.participantInitial}
        colorKey={line.participantColor}
        size="xs"
        className="flex-shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 500,
              color: 'var(--text-primary)',
              letterSpacing: '0.02em',
            }}
          >
            {line.participantName}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
            {formatTime(line.timestamp)}
          </span>
        </div>
        <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
          {line.text}
        </p>
        {line.extractedActions && line.extractedActions.length > 0 && (
          <div
            className="mt-1.5 px-2 py-1 rounded-sm"
            style={{
              background: 'rgba(34,211,238,0.05)',
              borderLeft: '2px solid var(--cyan-400)',
            }}
          >
            {line.extractedActions.map((a, i) => (
              <p
                key={i}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--cyan-300)',
                  lineHeight: 1.5,
                }}
              >
                → {a}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
