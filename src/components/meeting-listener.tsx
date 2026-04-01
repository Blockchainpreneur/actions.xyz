'use client'

import { useCallback, useRef, useState } from 'react'
import { useSpeech } from '@/hooks/use-speech'
import { type Session } from '@/lib/types'

const EXTRACT_BUFFER_MS = 4000 // extract actions after 4 seconds of silence
const MIN_EXTRACT_LENGTH = 20 // min chars before extracting

interface MeetingListenerProps {
  session: Session
  onTranscriptLine: (text: string) => void
  onExtractRequest: (text: string) => void
  children: (props: {
    isListening: boolean
    isSupported: boolean
    interimText: string
    error: string | null
    startListening: () => void
    stopListening: () => void
  }) => React.ReactNode
}

export function MeetingListener({ session, onTranscriptLine, onExtractRequest, children }: MeetingListenerProps) {
  const extractTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingBufferRef = useRef<string>('')

  const scheduleExtract = useCallback((text: string) => {
    pendingBufferRef.current += ' ' + text

    if (extractTimerRef.current) clearTimeout(extractTimerRef.current)

    if (pendingBufferRef.current.trim().length >= MIN_EXTRACT_LENGTH) {
      extractTimerRef.current = setTimeout(() => {
        const buf = pendingBufferRef.current.trim()
        if (buf) {
          onExtractRequest(buf)
          pendingBufferRef.current = ''
        }
      }, EXTRACT_BUFFER_MS)
    }
  }, [onExtractRequest])

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (!isFinal) return
    onTranscriptLine(text)
    scheduleExtract(text)
  }, [onTranscriptLine, scheduleExtract])

  const speech = useSpeech({
    onTranscript: handleTranscript,
  })

  return <>{children(speech)}</>
}
