'use client'

import { useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useActions } from '@/hooks/use-actions'
import { useCalendar } from '@/hooks/use-calendar'
import { useBot } from '@/hooks/use-bot'
import { MeetingListener } from '@/components/meeting-listener'
import { SessionNav } from '@/components/session-nav'
import { TranscriptSidebar } from '@/components/transcript-sidebar'
import { PipelineBoard } from '@/components/pipeline-board'
import { generateId, getParticipantColor, nameToInitial } from '@/lib/utils'
import type { ActionItem, Participant } from '@/lib/types'

export default function Home() {
  const { data: session } = useSession()
  const {
    session: meetingSession,
    isExtracting,
    extractError,
    extractActionsFromText,
    addTranscriptLine,
    moveAction,
    deleteAction,
    updateSessionName,
    addParticipant,
    newSession,
    addActionsDirectly,
  } = useActions()

  const [newestActionId, setNewestActionId] = useState<string | undefined>()
  const { meetings, upcomingMeeting, isSignedIn, loading: calendarLoading, refresh: refreshCalendar } = useCalendar()

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

  const handleExtract = useCallback(async (text: string) => {
    if (!meetingSession) return
    await extractActionsFromText(text, meetingSession.participants)
    setTimeout(() => setNewestActionId(undefined), 2000)
  }, [meetingSession, extractActionsFromText])

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
      session={meetingSession}
      onTranscriptLine={addTranscriptLine}
      onExtractRequest={handleExtract}
    >
      {({ isListening, isSupported, interimText, error, startListening, stopListening }) => (
        <div className="flex flex-col" style={{ height: '100vh' }}>
          <SessionNav
            session={meetingSession}
            isListening={isListening}
            isSupported={isSupported}
            onStartRecording={startListening}
            onStopRecording={stopListening}
            onAddParticipant={addParticipant}
            onUpdateName={updateSessionName}
            onNewSession={newSession}
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
              lines={meetingSession.transcript}
              interimText={interimText}
              isListening={isListening}
              isExtracting={isExtracting}
              meetings={meetings}
              isSignedIn={isSignedIn}
              calendarLoading={calendarLoading}
              activeMeetingId={activeMeetingId}
              botStatus={botStatus}
              onStartBot={startBot}
              onStopBot={stopBot}
              onRefreshCalendar={refreshCalendar}
              userEmail={session?.user?.email}
            />
            <PipelineBoard
              session={meetingSession}
              newestActionId={newestActionId}
              onMove={moveAction}
              onDelete={deleteAction}
            />
          </div>
        </div>
      )}
    </MeetingListener>
  )
}
