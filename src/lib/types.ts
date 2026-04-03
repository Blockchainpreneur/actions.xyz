export type AssigneeType = 'human' | 'agent'

export type ActionStatus = 'actions' | 'assigned' | 'inprogress' | 'indeadline' | 'completed'

export type Priority = 'high' | 'med' | 'low'

export type Tag = 'engineering' | 'design' | 'data' | 'ops' | 'content' | 'product' | 'automated'

export interface Participant {
  id: string
  name: string
  initial: string
  color: string
}

export interface ActionItem {
  id: string
  text: string
  description?: string
  status: ActionStatus
  assigneeType: AssigneeType
  assigneeName: string
  assigneeInitial?: string
  assigneeColor?: string
  assigneeEmail?: string
  priority: Priority
  tag?: Tag
  sourceText?: string
  createdAt: number
  dueDate?: string
  blockedReason?: string
  sessionId?: string
}

export interface TranscriptLine {
  id: string
  participantId: string
  participantName: string
  participantInitial: string
  participantColor: string
  text: string
  timestamp: number
  extractedActions?: string[]
}

export interface Session {
  id: string
  name: string
  startedAt: number
  endedAt?: number
  participants: Participant[]
  actions: ActionItem[]
  transcript: TranscriptLine[]
  keyPoints?: string[]
}

export const COLUMN_CONFIG: Record<ActionStatus, { label: string; color: string; borderColor: string; textColor: string }> = {
  actions: {
    label: 'Actions',
    color: 'rgba(6,182,212,0.07)',
    borderColor: 'rgba(6,182,212,0.16)',
    textColor: '#22d3ee',
  },
  assigned: {
    label: 'Assigned',
    color: 'rgba(99,102,241,0.07)',
    borderColor: 'rgba(99,102,241,0.18)',
    textColor: '#a5b4fc',
  },
  inprogress: {
    label: 'In Progress',
    color: 'rgba(234,179,8,0.07)',
    borderColor: 'rgba(234,179,8,0.18)',
    textColor: '#fde047',
  },
  indeadline: {
    label: 'In Deadline',
    color: 'rgba(249,115,22,0.07)',
    borderColor: 'rgba(249,115,22,0.16)',
    textColor: '#fdba74',
  },
  completed: {
    label: 'Completed',
    color: 'rgba(16,185,129,0.07)',
    borderColor: 'rgba(16,185,129,0.14)',
    textColor: '#6ee7b7',
  },
}

export const TAG_CONFIG: Record<Tag, { label: string; bg: string; text: string; border: string }> = {
  engineering: { label: 'engineering', bg: 'rgba(99,102,241,0.12)', text: '#a5b4fc', border: 'rgba(99,102,241,0.2)' },
  design: { label: 'design', bg: 'rgba(236,72,153,0.1)', text: '#f9a8d4', border: 'rgba(236,72,153,0.15)' },
  data: { label: 'data', bg: 'rgba(6,182,212,0.1)', text: '#67e8f9', border: 'rgba(6,182,212,0.15)' },
  ops: { label: 'ops', bg: 'rgba(245,158,11,0.1)', text: '#fcd34d', border: 'rgba(245,158,11,0.15)' },
  content: { label: 'content', bg: 'rgba(168,85,247,0.1)', text: '#d8b4fe', border: 'rgba(168,85,247,0.15)' },
  product: { label: 'product', bg: 'rgba(59,130,246,0.1)', text: '#93c5fd', border: 'rgba(59,130,246,0.15)' },
  automated: { label: 'automated', bg: 'rgba(6,182,212,0.1)', text: '#67e8f9', border: 'rgba(6,182,212,0.15)' },
}

export const PARTICIPANT_COLORS: Record<string, string> = {
  indigo: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
  cyan: 'linear-gradient(135deg, #0891b2, #0e7490)',
  emerald: 'linear-gradient(135deg, #059669, #10b981)',
  amber: 'linear-gradient(135deg, #d97706, #f59e0b)',
  rose: 'linear-gradient(135deg, #e11d48, #f43f5e)',
  violet: 'linear-gradient(135deg, #7c3aed, #a855f7)',
}

export const COLOR_KEYS = Object.keys(PARTICIPANT_COLORS)
