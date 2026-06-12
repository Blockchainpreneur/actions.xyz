import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { type ActionItem, type Participant, COLOR_KEYS, PARTICIPANT_COLORS } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return formatTime(ts)
}

export function getParticipantColor(index: number): string {
  return COLOR_KEYS[index % COLOR_KEYS.length]
}

export function getGradientForColor(colorKey: string): string {
  return PARTICIPANT_COLORS[colorKey] ?? PARTICIPANT_COLORS.indigo
}

export function nameToInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}

// Shared localStorage keys — the kanban (use-actions) writes them, the
// dashboard reads them as its no-DB fallback.
export const SESSION_STORAGE_KEY = 'current-session'
export const HISTORY_STORAGE_KEY = 'sessions-history'

export function persistSession(key: string, data: unknown): void {
  try {
    localStorage.setItem(`actions:${key}`, JSON.stringify(data))
  } catch {}
}

export function loadSession<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`actions:${key}`)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function buildDemoSession(): { participants: Participant[]; actions: ActionItem[] } {
  const participants: Participant[] = [
    { id: 'p1', name: 'Alex', initial: 'A', color: 'indigo' },
    { id: 'p2', name: 'Sam', initial: 'S', color: 'cyan' },
    { id: 'p3', name: 'Jordan', initial: 'J', color: 'emerald' },
  ]

  const actions: ActionItem[] = [
    {
      id: generateId(),
      text: 'Research competitor pricing models',
      description: 'CONTEXT: Need to understand how competitors price their meeting tools before setting our own tiers. This blocks the pricing page launch.\n\nSTEPS:\n1. Identify top 5 competitors (Otter, Fireflies, Grain, tl;dv, Fathom)\n2. Document their pricing tiers and feature gates\n3. Create comparison spreadsheet\n4. Present findings to team Friday\n\nFLOW: [Competitors] → [Research Tiers] → [Spreadsheet] → [Team Review] → [Our Pricing]',
      status: 'actions',
      assigneeType: 'human',
      assigneeName: 'Unassigned',
      priority: 'high',
      tag: 'product',
      createdAt: Date.now() - 100000,
    },
    {
      id: generateId(),
      text: 'Write API integration docs for webhooks',
      description: 'CONTEXT: Partners need webhook docs to integrate task notifications into their workflows. No docs currently exist.\n\nSTEPS:\n1. Document webhook event types (task.created, task.assigned, task.completed)\n2. Add payload examples for each event\n3. Write authentication section (signing secrets)\n4. Create quickstart guide with curl examples\n\nFLOW: [Event Fires] → [Webhook POST] → [Partner Server] → [Verify Signature] → [Process]',
      status: 'actions',
      assigneeType: 'human',
      assigneeName: 'Unassigned',
      priority: 'med',
      tag: 'engineering',
      createdAt: Date.now() - 200000,
    },
    {
      id: generateId(),
      text: 'Finalize onboarding flow mockups',
      status: 'assigned',
      assigneeType: 'human',
      assigneeName: 'Jordan',
      assigneeInitial: 'J',
      assigneeColor: 'emerald',
      assigneeEmail: 'jordan@team.co',
      assigneeEmails: ['jordan@team.co'],
      priority: 'high',
      tag: 'design',
      createdAt: Date.now() - 300000,
      dueDate: 'Wed EOD',
    },
    {
      id: generateId(),
      text: 'Review and approve onboarding copy',
      status: 'inprogress',
      assigneeType: 'human',
      assigneeName: 'Sam',
      assigneeInitial: 'S',
      assigneeColor: 'cyan',
      priority: 'med',
      tag: 'content',
      createdAt: Date.now() - 250000,
      dueDate: 'Thu EOD',
    },
    {
      id: generateId(),
      text: 'Set up staging environment for QA testing',
      status: 'indeadline',
      assigneeType: 'human',
      assigneeName: 'Alex',
      assigneeInitial: 'A',
      assigneeColor: 'indigo',
      priority: 'high',
      tag: 'ops',
      createdAt: Date.now() - 600000,
    },
    {
      id: generateId(),
      text: 'Generate and distribute meeting summary',
      status: 'completed',
      assigneeType: 'agent',
      assigneeName: 'AI Agent',
      priority: 'low',
      tag: 'automated',
      createdAt: Date.now() - 1200000,
    },
    {
      id: generateId(),
      text: 'Define Q2 OKRs and share with team',
      status: 'completed',
      assigneeType: 'human',
      assigneeName: 'Alex',
      assigneeInitial: 'A',
      assigneeColor: 'indigo',
      priority: 'low',
      createdAt: Date.now() - 900000,
    },
  ]

  return { participants, actions }
}
