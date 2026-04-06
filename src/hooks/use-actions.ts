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
const HISTORY_KEY = 'sessions-history'
const MAX_HISTORY = 20

export function useActions() {
  const [session, setSession] = useState<Session | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [keyPoints, setKeyPoints] = useState<string[]>([])
  const [sessionHistory, setSessionHistory] = useState<Session[]>([])
  const isExtractingRef = useRef(false)
  // Ref kept in sync with keyPoints so addKeyPoints can read latest value
  // without depending on the keyPoints state variable (avoids stale closures)
  const keyPointsRef = useRef<string[]>([])
  // Ref kept in sync with session so synthesizeSession never reads stale data
  const sessionRef = useRef<Session | null>(null)

  // Keep sessionRef in sync — lets synthesizeSession read current state without stale closure
  useEffect(() => { sessionRef.current = session }, [session])

  // Initialize session from localStorage or demo data
  useEffect(() => {
    const saved = loadSession<Session>(SESSION_KEY)
    if (saved && saved.actions.length > 0) {
      setSession(saved)
      // Bug fix: restore persisted key points on reload
      if (saved.keyPoints?.length) {
        setKeyPoints(saved.keyPoints)
        keyPointsRef.current = saved.keyPoints
      }
    } else {
      const demo = buildDemoSession()
      const newSess: Session = {
        id: generateId(),
        name: 'Q2 Planning',
        startedAt: Date.now(),
        participants: demo.participants,
        actions: demo.actions,
        transcript: [],
        keyPoints: [],
      }
      setSession(newSess)
      persistSession(SESSION_KEY, newSess)
    }
    const hist = loadSession<Session[]>(HISTORY_KEY) ?? []
    setSessionHistory(hist)
  }, [])

  const extractActionsFromText = useCallback(async (text: string, participants: Participant[], context = '', existingPoints: string[] = []) => {
    if (!text.trim() || isExtractingRef.current) return
    isExtractingRef.current = true
    setIsExtracting(true)

    try {
      const resp = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          context,
          participants: participants.map(p => p.name),
          existingPoints,
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
          description?: string
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
            description: a.description,
            // AI agent tasks start as assigned; human tasks need an email to become assigned
            status: a.assigneeType === 'agent' ? 'assigned' : 'actions' as ActionStatus,
            assigneeType: a.assigneeType,
            assigneeName: a.assigneeType === 'agent' ? 'AI Agent' : (a.assignee || 'Unassigned'),
            assigneeInitial: participant?.initial,
            assigneeColor: participant?.color,
            priority: a.priority || 'med',
            tag: (a.tag as ActionItem['tag']) || undefined,
            dueDate: a.dueDate,
            sourceText: text.slice(0, 100),
            createdAt: Date.now(),
            sessionId: prev.id,
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
        transcript: [...prev.transcript.slice(-100), line],
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

  const updateActionEmail = useCallback((actionId: string, email: string) => {
    setSession(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        actions: prev.actions.map(a => {
          if (a.id !== actionId) return a
          if (email) {
            // Update assignee to the email — shows as owner on the card
            const existing = a.assigneeEmails ?? []
            const emails = existing.includes(email) ? existing : [...existing, email]
            return {
              ...a,
              assigneeEmail: email,
              assigneeEmails: emails,
              assigneeName: email.split('@')[0],
              assigneeInitial: email[0].toUpperCase(),
            }
          }
          // Clearing email
          return { ...a, assigneeEmail: '', assigneeEmails: [], assigneeName: 'Unassigned', assigneeInitial: '?' }
        }),
      }
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

  const addActionsDirectly = useCallback((newActions: ActionItem[]) => {
    setSession(prev => {
      if (!prev) return prev
      // Stamp sessionId so bot-sourced actions are bound to the correct session
      const stamped = newActions.map(a => a.sessionId ? a : { ...a, sessionId: prev.id })
      const updated = { ...prev, actions: [...stamped, ...prev.actions] }
      persistSession(SESSION_KEY, updated)
      return updated
    })
  }, [])

  // Bug fix: split into two independent state updates instead of nesting
  // setSession inside setKeyPoints updater (React anti-pattern)
  const addKeyPoints = useCallback((newPoints: string[]) => {
    if (!newPoints.length) return
    const updated = [...keyPointsRef.current, ...newPoints].slice(-50)
    keyPointsRef.current = updated
    setKeyPoints(updated)
    setSession(s => {
      if (!s) return s
      const updatedSession = { ...s, keyPoints: updated }
      persistSession(SESSION_KEY, updatedSession)
      return updatedSession
    })
  }, [])

  // Returns the new action ID so callers can highlight it
  const createActionFromPoint = useCallback((pointText: string): string => {
    const newId = generateId()
    setSession(prev => {
      if (!prev) return prev
      const action: ActionItem = {
        id: newId,
        text: pointText,
        status: 'actions' as ActionStatus,
        assigneeType: 'human',
        assigneeName: 'Unassigned',
        priority: 'med',
        createdAt: Date.now(),
        sessionId: prev.id,
      }
      const updated = { ...prev, actions: [action, ...prev.actions] }
      persistSession(SESSION_KEY, updated)
      return updated
    })
    return newId
  }, [])

  const newSession = useCallback(() => {
    setKeyPoints([])
    keyPointsRef.current = []
    setSession(prev => {
      if (prev) {
        const hist = loadSession<Session[]>(HISTORY_KEY) ?? []
        // Guard against React StrictMode double-invocation
        if (!hist.find(s => s.id === prev.id)) {
          const archived = { ...prev, endedAt: Date.now() }
          const updatedHist = [archived, ...hist].slice(0, MAX_HISTORY)
          persistSession(HISTORY_KEY, updatedHist)
          setSessionHistory(updatedHist)
        }
      }
      const fresh: Session = {
        id: generateId(),
        name: 'New Meeting',
        startedAt: Date.now(),
        participants: prev?.participants ?? [],
        actions: prev?.actions ?? [],
        transcript: [],
        keyPoints: [],
      }
      persistSession(SESSION_KEY, fresh)
      return fresh
    })
  }, [])

  // Called when recording stops — runs a final synthesis pass over the full transcript
  const synthesizeSession = useCallback(async () => {
    const current = sessionRef.current
    if (!current || current.transcript.length < 3) return

    setIsSynthesizing(true)
    try {
      const transcriptText = current.transcript
        .map(line => `[${line.participantName}]: ${line.text}`)
        .join('\n')

      const resp = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptText,
          keyPoints: keyPointsRef.current,
          actions: current.actions.map(a => ({
            id: a.id,
            text: a.text,
            description: a.description,
            assigneeName: a.assigneeName,
            assigneeType: a.assigneeType,
            priority: a.priority,
            dueDate: a.dueDate,
            tag: a.tag,
          })),
          participants: current.participants.map(p => p.name),
        }),
      })

      if (!resp.ok) return

      const data = await resp.json() as {
        keyPoints: string[]
        actionPatches: Array<{
          id: string
          text?: string
          description: string
          priority?: 'high' | 'med' | 'low'
          dueDate?: string
          tag?: ActionItem['tag']
        }>
        removeIds: string[]
      }

      // Apply revised key points
      if (data.keyPoints?.length) {
        keyPointsRef.current = data.keyPoints
        setKeyPoints(data.keyPoints)
      }

      // Apply deduplication + patches in a single state update
      setSession(prev => {
        if (!prev) return prev

        const removeSet = new Set<string>(data.removeIds ?? [])
        const patchMap = new Map((data.actionPatches ?? []).map(p => [p.id, p]))

        const updatedActions = prev.actions
          .filter(a => !removeSet.has(a.id))
          .map(a => {
            const patch = patchMap.get(a.id)
            if (!patch) return a
            return {
              ...a,
              ...(patch.text ? { text: patch.text } : {}),
              description: patch.description,
              ...(patch.priority ? { priority: patch.priority } : {}),
              ...(patch.dueDate ? { dueDate: patch.dueDate } : {}),
              ...(patch.tag ? { tag: patch.tag } : {}),
            }
          })

        const finalKeyPoints = data.keyPoints?.length ? data.keyPoints : keyPointsRef.current
        const updated = { ...prev, actions: updatedActions, keyPoints: finalKeyPoints }
        persistSession(SESSION_KEY, updated)
        return updated
      })
    } catch (err) {
      console.error('Synthesis failed:', err)
    } finally {
      setIsSynthesizing(false)
    }
  }, [])

  return {
    session,
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
    addActionsDirectly,
    newSession,
    synthesizeSession,
    createActionFromPoint,
  }
}
