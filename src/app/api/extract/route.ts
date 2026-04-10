import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

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

  const narrativeSection = existingPoints.length > 0
    ? `Meeting context so far:\n${existingPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n`
    : ''

  const contextSection = context.trim()
    ? `Recent transcript (don't re-extract from this):\n${context.trim()}\n\n`
    : ''

  const systemPrompt = `You extract action items from meeting transcripts. Return valid JSON only.

Participants: ${participants.length ? participants.join(', ') : 'unknown'}

Extract when someone:
- Commits to do something ("I'll...", "I will...", "Let me...")
- Is assigned work ("Can you...", "[Name] will...", "[Name] should...")
- A decision creates follow-up work
- A deadline or blocker is mentioned

Skip: vague ideas, rhetorical questions, status updates, things already done.

Assignee rules:
- Named person if they committed or were explicitly assigned
- "AI Agent" with assigneeType "agent" for automated tasks
- "Unassigned" if unclear

For each action, write a description with:
1. CONTEXT: Why this matters (1-2 sentences)
2. STEPS: 2-4 concrete next steps
3. FLOW: Simple diagram with arrows, e.g. [A] → [B] → [C]

Return ONLY this JSON (no markdown, no backticks):
{"actions":[{"task":"short title","description":"CONTEXT: ...\nSTEPS:\n1. ...\n2. ...\nFLOW: [A] → [B]","assignee":"Name","assigneeType":"human","priority":"high|med|low","tag":"engineering|design|data|ops|content|product|automated","dueDate":"optional"}],"participants":["Name1"]}`

  const groq = new Groq({ apiKey })

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `${narrativeSection}${contextSection}Extract actions from this:\n"${text}"`,
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    })

    const rawText = response.choices[0]?.message?.content?.trim() ?? ''
    console.log('[extract] Groq response length:', rawText.length, 'preview:', rawText.slice(0, 200))

    if (!rawText) {
      console.error('[extract] Empty response from Groq')
      return NextResponse.json({ actions: [], participants: [] })
    }

    try {
      // Strip markdown code fences if present
      let jsonText = rawText
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      jsonText = jsonText.trim()

      // Find the JSON object if there's surrounding text
      const jsonStart = jsonText.indexOf('{')
      const jsonEnd = jsonText.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonText = jsonText.slice(jsonStart, jsonEnd + 1)
      }

      const parsed = JSON.parse(jsonText) as { actions: unknown[]; participants: unknown[] }
      const actions = Array.isArray(parsed.actions) ? parsed.actions : []
      const newParticipants = Array.isArray(parsed.participants) ? parsed.participants : []

      console.log('[extract] Parsed', actions.length, 'actions')
      return NextResponse.json({ actions, participants: newParticipants })
    } catch (parseErr) {
      console.error('[extract] JSON parse failed:', parseErr, 'raw:', rawText.slice(0, 300))
      return NextResponse.json({ actions: [], participants: [] })
    }
  } catch (err) {
    console.error('[extract] Groq API error:', err)
    const msg = err instanceof Error ? err.message : 'Extract failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
