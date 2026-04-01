import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getUpcomingMeetings } from '@/lib/calendar'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getServerSession(authOptions)
  // @ts-expect-error — accessToken added in jwt callback
  const accessToken = session?.accessToken as string | undefined

  if (!accessToken) {
    return NextResponse.json([], { status: 401 })
  }

  try {
    const meetings = await getUpcomingMeetings(accessToken)
    return NextResponse.json(meetings)
  } catch (err) {
    console.error('Calendar API error:', err)
    return NextResponse.json([], { status: 500 })
  }
}
