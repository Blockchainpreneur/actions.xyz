import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { pushEvent } from '@/lib/sse-manager'

export const runtime = 'nodejs'

// Reuse Groq client across calls
let groqClient: Groq | null = null
function getGroq(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return groqClient
}

export async function POST(req: NextRequest) {
  const meetingId = req.nextUrl.searchParams.get('meetingId')
  if (!meetingId) return NextResponse.json({ error: 'meetingId required' }, { status: 400 })

  const formData = await req.formData()
  const audioFile = formData.get('audio') as File | null
  if (!audioFile || audioFile.size < 500) return NextResponse.json({ ok: true })

  const groq = getGroq()
  if (!groq) return NextResponse.json({ ok: true })

  // Step 1: Transcribe
  let text = ''
  try {
    const result = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      response_format: 'json',
      language: 'en',
    })
    text = result.text?.trim() ?? ''
  } catch (err) {
    console.error('[bot/audio] transcribe error:', err)
    return NextResponse.json({ ok: true })
  }

  if (!text) return NextResponse.json({ ok: true })

  // Push transcript line to SSE stream
  pushEvent(meetingId, { type: 'transcript', text, ts: Date.now() })

  // Step 2: Extract action items via Groq Llama 3
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Extract action items from meeting transcript. Return JSON only:
{"actions":[{"task":"...","assignee":"...","assigneeType":"human"|"agent","priority":"high"|"med"|"low","tag":"engineering"|"design"|"data"|"ops"|"content"|"product"|"automated"}],"participants":["Name1"]}
Return empty arrays if nothing actionable. No markdown.`,
        },
        { role: 'user', content: `Extract action items: "${text}"` },
      ],
      temperature: 0.1,
      max_tokens: 512,
    })

    const raw = response.choices[0]?.message?.content?.trim() ?? ''
    try {
      const parsed = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, '')) as { actions?: unknown[]; participants?: unknown[] }
      if (parsed.actions?.length) {
        pushEvent(meetingId, { type: 'actions', actions: parsed.actions, participants: parsed.participants ?? [] })
      }
    } catch {}
  } catch (err) {
    console.error('[bot/audio] extract error:', err)
  }

  return NextResponse.json({ ok: true })
}
