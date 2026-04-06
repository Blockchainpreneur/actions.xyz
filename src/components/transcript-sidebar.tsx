'use client'

import { MeetingsPanel } from './meetings-panel'
import type { CalendarMeeting } from '@/lib/calendar'
import type { BotStatus } from '@/lib/bot-manager'
import type { Session } from '@/lib/types'

interface MeetingSidebarProps {
  isListening: boolean
  isExtracting: boolean
  isSynthesizing: boolean
  interimText: string
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
  collapsed: boolean
}

export function TranscriptSidebar({
  isListening, isExtracting, isSynthesizing, interimText,
  meetings, isSignedIn, hasCalendarAccess, calendarLoading, activeMeetingId, botStatus,
  onStartBot, onStopBot, onRefreshCalendar, userEmail, pastSessions, collapsed,
}: MeetingSidebarProps) {
  if (collapsed) return null

  return (
    <aside
      className="flex flex-col flex-shrink-0"
      style={{
        width: 272,
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--border-primary)',
      }}
    >
      {/* Live recording status — top third */}
      <div
        className="flex-shrink-0"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          minHeight: 100,
          maxHeight: '33%',
          overflow: 'hidden',
        }}
      >
        {(isListening || activeMeetingId) ? (
          <div className="px-3 py-3 flex flex-col gap-2">
            {/* Recording indicator */}
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-record"
                style={{ background: '#f87171' }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f87171' }}>
                {activeMeetingId ? 'Bot Recording' : 'Mic Recording'}
              </span>
            </div>

            {/* Interim speech */}
            {interimText && (
              <p style={{ fontSize: 11, lineHeight: 1.6, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {interimText}
                <span className="inline-block w-0.5 h-3 ml-0.5 align-text-bottom animate-blink-cursor" style={{ background: 'var(--cyan-400)' }} />
              </p>
            )}

            {/* Status badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {isSynthesizing && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--teal-400)', background: 'rgba(14,145,134,0.08)', border: '1px solid rgba(14,145,134,0.15)' }}>
                  <span className="animate-pulse-record inline-block w-1 h-1 rounded-full" style={{ background: 'var(--teal-400)' }} />
                  Synthesizing
                </span>
              )}
              {isExtracting && !isSynthesizing && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--teal-400)', background: 'rgba(14,145,134,0.08)', border: '1px solid rgba(14,145,134,0.15)' }}>
                  <span className="animate-pulse-record inline-block w-1 h-1 rounded-full" style={{ background: 'var(--teal-400)' }} />
                  Extracting
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6 px-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="7" stroke="var(--text-muted)" strokeWidth="1" opacity="0.4" />
              <path d="M10 6v4l2.5 2.5" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
            </svg>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, letterSpacing: '0.03em' }}>
              Not recording
            </p>
          </div>
        )}
      </div>

      {/* Meetings list — scrollable bottom */}
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
    </aside>
  )
}
