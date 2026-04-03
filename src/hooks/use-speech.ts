'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface SpeechState {
  isListening: boolean
  isSupported: boolean
  interimText: string
  error: string | null
}

interface UseSpeechOptions {
  onTranscript: (text: string, isFinal: boolean) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWindow = Window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any

function getSpeechRecognition(): (new () => AnyRecognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as AnyWindow
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useSpeech({ onTranscript }: UseSpeechOptions) {
  const [state, setState] = useState<SpeechState>({
    isListening: false,
    isSupported: false,
    interimText: '',
    error: null,
  })

  const recognitionRef = useRef<AnyRecognition | null>(null)
  const isListeningRef = useRef(false)
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  useEffect(() => {
    setState(s => ({ ...s, isSupported: Boolean(getSpeechRecognition()) }))
  }, [])

  const startListening = useCallback(() => {
    const SR = getSpeechRecognition()
    if (!SR) {
      setState(s => ({ ...s, error: 'Speech recognition not supported. Use Chrome or Edge.' }))
      return
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          onTranscriptRef.current(t.trim(), true)
        } else {
          interim += t
        }
      }
      setState(s => ({ ...s, interimText: interim }))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setState(s => ({ ...s, error: 'Microphone access denied.', isListening: false }))
        isListeningRef.current = false
      }
      // 'no-speech', 'network', 'aborted' are non-fatal — recognition auto-restarts via onend
    }

    recognition.onend = () => {
      // Browser stops recognition after a pause. Restart if still listening.
      if (isListeningRef.current) {
        try { recognition.start() } catch { /* already started */ }
      } else {
        setState(s => ({ ...s, isListening: false, interimText: '' }))
      }
    }

    recognitionRef.current = recognition
    isListeningRef.current = true
    setState(s => ({ ...s, isListening: true, error: null }))

    try {
      recognition.start()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start microphone.'
      setState(s => ({ ...s, error: msg, isListening: false }))
      isListeningRef.current = false
    }
  }, [])

  const stopListening = useCallback(() => {
    isListeningRef.current = false
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ok */ }
      recognitionRef.current = null
    }
    setState(s => ({ ...s, isListening: false, interimText: '' }))
  }, [])

  useEffect(() => {
    return () => {
      isListeningRef.current = false
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch { /* ok */ }
      }
    }
  }, [])

  return { ...state, startListening, stopListening }
}
