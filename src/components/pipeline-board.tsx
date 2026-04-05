'use client'

import { useMemo } from 'react'
import { type ActionItem, type ActionStatus, type Session } from '@/lib/types'
import { PipelineColumn } from './pipeline-column'

const STATUSES: ActionStatus[] = ['actions', 'assigned', 'inprogress', 'indeadline', 'completed']

interface PipelineBoardProps {
  session: Session
  newestActionId?: string
  onMove: (id: string, status: ActionStatus) => void
  onDelete: (id: string) => void
  onUpdateEmail: (id: string, email: string) => void
  onAssignEmails?: (id: string, emails: string[]) => Promise<void>
}

export function PipelineBoard({ session, newestActionId, onMove, onDelete, onUpdateEmail, onAssignEmails }: PipelineBoardProps) {
  const actionsByStatus = useMemo(() => {
    const grouped: Record<ActionStatus, ActionItem[]> = {
      actions: [],
      assigned: [],
      inprogress: [],
      indeadline: [],
      completed: [],
    }
    for (const action of session.actions) {
      if (grouped[action.status]) {
        grouped[action.status].push(action)
      } else {
        grouped['actions'].push(action) // fallback for old data with stale status
      }
    }
    return grouped
  }, [session.actions])

  return (
    <main className="flex-1 overflow-x-auto overflow-y-auto px-5 py-4">
      <div className="flex gap-3.5 items-start min-h-full" style={{ minWidth: 'max-content' }}>
        {STATUSES.map(status => (
          <PipelineColumn
            key={status}
            status={status}
            actions={actionsByStatus[status]}
            newestActionId={newestActionId}
            onMove={onMove}
            onDelete={onDelete}
            onUpdateEmail={onUpdateEmail}
            onAssignEmails={onAssignEmails}
          />
        ))}
      </div>
    </main>
  )
}
