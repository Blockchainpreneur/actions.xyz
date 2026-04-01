import { NextRequest, NextResponse } from 'next/server'
import { getBotStatus, getActiveBots } from '@/lib/bot-manager'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const meetingId = req.nextUrl.searchParams.get('meetingId')

  if (meetingId) {
    const status = getBotStatus(meetingId)
    return NextResponse.json(status ?? { meetingId, status: 'stopped' })
  }

  return NextResponse.json(getActiveBots())
}
