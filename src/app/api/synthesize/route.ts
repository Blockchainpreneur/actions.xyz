import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

type ActionPatch = {
  id: string
  text?: string
  description: string
  priority?: 'high' | 'med' | 'low'
  dueDate?: string
  tag?: string
}

type SynthesizeBody = {
  transcript: string
  keyPoints: string[]
  actions: Array<{
    id: string
    text: string
    description?: string
    assigneeName: string
    assigneeType: string
    priority: string
    dueDate?: string
    tag?: string
  }>
  participants: string[]
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ keyPoints: [], actionPatches: [], removeIds: [] })
  }

  const body = await req.json() as SynthesizeBody
  const { transcript, keyPoints, actions, participants } = body

  if (!transcript?.trim() || transcript.trim().length < 80) {
    return NextResponse.json({ keyPoints, actionPatches: [], removeIds: [] })
  }

  const groq = new Groq({ apiKey })

  const keyPointsSection = keyPoints.length > 0
    ? `REAL-TIME KEY POINTS (captured incrementally — revise into a coherent final narrative):
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

`
    : 'REAL-TIME KEY POINTS: none captured\n\n'

  const actionsSection = actions.length > 0
    ? `CURRENT ACTION ITEMS — deduplicate, merge, and enrich using the full transcript:
${actions.map(a =>
    `ID:${a.id} | task:"${a.text}" | assignee:${a.assigneeName}(${a.assigneeType}) | priority:${a.priority}${a.tag ? ` | tag:${a.tag}` : ''}${a.dueDate ? ` | due:${a.dueDate}` : ''}${a.description ? `\n  desc: "${a.description.slice(0, 150)}"` : ''}`
  ).join('\n')}

`
    : 'CURRENT ACTION ITEMS: none\n\n'

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a senior meeting analyst doing a final synthesis pass after a meeting ends. You have the complete transcript. Produce the definitive, clean record.

Three tasks:

━━━ TASK 1: FINAL KEY POINTS ━━━
Revise the real-time key points into a polished narrative of 4-8 points. Someone who wasn't in the meeting should read these and understand exactly what happened, what was decided, and what comes next.

Rules:
• Each point: 1-2 sentences, 25-70 words
• Third-person past tense: "The team decided...", "Sarah raised...", "Marcus committed..."
• Chronological — tell the story as it unfolded
• Include the WHY and consequence, not just the what
• Merge duplicates, cut vague filler, add specifics missed in real-time
• Never start with "The meeting..." or "There was a discussion..."

━━━ TASK 2: DEDUPLICATION ━━━
Real-time extraction often creates duplicates — the same commitment captured twice, slight variations of the same task, or one task that was broken into redundant sub-tasks.

Steps:
1. Read all action items carefully
2. Group any that refer to the same underlying commitment or deliverable
3. For each group: keep the best one (most complete title + assignee), discard the rest
4. The kept item gets a merged description that incorporates context from all discarded versions
5. List discarded IDs in removeIds

Criteria for "same task":
• Same deliverable even if worded differently ("send pricing doc" + "email pricing to clients" = same)
• One is a sub-task of another with no independent value
• Two tasks assigned to the same person for the same thing

Keep tasks separate when:
• Different assignees, different deliverables
• Similar topic but genuinely different actions (e.g., "write tests" vs "fix the bug")

━━━ TASK 3: ENRICHMENT ━━━
For every action item that survives (not in removeIds), write a final description using the complete transcript.

Description (300-400 chars):
1. Exactly what needs to be done — specific, no vague verbs
2. Why it was raised — the problem, decision, or blocker that triggered it
3. Any deadline, dependency, or constraint mentioned anywhere in the meeting
4. Who is waiting on this, what breaks if it's late

Also fix per item:
• Title: too vague → be specific, ≤ 10 words
• Priority: reassess with full context (blocks launch? → high)
• dueDate: fill in if any deadline was mentioned anywhere in transcript
• tag: correct if full context reveals better category

━━━ RESPONSE ━━━
Valid JSON only, no markdown:
{
  "keyPoints": ["Narrative sentence.", "Another moment."],
  "removeIds": ["id-of-duplicate", "id-of-another-duplicate"],
  "actionPatches": [
    {
      "id": "exact-id-from-input",
      "text": "Improved title (omit field if unchanged)",
      "description": "300-400 char enriched description",
      "priority": "high|med|low (omit field if unchanged)",
      "dueDate": "natural language (omit field if not mentioned in transcript)",
      "tag": "engineering|design|data|ops|content|product|automated (omit field if unchanged)"
    }
  ]
}

Rules:
• removeIds contains only IDs that should be deleted — never include kept IDs here
• actionPatches contains only surviving items (not in removeIds) — every surviving item must appear with at minimum an improved description
• IDs must match input exactly — never invent new IDs
• If no duplicates exist, removeIds is []`,
        },
        {
          role: 'user',
          content: `Known participants: ${participants.length ? participants.join(', ') : 'not specified'}

${keyPointsSection}${actionsSection}FULL MEETING TRANSCRIPT:
${transcript}`,
        },
      ],
      temperature: 0.15,
      max_tokens: 4096,
    })

    const raw = response.choices[0]?.message?.content?.trim() ?? ''
    const jsonText = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(jsonText) as {
      keyPoints: string[]
      actionPatches: ActionPatch[]
      removeIds: string[]
    }

    // Safety: never let removeIds contain IDs that also appear in actionPatches
    const patchedIds = new Set((parsed.actionPatches ?? []).map(p => p.id))
    const safeRemoveIds = (parsed.removeIds ?? []).filter(id => !patchedIds.has(id))

    return NextResponse.json({
      keyPoints: Array.isArray(parsed.keyPoints) && parsed.keyPoints.length > 0
        ? parsed.keyPoints
        : keyPoints,
      actionPatches: Array.isArray(parsed.actionPatches) ? parsed.actionPatches : [],
      removeIds: safeRemoveIds,
    })
  } catch (err) {
    console.error('Synthesize error:', err)
    return NextResponse.json({ keyPoints, actionPatches: [], removeIds: [] })
  }
}
