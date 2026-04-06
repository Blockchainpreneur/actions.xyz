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
Write a rich description of 500-800 characters using this structure:

CONTEXT: Why this was raised, what problem it solves, who is affected (2-3 sentences)
STEPS: Numbered implementation steps (3-5 concrete steps)
FLOW: A simple text diagram showing the process or data flow using arrows (→) and boxes ([])

Example of BAD description: "Fix the login bug that was mentioned."
Example of GOOD description:
"CONTEXT: Users on mobile are being logged out after 10 minutes. Sarah flagged this after customer reports came in this morning. The fix must ship before the Monday release.

STEPS:
1. Check JWT token refresh logic changed last sprint
2. Reproduce on mobile Safari + Chrome
3. Fix the token expiry window (currently 10min, should be 24h)
4. Add refresh token rotation as fallback
5. QA on iOS + Android before merge

FLOW: [User Login] → [JWT issued 10min] → [Token expires] → [No refresh] → [Logout] ← FIX: extend expiry + add refresh rotation"

---
FEW-SHOT EXAMPLES:

Input: "Yeah so Marcus I need you to send the updated pricing doc to the enterprise clients before Thursday. Also the API docs are still outdated from the v2 migration, someone needs to update those."
Output:
{"actions":[
  {"task":"Send updated pricing doc to enterprise clients","description":"CONTEXT: Several enterprise accounts are holding renewal decisions pending the updated pricing. Marcus needs to send the revised doc before Thursday.\n\nSTEPS:\n1. Pull the latest pricing tiers from the finance sheet\n2. Update the enterprise pricing PDF with new volume discounts\n3. Email to all enterprise accounts on the renewal list\n4. CC the account managers for follow-up\n\nFLOW: [Finance Sheet] → [Update PDF] → [Email to Clients] → [Account Managers CC'd] → [Renewal Decisions]","assignee":"Marcus","assigneeType":"human","priority":"high","tag":"ops","dueDate":"Thursday"},
  {"task":"Update API docs for v2 migration","description":"CONTEXT: API documentation still shows v1 endpoints and schemas after the v2 migration. External developers and partners can't integrate correctly with the new API.\n\nSTEPS:\n1. Audit all v1 endpoints that changed in v2\n2. Update request/response schemas in the docs\n3. Add migration notes for breaking changes\n4. Review with engineering lead before publishing\n5. Notify partner developers of the update\n\nFLOW: [v1 Docs] → [Audit Changes] → [Update Schemas] → [Review] → [Publish v2 Docs] → [Notify Partners]","assignee":"Unassigned","assigneeType":"human","priority":"med","tag":"engineering"}
],"participants":["Marcus"]}

Input: "Let's auto-generate the weekly performance report and email it to the stakeholders every Monday morning. And we decided to go with Postgres over MongoDB."
Output:
{"actions":[
  {"task":"Auto-generate weekly performance report","description":"CONTEXT: The team spends 2 hours manually creating the weekly report. Automating this frees up time and ensures consistency. Should include DAU, retention, and revenue KPIs.\n\nSTEPS:\n1. Set up data queries for DAU, retention, revenue metrics\n2. Build report template with charts\n3. Schedule cron job for Monday 8am\n4. Configure email delivery to stakeholder list\n5. Add error alerting if generation fails\n\nFLOW: [Cron Monday 8am] → [Query Metrics DB] → [Generate Report] → [Email to Stakeholders]","assignee":"AI Agent","assigneeType":"agent","priority":"med","tag":"automated"},
  {"task":"Migrate database to Postgres","description":"CONTEXT: Team chose Postgres over MongoDB for relational integrity and complex analytics queries. All services reading from MongoDB will be affected.\n\nSTEPS:\n1. Map MongoDB collections to Postgres tables/schemas\n2. Write migration scripts with data validation\n3. Set up Postgres staging instance\n4. Run parallel reads to verify data parity\n5. Cut over services one by one, starting with read-only\n6. Decommission MongoDB after 2-week validation\n\nFLOW: [MongoDB] → [Migration Scripts] → [Postgres Staging] → [Parallel Reads] → [Service Cutover] → [Decommission Mongo]","assignee":"Unassigned","assigneeType":"human","priority":"high","tag":"engineering"}
],"participants":[]}

Input: "okay sounds good, yeah I think so too"
Output: {"actions":[],"participants":[]}

---
Respond ONLY with valid JSON — no markdown, no explanation, no extra text:
{"actions":[{"task":"short title max 8 words","description":"500-800 char rich description with CONTEXT + STEPS + FLOW sections","assignee":"Name or Unassigned","assigneeType":"human","priority":"high|med|low","tag":"engineering|design|data|ops|content|product|automated","dueDate":"optional natural language date"}],"participants":["Name1","Name2"]}

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
      max_tokens: 4096,
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
