'use client'

import { useCallback, useRef } from 'react'
import { useSpeech } from '@/hooks/use-speech'

const EXTRACT_BUFFER_MS = 3000  // wait 3 seconds of silence — lets complete thoughts form
const MIN_EXTRACT_LENGTH = 40   // skip tiny fragments (filler words, single phrases)
const CONTEXT_WINDOW_CHARS = 1500 // rolling context: last N chars of finalized transcript

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
  const pendingBufferRef = useRef<string>('')
  // Rolling context: last CONTEXT_WINDOW_CHARS of confirmed transcript
  // Sent alongside the current buffer so both APIs have full conversational context
  const contextBufferRef = useRef<string>('')

  // Always-current refs — stable callbacks don't go stale
  const onTranscriptLineRef = useRef(onTranscriptLine)
  onTranscriptLineRef.current = onTranscriptLine
  const onExtractRequestRef = useRef(onExtractRequest)
  onExtractRequestRef.current = onExtractRequest
  const onSummarizeRequestRef = useRef(onSummarizeRequest)
  onSummarizeRequestRef.current = onSummarizeRequest

  const scheduleExtract = useCallback((text: string) => {
    pendingBufferRef.current += ' ' + text

    if (extractTimerRef.current) clearTimeout(extractTimerRef.current)

    if (pendingBufferRef.current.trim().length >= MIN_EXTRACT_LENGTH) {
      extractTimerRef.current = setTimeout(() => {
        const buf = pendingBufferRef.current.trim()
        if (buf) {
          const ctx = contextBufferRef.current.trim()
          onExtractRequestRef.current(buf, ctx)
          onSummarizeRequestRef.current(buf, ctx)
          // Roll context forward: append buf, keep last CONTEXT_WINDOW_CHARS
          const combined = (ctx + ' ' + buf).trim()
          contextBufferRef.current = combined.slice(-CONTEXT_WINDOW_CHARS)
          pendingBufferRef.current = ''
        }
      }, EXTRACT_BUFFER_MS)
    }
  }, []) // stable — reads from refs

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (!isFinal) return
    onTranscriptLineRef.current(text)
    scheduleExtract(text)
  }, [scheduleExtract]) // scheduleExtract is stable

  const speech = useSpeech({
    onTranscript: handleTranscript,
  })

  return <>{children(speech)}</>
}
