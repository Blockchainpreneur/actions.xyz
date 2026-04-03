'use client'

import { useState } from 'react'
import { signIn, signOut } from 'next-auth/react'
import { Calendar, LogIn, LogOut, Bot, BotOff, Clock, RefreshCw } from 'lucide-react'
import type { CalendarMeeting } from '@/lib/calendar'
import type { BotStatus } from '@/lib/bot-manager'
import type { Session } from '@/lib/types'

interface MeetingsPanelProps {
  meetings: CalendarMeeting[]
  isSignedIn: boolean
  hasCalendarAccess: boolean
  loading: boolean
  activeMeetingId: string | null
  botStatus: BotStatus
  onStartBot: (meeting: CalendarMeeting) => void
  onStopBot: () => void
  onRefresh: () => void
  userEmail?: string | null
  pastSessions?: Session[]
}

const STATUS_LABELS: Record<BotStatus, string> = {
  launching: 'Launching...',
  joining: 'Joining...',
  admitted: 'Admitted',
  recording: 'Recording',
  stopped: 'Stopped',
  error: 'Error',
}

const STATUS_COLORS: Record<BotStatus, string> = {
  launching: 'var(--cyan-400)',
  joining: 'var(--warning)',
  admitted: 'var(--teal-400)',
  recording: '#4ade80',
  stopped: 'var(--text-muted)',
  error: 'var(--error)',
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function timeUntil(ts: number): string {
  const diff = ts - Date.now()
  if (diff < 0) return 'now'
  const m = Math.round(diff / 60000)
  if (m < 60) return `in ${m}m`
  return `in ${Math.round(m / 60)}h`
}

function SessionDetail({ session, onBack }: { session: Session; onBack: () => void }) {
  // For archived sessions: only show actions explicitly stamped with this session's id.
  // For the live session (no endedAt): also include legacy unstamped actions so old data isn't lost.
  const isArchived = !!session.endedAt
  const sessionActions = session.actions.filter(a =>
    isArchived ? a.sessionId === session.id : (!a.sessionId || a.sessionId === session.id)
  )
  const hasContent = (session.keyPoints?.length ?? 0) > 0 || sessionActions.length > 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <button onClick={onBack} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.name}</p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {new Date(session.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4">
        {/* Key points */}
        {session.keyPoints && session.keyPoints.length > 0 && (
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Key points</p>
            <div className="flex flex-col gap-1.5">
              {session.keyPoints.map((pt, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span style={{ color: 'var(--cyan-400)', fontSize: 14, lineHeight: '18px', flexShrink: 0, opacity: 0.6 }}>·</span>
                  <p style={{ fontSize: 11, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{pt}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Actions — only this session's */}
        {sessionActions.length > 0 && (
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
              Actions · {sessionActions.length}
            </p>
            <div className="flex flex-col gap-1.5">
              {sessionActions.map(a => (
                <div key={a.id} className="flex items-start gap-2 px-2 py-1.5 rounded" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: a.priority === 'high' ? '#ef4444' : a.priority === 'med' ? '#f59e0b' : '#475569' }} />
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.4 }}>{a.text}</p>
                    {a.assigneeName && a.assigneeName !== 'Unassigned' && (
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{a.assigneeName}{a.assigneeEmail ? ` · ${a.assigneeEmail}` : ''}</p>
                    )}
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>{a.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {!hasContent && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 16 }}>No data recorded</p>
        )}
      </div>
    </div>
  )
}

export function MeetingsPanel({
  meetings,
  isSignedIn,
  hasCalendarAccess,
  loading,
  activeMeetingId,
  botStatus,
  onStartBot,
  onStopBot,
  onRefresh,
  userEmail,
  pastSessions,
}: MeetingsPanelProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const selectedSession = selectedSessionId ? ((pastSessions ?? []).find(s => s.id === selectedSessionId) ?? null) : null

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-5 py-12">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--surface-3)', border: '1px solid var(--border-subtle)' }}
        >
          <Calendar size={18} style={{ color: 'var(--teal-400)' }} />
        </div>
        <div className="text-center">
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
            Sign in to continue
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Use your account or sign in with Google to also get calendar auto-join.
          </p>
        </div>
        <button
          onClick={() => signIn(undefined, { callbackUrl: window.location.href })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all w-full justify-center"
          style={{
            background: 'var(--teal-500)',
            border: '1px solid var(--teal-400)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 0 16px rgba(13,148,136,0.3)',
          }}
        >
          <LogIn size={14} />
          Sign in
        </button>
      </div>
    )
  }

  // Signed in with email but no Google Calendar access yet
  if (!hasCalendarAccess) {
    if (selectedSession) {
      return <SessionDetail session={selectedSession} onBack={() => setSelectedSessionId(null)} />
    }

    return (
      <div className="flex flex-col h-full">
        <div
          className="flex items-center justify-between px-3 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Meetings
          </span>
          <button
            onClick={() => signOut()}
            className="flex items-center justify-center w-5 h-5 rounded transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
            title={`Sign out (${userEmail})`}
          >
            <LogOut size={10} />
          </button>
        </div>
        {/* Scrollable body — connect calendar block + past recordings */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center gap-4 px-5 py-10">
            <Calendar size={20} style={{ color: 'var(--teal-400)', opacity: 0.7 }} />
            <div className="text-center">
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                Connect Google Calendar
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Auto-join your Google Meet calls and extract action items in real time.
              </p>
            </div>
            <button
              onClick={() => signIn('google', { callbackUrl: window.location.href })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all w-full justify-center"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connect Google Calendar
            </button>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
              Reads calendar events only.
            </p>
          </div>
          {/* Recordings */}
          {pastSessions && pastSessions.length > 0 && (
            <div className="px-3 pb-4">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                Recordings
              </p>
              {pastSessions.map(s => {
                const isCurrent = !s.endedAt
                const sessionActions = s.actions.filter(a => s.endedAt ? a.sessionId === s.id : (!a.sessionId || a.sessionId === s.id))
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSessionId(s.id)}
                    className="w-full text-left px-2.5 py-2 rounded-lg mb-1.5 transition-colors"
                    style={{
                      background: isCurrent ? 'rgba(74,222,128,0.04)' : 'var(--surface-1)',
                      border: `1px solid ${isCurrent ? 'rgba(74,222,128,0.15)' : 'var(--border-subtle)'}`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-live" style={{ background: '#4ade80' }} />
                      )}
                      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {s.name}
                      </p>
                      {isCurrent && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4ade80', flexShrink: 0 }}>live</span>
                      )}
                    </div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      {new Date(s.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {sessionActions.length > 0 ? ` · ${sessionActions.length} action${sessionActions.length !== 1 ? 's' : ''}` : ''}
                      {s.keyPoints?.length ? ` · ${s.keyPoints.length} note${s.keyPoints.length !== 1 ? 's' : ''}` : ''}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (selectedSession) {
    return <SessionDetail session={selectedSession} onBack={() => setSelectedSessionId(null)} />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-1.5">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Today's meetings
          </span>
          {loading && (
            <div
              className="w-3 h-3 rounded-full border border-t-transparent animate-spin"
              style={{ borderColor: 'var(--teal-400)', borderTopColor: 'transparent' }}
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onRefresh}
            className="flex items-center justify-center w-5 h-5 rounded transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <RefreshCw size={10} />
          </button>
          <button
            onClick={() => signOut()}
            className="flex items-center justify-center w-5 h-5 rounded transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
            title={`Sign out (${userEmail})`}
          >
            <LogOut size={10} />
          </button>
        </div>
      </div>

      {/* Active bot status */}
      {activeMeetingId && (
        <div
          className="mx-3 mt-2 px-2 py-2 rounded-lg flex items-center justify-between gap-2"
          style={{
            background: 'rgba(74,222,128,0.05)',
            border: '1px solid rgba(74,222,128,0.15)',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-live"
              style={{ background: STATUS_COLORS[botStatus] }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: STATUS_COLORS[botStatus],
                letterSpacing: '0.06em',
              }}
            >
              ⚡ {STATUS_LABELS[botStatus]}
            </span>
          </div>
          <button
            onClick={onStopBot}
            className="flex items-center gap-1 px-2 py-0.5 rounded transition-colors text-xs"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#fca5a5',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
            }}
          >
            <BotOff size={9} />
            Stop
          </button>
        </div>
      )}

      {/* Meeting list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
        {meetings.length === 0 && !loading && (
          <div
            className="flex flex-col items-center gap-2 pt-8"
            style={{ color: 'var(--text-muted)' }}
          >
            <Calendar size={20} style={{ opacity: 0.4 }} />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textAlign: 'center' }}>
              No Google Meet calls today
            </p>
          </div>
        )}

        {meetings.map(meeting => {
          const isActive = meeting.id === activeMeetingId
          const isUpcoming = meeting.startTime - Date.now() < 7 * 60_000 &&
            meeting.startTime - Date.now() > -2 * 60_000

          return (
            <div
              key={meeting.id}
              className="rounded-lg p-2.5 flex flex-col gap-2"
              style={{
                background: isActive ? 'rgba(74,222,128,0.04)' : 'var(--surface-1)',
                border: `1px solid ${isActive ? 'rgba(74,222,128,0.2)' : isUpcoming ? 'rgba(34,211,238,0.15)' : 'var(--border-subtle)'}`,
              }}
            >
              {/* Title + time */}
              <div className="flex items-start justify-between gap-2">
                <p
                  className="flex-1 leading-snug"
                  style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}
                >
                  {meeting.title}
                </p>
                {isUpcoming && (
                  <span
                    className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: 'var(--cyan-400)',
                      background: 'rgba(34,211,238,0.08)',
                      border: '1px solid rgba(34,211,238,0.15)',
                    }}
                  >
                    <Clock size={8} />
                    {timeUntil(meeting.startTime)}
                  </span>
                )}
              </div>

              {/* Time range */}
              <div className="flex items-center justify-between">
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--text-muted)',
                  }}
                >
                  {formatTime(meeting.startTime)} – {formatTime(meeting.endTime)}
                </span>
                {meeting.attendees.length > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Bot button */}
              {isActive ? (
                <div
                  className="flex items-center gap-1.5 text-xs"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: STATUS_COLORS[botStatus] }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse-live" style={{ background: STATUS_COLORS[botStatus] }} />
                  ⚡ {STATUS_LABELS[botStatus]}
                </div>
              ) : (
                <button
                  onClick={() => onStartBot(meeting)}
                  disabled={!!activeMeetingId}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded transition-all w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: isUpcoming ? 'var(--teal-500)' : 'var(--surface-2)',
                    border: `1px solid ${isUpcoming ? 'var(--teal-400)' : 'var(--border-subtle)'}`,
                    color: isUpcoming ? '#fff' : 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 500,
                    boxShadow: isUpcoming ? '0 0 12px rgba(13,148,136,0.25)' : undefined,
                  }}
                >
                  <Bot size={11} />
                  {isUpcoming ? 'Join with bot' : 'Send bot'}
                </button>
              )}
            </div>
          )
        })}

        {/* Recordings list */}
        {pastSessions && pastSessions.length > 0 && (
          <div className="mt-3">
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
              Recordings
            </p>
            {pastSessions.map(s => {
              const isCurrent = !s.endedAt
              const sessionActions = s.actions.filter(a => s.endedAt ? a.sessionId === s.id : (!a.sessionId || a.sessionId === s.id))
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  className="w-full text-left px-2.5 py-2 rounded-lg mb-1.5 transition-colors"
                  style={{
                    background: isCurrent ? 'rgba(74,222,128,0.04)' : 'var(--surface-1)',
                    border: `1px solid ${isCurrent ? 'rgba(74,222,128,0.15)' : 'var(--border-subtle)'}`,
                  }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isCurrent && (
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-live"
                        style={{ background: '#4ade80' }}
                      />
                    )}
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {s.name}
                    </p>
                    {isCurrent && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4ade80', flexShrink: 0 }}>live</span>
                    )}
                  </div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(s.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {sessionActions.length > 0 ? ` · ${sessionActions.length} action${sessionActions.length !== 1 ? 's' : ''}` : ''}
                    {s.keyPoints?.length ? ` · ${s.keyPoints.length} note${s.keyPoints.length !== 1 ? 's' : ''}` : ''}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer — signed in as */}
      {userEmail && (
        <div
          className="px-3 py-2 flex-shrink-0 flex items-center gap-1.5"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-xs"
            style={{ background: 'var(--surface-3)', color: 'var(--text-muted)', fontSize: 9 }}
          >
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userEmail}
          </span>
        </div>
      )}
    </div>
  )
}
