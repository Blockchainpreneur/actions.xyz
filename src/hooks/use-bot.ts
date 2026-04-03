'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CalendarMeeting } from '@/lib/calendar'
import type { BotStatus } from '@/lib/bot-manager'
import { generateId, getParticipantColor, nameToInitial } from '@/lib/utils'
import type { ActionItem, ActionStatus, Participant } from '@/lib/types'

interface BotEvent {
  type: 'transcript' | 'actions'
  text?: string
  ts?: number
  actions?: Array<{
    task: string
    description?: string
    assignee: string
    assigneeType: 'human' | 'agent'
    priority: 'high' | 'med' | 'low'
    tag?: string
  }>
  participants?: string[]
}

interface UseBotOptions {
  onTranscriptLine: (text: string) => void
  onActionsExtracted: (actions: ActionItem[], newParticipants: Participant[]) => void
}

export function useBot({ onTranscriptLine, onActionsExtracted }: UseBotOptions) {
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null)
  const [botStatus, setBotStatus] = useState<BotStatus>('stopped')
  const evtSourceRef = useRef<EventSource | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const knownParticipantsRef = useRef<string[]>([])

  const pollStatus = useCallback(async (meetingId: string) => {
    try {
      const res = await fetch(`/api/bot/status?meetingId=${meetingId}`)
      if (res.ok) {
        const data = await res.json() as { status: BotStatus }
        setBotStatus(data.status)
        if (data.status === 'stopped' || data.status === 'error') {
          stopPolling()
          setActiveMeetingId(null)
        }
      }
    } catch {}
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (evtSourceRef.current) { evtSourceRef.current.close(); evtSourceRef.current = null }
  }, [])

  const connectSSE = useCallback((meetingId: string) => {
    if (evtSourceRef.current) evtSourceRef.current.close()

    const es = new EventSource(`/api/bot/events?meetingId=${meetingId}`)
    evtSourceRef.current = es

    es.onmessage = (e) => {
      if (!e.data || e.data.startsWith(':')) return // skip pings
      try {
        const event = JSON.parse(e.data) as BotEvent

        if (event.type === 'transcript' && event.text) {
          onTranscriptLine(event.text)
        }

        if (event.type === 'actions' && event.actions?.length) {
          // Build Participant objects for any new names
          const newParticipants: Participant[] = []
          for (const pName of (event.participants ?? [])) {
            if (!knownParticipantsRef.current.includes(pName.toLowerCase())) {
              knownParticipantsRef.current.push(pName.toLowerCase())
              const colorKey = getParticipantColor(knownParticipantsRef.current.length)
              newParticipants.push({
                id: generateId(),
                name: pName,
                initial: nameToInitial(pName),
                color: colorKey,
              })
            }
          }

          const actionItems: ActionItem[] = event.actions.map(a => {
            const participant = newParticipants.find(
              p => p.name.toLowerCase() === a.assignee.toLowerCase()
            )
            return {
              id: generateId(),
              text: a.task,
              description: a.description,
              // AI agent tasks start as assigned; human tasks need an email to become assigned
              status: a.assigneeType === 'agent' ? 'assigned' : 'actions' as ActionStatus,
              assigneeType: a.assigneeType,
              assigneeName: a.assigneeType === 'agent' ? 'AI Agent' : (a.assignee || 'Unassigned'),
              assigneeInitial: participant?.initial,
              assigneeColor: participant?.color,
              priority: a.priority || 'med',
              tag: (a.tag as ActionItem['tag']) || undefined,
              createdAt: Date.now(),
            }
          })

          onActionsExtracted(actionItems, newParticipants)
        }
      } catch {}
    }

    es.onerror = () => {
      // EventSource auto-reconnects; don't tear down unless bot stopped
    }
  }, [onTranscriptLine, onActionsExtracted])

  const startBot = useCallback(async (meeting: CalendarMeeting) => {
    setBotStatus('launching')
    setActiveMeetingId(meeting.id)
    knownParticipantsRef.current = meeting.attendees.map(a => a.toLowerCase())

    try {
      const res = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meeting),
      })
      if (!res.ok) throw new Error('Failed to start bot')

      connectSSE(meeting.id)

      // Poll status every 5 seconds
      pollRef.current = setInterval(() => pollStatus(meeting.id), 5000)
    } catch (err) {
      console.error('[useBot] start failed:', err)
      setBotStatus('error')
      setActiveMeetingId(null)
    }
  }, [connectSSE, pollStatus])

  const stopBot = useCallback(async () => {
    if (!activeMeetingId) return
    stopPolling()
    setBotStatus('stopped')
    const id = activeMeetingId
    setActiveMeetingId(null)
    try {
      await fetch('/api/bot/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: id }),
      })
    } catch {}
  }, [activeMeetingId, stopPolling])

  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  return {
    activeMeetingId,
    botStatus,
    isActive: botStatus === 'recording' || botStatus === 'admitted' || botStatus === 'joining',
    startBot,
    stopBot,
  }
}
