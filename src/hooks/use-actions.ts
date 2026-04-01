'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { generateId, buildDemoSession, loadSession, persistSession, getParticipantColor, nameToInitial } from '@/lib/utils'
import {
  type ActionItem,
  type ActionStatus,
  type Participant,
  type Session,
  type TranscriptLine,
  COLOR_KEYS,
  PARTICIPANT_COLORS,
} from '@/lib/types'

const SESSION_KEY = 'current-session'

export function useActions() {
  const [session, setSession] = useState<Session | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const isExtractingRef = useRef(false)

  // Initialize session from localStorage or demo data
  useEffect(() => {
    const saved = loadSession<Session>(SESSION_KEY)
    if (saved && saved.actions.length > 0) {
      setSession(saved)
    } else {
      const demo = buildDemoSession()
      const newSession: Session = {
        id: generateId(),
        name: 'Q2 Planning',
        startedAt: Date.now(),
        participants: demo.participants,
        actions: demo.actions,
        transcript: [],
      }
      setSession(newSession)
      persistSession(SESSION_KEY, newSession)
    }
  }, [])

  const saveSession = useCallback((updated: Session) => {
    setSession(updated)
    persistSession(SESSION_KEY, updated)
  }, [])

  // Extract action items from a transcript text via Claude API
  const extractActionsFromText = useCallback(async (text: string, participants: Participant[]) => {
    if (!text.trim() || isExtractingRef.current) return
    isExtractingRef.current = true
    setIsExtracting(true)

    try {
      const resp = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          participants: participants.map(p => p.name),
        }),
      })

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({})) as { error?: string }
        setExtractError(errBody.error ?? `Extract API error ${resp.status}`)
        return
      }
      setExtractError(null)

      const data = await resp.json() as {
        actions: Array<{
          task: string
          assignee: string
          assigneeType: 'human' | 'agent'
          priority: 'high' | 'med' | 'low'
          tag?: string
          dueDate?: string
        }>
        participants: string[]
      }

      if (!data.actions?.length) return

      setSession(prev => {
        if (!prev) return prev

        // Auto-add new participants found in this transcript
        let updatedParticipants = [...prev.participants]
        for (const pName of (data.participants ?? [])) {
          if (!updatedParticipants.find(p => p.name.toLowerCase() === pName.toLowerCase())) {
            const colorKey = getParticipantColor(updatedParticipants.length)
            updatedParticipants = [
              ...updatedParticipants,
              {
                id: generateId(),
                name: pName,
                initial: nameToInitial(pName),
                color: colorKey,
              },
            ]
          }
        }

        const newActions: ActionItem[] = data.actions.map(a => {
          const participant = updatedParticipants.find(
            p => p.name.toLowerCase() === a.assignee.toLowerCase()
          )
          return {
            id: generateId(),
            text: a.task,
            status: 'captured' as ActionStatus,
            assigneeType: a.assigneeType,
            assigneeName: a.assigneeType === 'agent' ? 'AI Agent' : (a.assignee || 'Unassigned'),
            assigneeInitial: participant?.initial,
            assigneeColor: participant?.color,
            priority: a.priority || 'med',
            tag: (a.tag as ActionItem['tag']) || undefined,
            dueDate: a.dueDate,
            sourceText: text.slice(0, 100),
            createdAt: Date.now(),
          }
        })

        const updated = {
          ...prev,
          participants: updatedParticipants,
          actions: [...newActions, ...prev.actions],
        }
        persistSession(SESSION_KEY, updated)
        return updated
      })
    } catch (err) {
      console.error('Extract failed:', err)
      setExtractError(err instanceof Error ? err.message : 'Extract failed')
    } finally {
      isExtractingRef.current = false
      setIsExtracting(false)
    }
  }, [])

  const addTranscriptLine = useCallback((text: string, participantId?: string) => {
    setSession(prev => {
      if (!prev) return prev

      // Find or use first participant as default speaker
      const participant = participantId
        ? prev.participants.find(p => p.id === participantId) ?? prev.participants[0]
        : prev.participants[0] ?? { id: 'unknown', name: 'Unknown', initial: '?', color: 'indigo' }

      const line: TranscriptLine = {
        id: generateId(),
        participantId: participant.id,
        participantName: participant.name,
        participantInitial: participant.initial,
        participantColor: participant.color,
        text,
        timestamp: Date.now(),
      }

      const updated = {
        ...prev,
        transcript: [...prev.transcript.slice(-100), line], // keep last 100 lines
      }
      persistSession(SESSION_KEY, updated)
      return updated
    })
  }, [])

  const moveAction = useCallback((actionId: string, status: ActionStatus) => {
    setSession(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        actions: prev.actions.map(a => a.id === actionId ? { ...a, status } : a),
      }
      persistSession(SESSION_KEY, updated)
      return updated
    })
  }, [])

  const deleteAction = useCallback((actionId: string) => {
    setSession(prev => {
      if (!prev) return prev
      const updated = { ...prev, actions: prev.actions.filter(a => a.id !== actionId) }
      persistSession(SESSION_KEY, updated)
      return updated
    })
  }, [])

  const updateSessionName = useCallback((name: string) => {
    setSession(prev => {
      if (!prev) return prev
      const updated = { ...prev, name }
      persistSession(SESSION_KEY, updated)
      return updated
    })
  }, [])

  const addParticipant = useCallback((name: string) => {
    setSession(prev => {
      if (!prev) return prev
      if (prev.participants.find(p => p.name.toLowerCase() === name.toLowerCase())) return prev
      const colorKey = getParticipantColor(prev.participants.length)
      const updated = {
        ...prev,
        participants: [
          ...prev.participants,
          { id: generateId(), name, initial: nameToInitial(name), color: colorKey },
        ],
      }
      persistSession(SESSION_KEY, updated)
      return updated
    })
  }, [])

  // Add pre-built action items directly (used by bot SSE stream)
  const addActionsDirectly = useCallback((newActions: ActionItem[]) => {
    setSession(prev => {
      if (!prev) return prev
      const updated = { ...prev, actions: [...newActions, ...prev.actions] }
      persistSession(SESSION_KEY, updated)
      return updated
    })
  }, [])

  const newSession = useCallback(() => {
    const fresh: Session = {
      id: generateId(),
      name: 'New Meeting',
      startedAt: Date.now(),
      participants: [],
      actions: [],
      transcript: [],
    }
    saveSession(fresh)
  }, [saveSession])

  return {
    session,
    isExtracting,
    extractError,
    extractActionsFromText,
    addTranscriptLine,
    moveAction,
    deleteAction,
    updateSessionName,
    addParticipant,
    addActionsDirectly,
    newSession,
  }
}
