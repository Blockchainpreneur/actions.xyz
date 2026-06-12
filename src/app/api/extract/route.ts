import { NextRequest, NextResponse } from 'next/server'
import { extractActions } from '@/lib/extraction'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
  }

  const body = await req.json() as { text: string; context?: string; participants: string[]; existingPoints?: string[] }
  const { text, context = '', participants, existingPoints = [] } = body

  if (!text?.trim()) {
    return NextResponse.json({ actions: [], participants: [] })
  }

  try {
    const result = await extractActions(apiKey, { text, context, participants, existingPoints })
    console.log('[extract] Parsed', result.actions.length, 'actions')
    return NextResponse.json(result)
  } catch (err) {
    console.error('[extract] Groq API error:', err)
    const msg = err instanceof Error ? err.message : 'Extract failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
