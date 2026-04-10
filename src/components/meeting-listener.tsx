'use client'

import { useCallback, useRef } from 'react'
import { useSpeech } from '@/hooks/use-speech'

const EXTRACT_BUFFER_MS = 2000  // wait 2 seconds of silence — shorter for real meetings
const MIN_EXTRACT_LENGTH = 20   // low threshold — let the LLM decide if it's actionable
const CONTEXT_WINDOW_CHARS = 1500 // rolling context: last N chars of finalized transcript
const MAX_BUFFER_AGE_MS = 15000  // force extraction every 15s even if user keeps talking

interface MeetingListenerProps {
  onTranscriptLine: (text: string) => void
  onExtractRequest: (text: string, context: string) => void
  onSummarizeRequest: (text: string, context: string) => void
  children: (props: {
    isListening: boolean
    isSupported: boolean
    interimText: string
    error: string | null
    startListening: () => void
    stopListening: () => void
  }) => React.ReactNode
}

export function MeetingListener({ onTranscriptLine, onExtractRequest, onSummarizeRequest, children }: MeetingListenerProps) {
  const extractTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxAgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingBufferRef = useRef<string>('')
  const bufferStartTimeRef = useRef<number>(0)
  // Rolling context: last CONTEXT_WINDOW_CHARS of confirmed transcript
  const contextBufferRef = useRef<string>('')

  // Always-current refs — stable callbacks don't go stale
  const onTranscriptLineRef = useRef(onTranscriptLine)
  onTranscriptLineRef.current = onTranscriptLine
  const onExtractRequestRef = useRef(onExtractRequest)
  onExtractRequestRef.current = onExtractRequest
  const onSummarizeRequestRef = useRef(onSummarizeRequest)
  onSummarizeRequestRef.current = onSummarizeRequest

  const doExtract = useCallback(() => {
    if (extractTimerRef.current) { clearTimeout(extractTimerRef.current); extractTimerRef.current = null }
    if (maxAgeTimerRef.current) { clearTimeout(maxAgeTimerRef.current); maxAgeTimerRef.current = null }
    const buf = pendingBufferRef.current.trim()
    if (buf && buf.length >= MIN_EXTRACT_LENGTH) {
      const ctx = contextBufferRef.current.trim()
      onExtractRequestRef.current(buf, ctx)
      onSummarizeRequestRef.current(buf, ctx)
      const combined = (ctx + ' ' + buf).trim()
      contextBufferRef.current = combined.slice(-CONTEXT_WINDOW_CHARS)
    }
    pendingBufferRef.current = ''
    bufferStartTimeRef.current = 0
  }, [])

  // Flush any pending buffer immediately (called when recording stops)
  const flushPendingBuffer = useCallback(() => {
    doExtract()
  }, [doExtract])

  const scheduleExtract = useCallback((text: string) => {
    pendingBufferRef.current += ' ' + text

    // Track when buffer started accumulating
    if (!bufferStartTimeRef.current) bufferStartTimeRef.current = Date.now()

    if (extractTimerRef.current) clearTimeout(extractTimerRef.current)

    // Force extraction if buffer has been accumulating too long (nonstop talking)
    const bufferAge = Date.now() - bufferStartTimeRef.current
    if (bufferAge >= MAX_BUFFER_AGE_MS) {
      doExtract()
      return
    }

    // Schedule extraction after silence
    if (pendingBufferRef.current.trim().length >= MIN_EXTRACT_LENGTH) {
      extractTimerRef.current = setTimeout(doExtract, EXTRACT_BUFFER_MS)

      // Also set a max-age timer as fallback
      if (!maxAgeTimerRef.current) {
        maxAgeTimerRef.current = setTimeout(doExtract, MAX_BUFFER_AGE_MS - bufferAge)
      }
    }
  }, [doExtract])

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (!isFinal) return
    onTranscriptLineRef.current(text)
    scheduleExtract(text)
  }, [scheduleExtract])

  const speech = useSpeech({
    onTranscript: handleTranscript,
  })

  // Wrap stopListening to flush buffer first
  const wrappedStopListening = useCallback(() => {
    flushPendingBuffer()
    speech.stopListening()
  }, [flushPendingBuffer, speech.stopListening])

  return <>{children({ ...speech, stopListening: wrappedStopListening })}</>
}
