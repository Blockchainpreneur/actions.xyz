import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { stopBot } from '@/lib/bot-manager'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meetingId } = await req.json() as { meetingId: string }
  if (!meetingId) return NextResponse.json({ error: 'meetingId required' }, { status: 400 })

  await stopBot(meetingId)
  return NextResponse.json({ meetingId, status: 'stopped' })
}
