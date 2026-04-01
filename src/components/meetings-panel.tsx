'use client'

import { signIn, signOut } from 'next-auth/react'
import { Calendar, LogIn, LogOut, Bot, BotOff, Clock, RefreshCw } from 'lucide-react'
import type { CalendarMeeting } from '@/lib/calendar'
import type { BotStatus } from '@/lib/bot-manager'

interface MeetingsPanelProps {
  meetings: CalendarMeeting[]
  isSignedIn: boolean
  loading: boolean
  activeMeetingId: string | null
  botStatus: BotStatus
  onStartBot: (meeting: CalendarMeeting) => void
  onStopBot: () => void
  onRefresh: () => void
  userEmail?: string | null
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

export function MeetingsPanel({
  meetings,
  isSignedIn,
  loading,
  activeMeetingId,
  botStatus,
  onStartBot,
  onStopBot,
  onRefresh,
  userEmail,
}: MeetingsPanelProps) {
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
            background: 'var(--teal-500)',
            border: '1px solid var(--teal-400)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 0 16px rgba(13,148,136,0.3)',
          }}
        >
          <LogIn size={14} />
          Sign in with Google
        </button>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          Reads calendar events only.<br />No data stored.
        </p>
      </div>
    )
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
