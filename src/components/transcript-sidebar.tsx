'use client'

import { useEffect, useRef, useState } from 'react'
import { MeetingsPanel } from './meetings-panel'
import type { CalendarMeeting } from '@/lib/calendar'
import type { BotStatus } from '@/lib/bot-manager'
import type { Session } from '@/lib/types'

interface TranscriptSidebarProps {
  keyPoints: string[]
  interimText: string
  isListening: boolean
  isExtracting: boolean
  isSynthesizing: boolean
  onCreateActionFromPoint: (text: string) => void
  meetings: CalendarMeeting[]
  isSignedIn: boolean
  hasCalendarAccess: boolean
  calendarLoading: boolean
  activeMeetingId: string | null
  botStatus: BotStatus
  onStartBot: (meeting: CalendarMeeting) => void
  onStopBot: () => void
  onRefreshCalendar: () => void
  userEmail?: string | null
  pastSessions?: Session[]
}

type Tab = 'notes' | 'meetings'

export function TranscriptSidebar({
  keyPoints, interimText, isListening, isExtracting, isSynthesizing, onCreateActionFromPoint,
  meetings, isSignedIn, hasCalendarAccess, calendarLoading, activeMeetingId, botStatus,
  onStartBot, onStopBot, onRefreshCalendar, userEmail, pastSessions,
}: TranscriptSidebarProps) {
  const [tab, setTab] = useState<Tab>('notes')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [keyPoints.length, interimText])

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
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Tab bar — segmented control style */}
      <div
        className="flex items-center gap-1 flex-shrink-0 px-3 py-2.5"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        {(['notes', 'meetings'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="btn-press relative flex-1 py-1.5 rounded-md capitalize transition-all"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: tab === t ? 500 : 400,
              color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
              background: tab === t ? 'var(--surface-3)' : 'transparent',
              border: tab === t ? '1px solid var(--border-subtle)' : '1px solid transparent',
              boxShadow: tab === t ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
              cursor: 'pointer',
            }}
          >
            {t}
            {/* Live dot indicators */}
            {t === 'meetings' && !isSignedIn && (
              <span
                className="absolute top-1 right-1.5 w-1 h-1 rounded-full"
                style={{ background: 'var(--teal-400)' }}
              />
            )}
            {t === 'meetings' && activeMeetingId && (
              <span
                className="absolute top-1 right-1.5 w-1 h-1 rounded-full animate-pulse-live"
                style={{ background: '#4ade80' }}
              />
            )}
            {t === 'notes' && isListening && (
              <span
                className="absolute top-1 right-1.5 w-1 h-1 rounded-full animate-pulse-live"
                style={{ background: '#4ade80' }}
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
            hasCalendarAccess={hasCalendarAccess}
            loading={calendarLoading}
            activeMeetingId={activeMeetingId}
            botStatus={botStatus}
            onStartBot={onStartBot}
            onStopBot={onStopBot}
            onRefresh={onRefreshCalendar}
            userEmail={userEmail}
            pastSessions={pastSessions}
          />
        </div>
      )}

      {/* Notes panel */}
      {tab === 'notes' && (
        <>
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                Key Points
              </span>
              {keyPoints.length > 0 && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--text-muted)',
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 20,
                    padding: '1px 5px',
                  }}
                >
                  {keyPoints.length}
                </span>
              )}
            </div>
            {isListening && (
              <span
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#4ade80',
                  background: 'rgba(74, 222, 128, 0.07)',
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
          </div>

          {/* Key points feed */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
            {keyPoints.length === 0 && !isListening && (
              <div className="flex flex-col items-center justify-center gap-3 pt-14">
                {/* Minimal notepad icon */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="var(--text-muted)" strokeWidth="1" />
                    <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" />
                    <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" />
                    <line x1="4.5" y1="10" x2="7.5" y2="10" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    textAlign: 'center',
                    lineHeight: 1.7,
                    letterSpacing: '0.03em',
                    color: 'var(--text-muted)',
                  }}
                >
                  Key points appear here<br />as you speak
                </p>
              </div>
            )}

            {keyPoints.length === 0 && isListening && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-md"
                style={{
                  background: 'rgba(74,222,128,0.04)',
                  border: '1px solid rgba(74,222,128,0.1)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-live"
                  style={{ background: '#4ade80' }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  Listening...
                </span>
              </div>
            )}

            {keyPoints.map((point, i) => (
              <KeyPoint key={i} text={point} onCreateAction={() => onCreateActionFromPoint(point)} />
            ))}

            {/* Interim speech */}
            {interimText && (
              <div
                className="flex gap-2.5 items-start animate-transcript-in px-1 py-1"
                style={{ opacity: 0.45 }}
              >
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--cyan-400)',
                    flexShrink: 0,
                    marginTop: 8,
                    opacity: 0.5,
                  }}
                />
                <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)', fontStyle: 'italic', flex: 1 }}>
                  {interimText}
                  <span
                    className="inline-block w-0.5 h-3 ml-0.5 align-text-bottom animate-blink-cursor"
                    style={{ background: 'var(--cyan-400)' }}
                  />
                </p>
              </div>
            )}

            {/* Synthesis indicator — shown after recording stops while the final pass runs */}
            {isSynthesizing && (
              <div
                className="flex items-center gap-2 px-2.5 py-2 rounded-md mt-1"
                style={{
                  background: 'rgba(14,145,134,0.06)',
                  border: '1px solid rgba(14,145,134,0.18)',
                }}
              >
                <span className="animate-pulse-record inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--teal-400)' }} />
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.07em', color: 'var(--teal-400)', textTransform: 'uppercase', display: 'block' }}>
                    Synthesizing
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    Refining notes + tasks from full transcript...
                  </span>
                </div>
              </div>
            )}

            {/* Extracting indicator */}
            {isExtracting && !isSynthesizing && (
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md mt-1"
                style={{
                  background: 'rgba(14,145,134,0.05)',
                  border: '1px solid rgba(14,145,134,0.12)',
                }}
              >
                <span className="animate-pulse-record inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--teal-400)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.07em', color: 'var(--teal-400)', textTransform: 'uppercase' }}>
                  extracting...
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </>
      )}
    </aside>
  )
}

function KeyPoint({ text, onCreateAction }: { text: string; onCreateAction: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="flex gap-2.5 items-start animate-transcript-in rounded-md transition-colors"
      style={{
        padding: '7px 8px',
        marginLeft: -8,
        marginRight: -8,
        background: hovered ? 'var(--surface-2)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        style={{
          width: 3,
          height: 3,
          borderRadius: '50%',
          background: 'var(--cyan-400)',
          flexShrink: 0,
          marginTop: 8,
          opacity: 0.5,
        }}
      />
      <p style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--text-secondary)', wordBreak: 'break-word', flex: 1 }}>
        {text}
      </p>
      <button
        onClick={onCreateAction}
        title="Add to pipeline"
        className="btn-press flex-shrink-0"
        style={{
          opacity: hovered ? 1 : 0,
          width: 18,
          height: 18,
          borderRadius: 5,
          background: 'var(--surface-3)',
          border: '1px solid var(--border-accent)',
          color: 'var(--cyan-400)',
          fontSize: 13,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 100ms ease',
        }}
      >
        +
      </button>
    </div>
  )
}
