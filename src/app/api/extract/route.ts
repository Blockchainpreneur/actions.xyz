import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured — get a free key at groq.com' }, { status: 500 })
  }

  const body = await req.json() as { text: string; context?: string; participants: string[]; existingPoints?: string[] }
  const { text, context = '', participants, existingPoints = [] } = body

  if (!text?.trim()) {
    return NextResponse.json({ actions: [], participants: [] })
  }

  // Build context: meeting narrative (key points) + recent raw transcript
  // Key points give full-meeting story even when raw transcript has been truncated
  const narrativeSection = existingPoints.length > 0
    ? `MEETING CONTEXT — what has been discussed and decided so far:
${existingPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

`
    : ''

  const contextSection = context.trim()
    ? `RECENT TRANSCRIPT (verbatim — do NOT re-extract tasks already captured above):
${context.trim()}

`
    : ''

  const systemPrompt = `You are an expert meeting analyst specializing in extracting action items from spoken conversation. Your job is to identify every concrete task, commitment, decision requiring follow-up, or assignment that was made in the transcript.

Known participants in this meeting: ${participants.length ? participants.join(', ') : 'not yet identified'}

---
WHAT TO EXTRACT — extract an action when ANY of these signals appear:
• Someone commits: "I'll...", "I will...", "I'm going to...", "Let me...", "I can take that"
• Someone is assigned: "Can you...", "[Name] will handle...", "[Name] should...", "That's on [Name]"
• A decision creates work: "We agreed to...", "We're going with X" → follow-up task implied
• A blocker or dependency: "We're waiting on...", "This is blocked by...", "We need X before Y"
• A deadline is mentioned: "by end of week", "before the launch", "this sprint"
• An automated task: "the system should...", "we need a script that...", "auto-send..."

WHAT TO SKIP — do NOT extract:
• General discussion with no commitment ("it would be nice if...")
• Rhetorical questions ("wouldn't it be great if we...")
• Things already done ("we shipped X last week")
• Vague intentions without owner or action ("we should think about...")
• Pure status updates that require nothing ("the server is up")

---
ASSIGNEE RULES:
• Only assign to a named person if THEY said "I will..." OR someone said "[Name] will/should/can"
• For automated tasks (emails, reports, scripts, tests, data pipelines) → assigneeType: "agent"
• If unclear who owns it → assignee: "Unassigned", assigneeType: "human"
• Never infer owner from context alone

---
DESCRIPTION RULE — this is critical:
Write a description of 300-400 characters. Include ALL of:
1. Exactly what needs to happen (specific, not vague)
2. Why it was raised or what problem it solves
3. Any constraints, dependencies, or context from the conversation
4. Who else is involved or affected (if mentioned)
Example of BAD description (too short): "Fix the login bug that was mentioned."
Example of GOOD description (300-400 chars): "Investigate and fix the authentication bug causing users to be logged out after 10 minutes on mobile devices. This was raised by Sarah after customer reports came in this morning. The fix needs to go out before the Monday release. Check if it's related to the JWT token refresh logic that was changed last sprint."

---
FEW-SHOT EXAMPLES:

Input: "Yeah so Marcus I need you to send the updated pricing doc to the enterprise clients before Thursday. Also the API docs are still outdated from the v2 migration, someone needs to update those."
Output:
{"actions":[
  {"task":"Send updated pricing doc to enterprise clients","description":"Marcus to send the revised pricing documentation to all enterprise clients before Thursday. This was flagged as urgent as several enterprise accounts are waiting on the updated pricing to make renewal decisions. Ensure the new tier pricing and volume discounts are reflected in the document sent out.","assignee":"Marcus","assigneeType":"human","priority":"high","tag":"ops","dueDate":"Thursday"},
  {"task":"Update API docs for v2 migration","description":"The API documentation is still showing v1 endpoints and schemas since the v2 migration. This needs to be updated so that external developers and partners can correctly integrate with the new API. No specific owner was assigned — needs someone from the engineering or product team to pick this up.","assignee":"Unassigned","assigneeType":"human","priority":"med","tag":"engineering"}
],"participants":["Marcus"]}

Input: "Let's auto-generate the weekly performance report and email it to the stakeholders every Monday morning. And we decided to go with Postgres over MongoDB."
Output:
{"actions":[
  {"task":"Auto-generate and email weekly performance report","description":"Set up an automated job to generate the weekly performance report and email it to all stakeholders every Monday morning. The team agreed this should replace the manual process that's been taking 2 hours each week. The report should include the KPIs discussed: DAU, retention, and revenue metrics. Needs to be scheduled via cron or a workflow tool.","assignee":"AI Agent","assigneeType":"agent","priority":"med","tag":"automated"},
  {"task":"Migrate database to Postgres","description":"The team decided to move forward with Postgres instead of MongoDB. This decision was made based on the need for relational data integrity and better support for complex queries in the analytics pipeline. Next step is to plan the migration, assess schema changes, and set a timeline. This will affect all services currently reading from the MongoDB instance.","assignee":"Unassigned","assigneeType":"human","priority":"high","tag":"engineering"}
],"participants":[]}

Input: "okay sounds good, yeah I think so too"
Output: {"actions":[],"participants":[]}

---
Respond ONLY with valid JSON — no markdown, no explanation, no extra text:
{"actions":[{"task":"short title max 8 words","description":"300-400 character context description","assignee":"Name or Unassigned","assigneeType":"human","priority":"high|med|low","tag":"engineering|design|data|ops|content|product|automated","dueDate":"optional natural language date"}],"participants":["Name1","Name2"]}

Return {"actions":[],"participants":[]} if there is truly nothing actionable.`

  const groq = new Groq({ apiKey })

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `${narrativeSection}${contextSection}CURRENT TRANSCRIPT SEGMENT (extract actions from this):
"${text}"`,
        },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    })

    const rawText = response.choices[0]?.message?.content?.trim() ?? ''

    try {
      const jsonText = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
      const parsed = JSON.parse(jsonText) as { actions: unknown[]; participants: unknown[] }
      return NextResponse.json({
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        participants: Array.isArray(parsed.participants) ? parsed.participants : [],
      })
    } catch {
      console.error('Failed to parse extract response:', rawText)
      return NextResponse.json({ actions: [], participants: [] })
    }
  } catch (err) {
    console.error('Groq extract error:', err)
    const msg = err instanceof Error ? err.message : 'Extract failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
