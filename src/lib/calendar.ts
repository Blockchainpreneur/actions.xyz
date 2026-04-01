import { google } from 'googleapis'

export interface CalendarMeeting {
  id: string
  title: string
  startTime: number   // epoch ms
  endTime: number
  meetUrl: string
  attendees: string[]
}

export async function getUpcomingMeetings(accessToken: string): Promise<CalendarMeeting[]> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: 'v3', auth })

  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: tomorrow.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20,
  })

  const events = res.data.items ?? []

  return events
    .filter(e => Boolean(e.hangoutLink))
    .map(e => ({
      id: e.id ?? Math.random().toString(36),
      title: e.summary ?? 'Untitled Meeting',
      startTime: new Date(e.start?.dateTime ?? e.start?.date ?? now).getTime(),
      endTime: new Date(e.end?.dateTime ?? e.end?.date ?? now).getTime(),
      meetUrl: e.hangoutLink!,
      attendees: (e.attendees ?? []).map(a => a.email ?? a.displayName ?? '').filter(Boolean),
    }))
}
