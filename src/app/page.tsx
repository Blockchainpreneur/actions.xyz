'use client'

import { useCallback, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useActions } from '@/hooks/use-actions'
import { useCalendar } from '@/hooks/use-calendar'
import { useBot } from '@/hooks/use-bot'
import { MeetingListener } from '@/components/meeting-listener'
import { SessionNav } from '@/components/session-nav'
import { UpgradeModal } from '@/components/upgrade-modal'
import { TranscriptSidebar } from '@/components/transcript-sidebar'
import { PipelineBoard } from '@/components/pipeline-board'
import { generateId, getParticipantColor, nameToInitial } from '@/lib/utils'
import type { ActionItem, Participant } from '@/lib/types'

export default function Home() {
  const { data: session } = useSession()
  const {
    session: meetingSession,
    isExtracting,
    isSynthesizing,
    extractError,
    keyPoints,
    sessionHistory,
    addKeyPoints,
    extractActionsFromText,
    addTranscriptLine,
    moveAction,
    deleteAction,
    updateActionEmail,
    updateSessionName,
    addParticipant,
    newSession,
    addActionsDirectly,
    createActionFromPoint,
    synthesizeSession,
  } = useActions()

  const [newestActionId, setNewestActionId] = useState<string | undefined>()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [upgradeLimit, setUpgradeLimit] = useState<number | null>(null)
  const meetingSessionRef = useRef(meetingSession)
  meetingSessionRef.current = meetingSession
  // Ref so callbacks never go stale while accumulating key points
  const keyPointsRef = useRef(keyPoints)
  keyPointsRef.current = keyPoints

  const { meetings, upcomingMeeting, isSignedIn, hasCalendarAccess, loading: calendarLoading, refresh: refreshCalendar } = useCalendar()

  // Called by the bot SSE stream when new actions arrive from a meeting
  const handleBotActions = useCallback((actions: ActionItem[], newParticipants: Participant[]) => {
    newParticipants.forEach(p => addParticipant(p.name))
    addActionsDirectly(actions)
    if (actions[0]) {
      setNewestActionId(actions[0].id)
      setTimeout(() => setNewestActionId(undefined), 2000)
    }
  }, [addParticipant, addActionsDirectly])

  const { activeMeetingId, botStatus, startBot, stopBot } = useBot({
    onTranscriptLine: addTranscriptLine,
    onActionsExtracted: handleBotActions,
  })

  const handleExtract = useCallback(async (text: string, context: string) => {
    if (!meetingSessionRef.current) return
    // Pass key points as narrative context so task descriptions have full meeting story
    await extractActionsFromText(text, meetingSessionRef.current.participants, context, keyPointsRef.current)
    setTimeout(() => setNewestActionId(undefined), 2000)
  }, [extractActionsFromText])

  const handleSummarize = useCallback(async (text: string, _context: string) => {
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Use structured key points as context — richer than raw transcript chars
        body: JSON.stringify({ text, existingPoints: keyPointsRef.current }),
      })
      if (res.ok) {
        const data = await res.json() as { points: string[] }
        addKeyPoints(data.points)
      }
    } catch { /* silent — summary is best-effort */ }
  }, [addKeyPoints])

  // Assign emails to a task — calls the DB API which creates ghost users + sends emails
  // Also auto-moves task to "assigned" + updates assignee name locally
  const handleAssignEmails = useCallback(async (taskId: string, emails: string[]) => {
    if (!emails.length) return
    const firstEmail = emails[0]

    // Optimistic: update assignee name + move to assigned
    updateActionEmail(taskId, firstEmail)
    const action = meetingSessionRef.current?.actions.find(a => a.id === taskId)
    if (action) {
      if (action.status === 'actions') moveAction(taskId, 'assigned')
    }

    // Call DB API — creates ghost user + sends notification email
    try {
      await fetch(`/api/db/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      })
    } catch { /* best effort */ }
  }, [moveAction, updateActionEmail])

  // New meeting goes through the server first — it's both the usage ledger and
  // the freemium gate (402 = free monthly limit reached → upgrade modal).
  // Signed-out users (401) and infra errors fall back to local-only creation.
  const handleNewSession = useCallback(async () => {
    try {
      const res = await fetch('/api/db/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Meeting' }),
      })
      if (res.status === 402) {
        const data = await res.json().catch(() => ({})) as { limit?: number }
        setUpgradeLimit(data.limit ?? 5)
        return
      }
    } catch { /* offline — proceed locally */ }
    newSession()
  }, [newSession])

  if (!meetingSession) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--teal-400)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <MeetingListener
      onTranscriptLine={addTranscriptLine}
      onExtractRequest={handleExtract}
      onSummarizeRequest={handleSummarize}
    >
      {({ isListening, isSupported, interimText, error, startListening, stopListening }) => (
        <div className="flex flex-col" style={{ height: '100vh' }}>
          <SessionNav
            session={meetingSession}
            isListening={isListening}
            isSupported={isSupported}
            onStartRecording={startListening}
            onStopRecording={() => {
              stopListening()  // flushes pending buffer → triggers final extraction
              // Delay synthesis so the last extraction completes first
              setTimeout(() => synthesizeSession(), 4000)
            }}
            onAddParticipant={addParticipant}
            onUpdateName={updateSessionName}
            onNewSession={handleNewSession}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed(v => !v)}
          />

          {!isSupported && (
            <div
              className="px-4 py-2 text-xs flex items-center gap-2"
              style={{
                background: 'rgba(245,158,11,0.08)',
                borderBottom: '1px solid rgba(245,158,11,0.15)',
                color: '#fcd34d',
                fontFamily: 'var(--font-mono)',
              }}
            >
              ⚠ Mic recording requires browser permission. Bot auto-join works independently.
            </div>
          )}

          {error && (
            <div
              className="px-4 py-2 text-xs"
              style={{
                background: 'rgba(239,68,68,0.08)',
                borderBottom: '1px solid rgba(239,68,68,0.12)',
                color: '#fca5a5',
                fontFamily: 'var(--font-mono)',
              }}
            >
              ⚠ {error}
            </div>
          )}

          {extractError && (
            <div
              className="px-4 py-2 text-xs"
              style={{
                background: 'rgba(239,68,68,0.08)',
                borderBottom: '1px solid rgba(239,68,68,0.12)',
                color: '#fca5a5',
                fontFamily: 'var(--font-mono)',
              }}
            >
              ⚠ Extract error: {extractError}
            </div>
          )}

          <div className="flex flex-1 min-h-0">
            <TranscriptSidebar
              isListening={isListening}
              isExtracting={isExtracting}
              isSynthesizing={isSynthesizing}
              interimText={interimText}
              meetings={meetings}
              isSignedIn={isSignedIn}
              hasCalendarAccess={hasCalendarAccess}
              calendarLoading={calendarLoading}
              activeMeetingId={activeMeetingId}
              botStatus={botStatus}
              onStartBot={startBot}
              onStopBot={stopBot}
              onRefreshCalendar={refreshCalendar}
              userEmail={session?.user?.email}
              pastSessions={meetingSession ? [meetingSession, ...sessionHistory] : sessionHistory}
              collapsed={sidebarCollapsed}
            />
            <PipelineBoard
              session={meetingSession}
              newestActionId={newestActionId}
              onMove={moveAction}
              onDelete={deleteAction}
              onUpdateEmail={updateActionEmail}
              onAssignEmails={handleAssignEmails}
            />
          </div>

          <UpgradeModal
            open={upgradeLimit !== null}
            limit={upgradeLimit ?? undefined}
            onClose={() => setUpgradeLimit(null)}
          />
        </div>
      )}
    </MeetingListener>
  )
}
