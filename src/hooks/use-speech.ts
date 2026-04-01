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
  chunkDurationMs?: number
}

const CHUNK_DURATION_MS = 5000 // send audio every 5 seconds

async function transcribeBlob(blob: Blob): Promise<string> {
  if (blob.size < 1000) return ''

  const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('ogg') ? 'ogg' : 'mp4'
  const file = new File([blob], `audio.${ext}`, { type: blob.type })

  const form = new FormData()
  form.append('audio', file)

  try {
    const res = await fetch('/api/transcribe', { method: 'POST', body: form })
    if (!res.ok) return ''
    const data = await res.json() as { text: string }
    return data.text?.trim() ?? ''
  } catch {
    return ''
  }
}

export function useSpeech({ onTranscript, chunkDurationMs = CHUNK_DURATION_MS }: UseSpeechOptions) {
  const [state, setState] = useState<SpeechState>({
    isListening: false,
    isSupported: false,
    interimText: '',
    error: null,
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isListeningRef = useRef(false)

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
    setState(s => ({ ...s, isSupported: supported }))
  }, [])

  const flushChunks = useCallback(async (mimeType: string) => {
    const collected = chunksRef.current.slice()
    chunksRef.current = []
    if (!collected.length) return

    const blob = new Blob(collected, { type: mimeType })
    setState(s => ({ ...s, interimText: '...' }))
    const text = await transcribeBlob(blob)
    setState(s => ({ ...s, interimText: '' }))

    if (text) {
      onTranscript(text, true)
    }
  }, [onTranscript])

  // Schedule the next chunk stop — always targets mediaRecorderRef.current so it
  // works correctly even after the recorder has been replaced by onstop.
  const scheduleNextStop = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }, chunkDurationMs)
  }, [chunkDurationMs])

  const createRecorder = useCallback((stream: MediaStream) => {
    // Pick the best supported mime type
    const mimeType = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ].find(t => MediaRecorder.isTypeSupported(t)) ?? ''

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      const actualMime = recorder.mimeType || 'audio/webm'
      await flushChunks(actualMime)

      // Restart if still listening and schedule the next chunk
      if (isListeningRef.current && streamRef.current) {
        const next = createRecorder(streamRef.current)
        mediaRecorderRef.current = next
        next.start()
        scheduleNextStop()
      }
    }

    return recorder
  }, [flushChunks, scheduleNextStop])

  const startListening = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState(s => ({ ...s, error: 'Microphone access not supported in this browser.' }))
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      isListeningRef.current = true
      setState(s => ({ ...s, isListening: true, error: null }))

      const recorder = createRecorder(stream)
      mediaRecorderRef.current = recorder
      recorder.start()
      scheduleNextStop()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied.'
      setState(s => ({ ...s, error: msg, isListening: false }))
    }
  }, [createRecorder, scheduleNextStop])

  const stopListening = useCallback(() => {
    isListeningRef.current = false

    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (mediaRecorderRef.current?.state !== 'inactive') {
      try { mediaRecorderRef.current?.stop() } catch {}
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    mediaRecorderRef.current = null
    chunksRef.current = []
    setState(s => ({ ...s, isListening: false, interimText: '' }))
  }, [])

  useEffect(() => {
    return () => {
      isListeningRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      if (mediaRecorderRef.current?.state !== 'inactive') {
        try { mediaRecorderRef.current?.stop() } catch {}
      }
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  return { ...state, startListening, stopListening }
}
