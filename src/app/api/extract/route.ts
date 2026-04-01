import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const body = await req.json() as { text: string; participants: string[] }
  const { text, participants } = body

  if (!text?.trim()) {
    return NextResponse.json({ actions: [], participants: [] })
  }

  const systemPrompt = `You are an action item extractor for meetings. Given a transcript excerpt, identify:
1. Action items (tasks someone needs to do)
2. Who is responsible (a person's name, or "AI Agent" if it's automatable/technical/recurring)
3. Priority (high/med/low)
4. Category tag: engineering | design | data | ops | content | product | automated
5. Any due date mentioned
6. New participant names mentioned (people speaking or referenced)

Known participants so far: ${participants.length ? participants.join(', ') : 'none yet'}

Respond ONLY with valid JSON in this exact format:
{
  "actions": [
    {
      "task": "brief action item text",
      "assignee": "Person Name or AI Agent",
      "assigneeType": "human" | "agent",
      "priority": "high" | "med" | "low",
      "tag": "engineering",
      "dueDate": "optional string"
    }
  ],
  "participants": ["Name1", "Name2"]
}

Rules:
- Only extract REAL action items with a clear owner. Skip vague statements.
- assigneeType "agent" = tasks that are automated, data processing, sending emails, running tests, generating reports
- assigneeType "human" = tasks requiring human judgment, decisions, creative work
- If no clear assignee, pick the most likely person from context
- participants = new names you see that aren't in the known list
- Return empty arrays if nothing actionable found
- NO markdown, NO explanation, ONLY the JSON object`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Extract action items from this meeting transcript:\n\n"${text}"`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic API error:', err)
      return NextResponse.json({ actions: [], participants: [] })
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>
    }

    const rawText = data.content?.[0]?.text?.trim() ?? ''

    // Parse JSON response
    let parsed: { actions: unknown[]; participants: unknown[] }
    try {
      // Handle potential markdown code blocks
      const jsonText = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
      parsed = JSON.parse(jsonText)
    } catch {
      console.error('Failed to parse Claude response:', rawText)
      return NextResponse.json({ actions: [], participants: [] })
    }

    return NextResponse.json({
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      participants: Array.isArray(parsed.participants) ? parsed.participants : [],
    })
  } catch (err) {
    console.error('Extract route error:', err)
    return NextResponse.json({ actions: [], participants: [] })
  }
}
