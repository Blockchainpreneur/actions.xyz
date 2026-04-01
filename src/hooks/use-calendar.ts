'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { CalendarMeeting } from '@/lib/calendar'

const POLL_INTERVAL = 60_000  // 1 minute
const AUTO_JOIN_WINDOW_MS = 7 * 60_000  // 7 minutes before start
const ACTIVE_WINDOW_MS = 2 * 60_000     // 2 minutes after start (still "upcoming")

export function useCalendar() {
  const { data: session, status } = useSession()
  const [meetings, setMeetings] = useState<CalendarMeeting[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSignedIn = status === 'authenticated'

  const fetchMeetings = useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    try {
      const res = await fetch('/api/calendar')
      if (res.ok) {
        const data = await res.json() as CalendarMeeting[]
        setMeetings(data)
        setError(null)
      } else if (res.status === 401) {
        setError('auth')
      }
    } catch {
      setError('network')
    } finally {
      setLoading(false)
    }
  }, [isSignedIn])

  useEffect(() => {
    if (!isSignedIn) return
    fetchMeetings()
    const id = setInterval(fetchMeetings, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [isSignedIn, fetchMeetings])

  // The meeting that's starting soon (±window)
  const upcomingMeeting = meetings.find(m => {
    const delta = m.startTime - Date.now()
    return delta > -ACTIVE_WINDOW_MS && delta < AUTO_JOIN_WINDOW_MS
  }) ?? null

  // Minutes until next meeting
  const nextMeeting = meetings[0] ?? null
  const minutesUntilNext = nextMeeting
    ? Math.round((nextMeeting.startTime - Date.now()) / 60_000)
    : null

  return {
    meetings,
    upcomingMeeting,
    nextMeeting,
    minutesUntilNext,
    isSignedIn,
    loading,
    error,
    refresh: fetchMeetings,
  }
}
