// Core action-item extraction — the real product pipeline.
// Shared by /api/extract (the in-app extractor) and /api/tools/extract
// (the free public tool), so the free tool is a live demo of the actual
// extraction quality, not a separate toy prompt.
import Groq from 'groq-sdk'

export interface ExtractedAction {
  task: string
  description: string
  assignee: string
  assigneeType: 'human' | 'agent'
  priority: 'high' | 'med' | 'low'
  tag: string
  dueDate?: string
}

export interface ExtractionResult {
  actions: ExtractedAction[]
  participants: string[]
}

export interface ExtractionInput {
  text: string
  context?: string
  participants?: string[]
  existingPoints?: string[]
}

export const EXTRACTION_MODEL = 'llama-3.3-70b-versatile'

export function buildExtractionSystemPrompt(participants: string[]): string {
  return `You extract action items from meeting transcripts. Return valid JSON only.

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
}

/** Parse the model's raw response — tolerant of code fences and stray text. */
export function parseExtractionResponse(rawText: string): ExtractionResult {
  let jsonText = rawText.trim()
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }
  jsonText = jsonText.trim()

  const jsonStart = jsonText.indexOf('{')
  const jsonEnd = jsonText.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd !== -1) {
    jsonText = jsonText.slice(jsonStart, jsonEnd + 1)
  }

  const parsed = JSON.parse(jsonText) as { actions?: unknown; participants?: unknown }
  return {
    actions: Array.isArray(parsed.actions) ? (parsed.actions as ExtractedAction[]) : [],
    participants: Array.isArray(parsed.participants) ? (parsed.participants as string[]) : [],
  }
}

/**
 * Run the full extraction against Groq. Throws on API errors; returns an
 * empty result when the model produces nothing parseable (same degradation
 * the in-app extractor has always had).
 */
export async function extractActions(apiKey: string, input: ExtractionInput): Promise<ExtractionResult> {
  const { text, context = '', participants = [], existingPoints = [] } = input

  if (!text?.trim()) return { actions: [], participants: [] }

  const narrativeSection = existingPoints.length > 0
    ? `Meeting context so far:\n${existingPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n`
    : ''

  const contextSection = context.trim()
    ? `Recent transcript (don't re-extract from this):\n${context.trim()}\n\n`
    : ''

  const groq = new Groq({ apiKey })
  const response = await groq.chat.completions.create({
    model: EXTRACTION_MODEL,
    messages: [
      { role: 'system', content: buildExtractionSystemPrompt(participants) },
      {
        role: 'user',
        content: `${narrativeSection}${contextSection}Extract actions from this:\n"${text}"`,
      },
    ],
    temperature: 0.1,
    max_tokens: 4096,
  })

  const rawText = response.choices[0]?.message?.content?.trim() ?? ''
  if (!rawText) return { actions: [], participants: [] }

  try {
    return parseExtractionResponse(rawText)
  } catch {
    console.error('[extraction] JSON parse failed, raw:', rawText.slice(0, 300))
    return { actions: [], participants: [] }
  }
}
