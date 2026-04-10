import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ points: [] })
  }

  const body = await req.json() as { text: string; context?: string; existingPoints?: string[] }
  const { text, existingPoints = [] } = body

  if (!text?.trim() || text.trim().length < 20) {
    return NextResponse.json({ points: [] })
  }

  // Use structured key points as context — richer than raw transcript, doesn't lose early meeting
  const narrativeContext = existingPoints.length > 0
    ? `MEETING STORY SO FAR (do NOT repeat or restate any of these — only add what is new):
${existingPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

`
    : ''

  const groq = new Groq({ apiKey })

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a meeting analyst writing narrative notes like Granola — clear enough that someone who wasn't in the meeting can understand what happened, what was decided, and why it matters.

Given a transcript segment and the meeting story so far, add 1-3 new key moments that advance the story.

WHAT TO CAPTURE:
• Decisions — what was agreed and why ("The team decided to drop MongoDB because...")
• Problems — specific issues raised with context ("Sarah flagged a mobile auth bug causing logouts, timed to the v2 release")
• Commitments — who will do what and when ("Marcus took ownership of the pricing doc, deadline Thursday")
• Important context — background that changes how work is understood ("This is blocking the enterprise renewal, clients are waiting")

WHAT TO SKIP:
• Anything already captured in the meeting story above
• Filler, small talk, vague discussion with no substance
• Repetitive statements, clarifications that add nothing new

FORMAT RULES — this is critical:
• Each key moment is 1-2 sentences, 20-60 words
• Write in past tense, third person: "The team decided...", "Sarah raised...", "Marcus committed..."
• Include the WHY or the consequence, not just the what
• Sequential: points should read like a story, not a random list
• Do NOT start with "The team discussed" — be specific about what actually happened

EXAMPLES:
Good: "Sarah flagged a mobile authentication bug causing users to be logged out after 10 minutes. She marked it as a pre-launch blocker after receiving customer reports that morning."
Good: "The team chose Postgres over MongoDB for the analytics pipeline, citing the need for relational integrity and better support for complex queries."
Good: "Marcus committed to sending updated pricing documentation to enterprise clients before Thursday, as several accounts are holding renewal decisions pending the new tier structure."
Bad: "Bug discussed." (no context)
Bad: "Team talked about database options." (no decision)
Bad: "Authentication issue was mentioned." (no specifics)

Respond ONLY with valid JSON, no markdown:
{"points":["Full sentence or two about what happened.","Another moment."]}

Return {"points":[]} if this segment adds nothing new to the meeting story.`,
        },
        {
          role: 'user',
          content: `${narrativeContext}CURRENT TRANSCRIPT SEGMENT:
${text}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 512,
    })

    const raw = response.choices[0]?.message?.content?.trim() ?? ''
    let jsonText = raw
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }
    jsonText = jsonText.trim()
    const jsonStart = jsonText.indexOf('{')
    const jsonEnd = jsonText.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonText = jsonText.slice(jsonStart, jsonEnd + 1)
    }
    const parsed = JSON.parse(jsonText) as { points: string[] }
    return NextResponse.json({
      points: Array.isArray(parsed.points) ? parsed.points.filter((p: unknown) => typeof p === 'string' && p.trim().length > 0) : [],
    })
  } catch (err) {
    console.error('[summarize] failed:', err)
    return NextResponse.json({ points: [] })
  }
}
