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
      text: 'Finalize onboarding flow mockups',
      status: 'inprogress',
      assigneeType: 'human',
      assigneeName: 'Jordan',
      assigneeInitial: 'J',
      assigneeColor: 'emerald',
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
      blockedReason: 'Waiting on DevOps access',
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
