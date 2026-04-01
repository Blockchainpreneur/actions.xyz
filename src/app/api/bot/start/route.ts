import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { launchBot, getBotStatus } from '@/lib/bot-manager'
import type { CalendarMeeting } from '@/lib/calendar'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as CalendarMeeting

  if (!body.meetUrl || !body.id) {
    return NextResponse.json({ error: 'meetUrl and id required' }, { status: 400 })
  }

  // Non-blocking — launch and return immediately
  launchBot(body).catch(err => console.error('[bot/start]', err))

  return NextResponse.json({ meetingId: body.id, status: 'launching' })
}
