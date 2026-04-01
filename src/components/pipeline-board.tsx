'use client'

import { useMemo, useRef, useState } from 'react'
import { type ActionItem, type ActionStatus, type Session } from '@/lib/types'
import { PipelineColumn } from './pipeline-column'

const STATUSES: ActionStatus[] = ['captured', 'inprogress', 'blocked', 'done']

interface PipelineBoardProps {
  session: Session
  newestActionId?: string
  onMove: (id: string, status: ActionStatus) => void
  onDelete: (id: string) => void
}

export function PipelineBoard({ session, newestActionId, onMove, onDelete }: PipelineBoardProps) {
  const actionsByStatus = useMemo(() => {
    const grouped: Record<ActionStatus, ActionItem[]> = {
      captured: [],
      inprogress: [],
      blocked: [],
      done: [],
    }
    for (const action of session.actions) {
      grouped[action.status].push(action)
    }
    return grouped
  }, [session.actions])

  return (
    <main className="flex-1 overflow-x-auto overflow-y-auto px-6 py-5">
      <div className="flex gap-4 items-start min-h-full" style={{ minWidth: 'max-content' }}>
        {STATUSES.map(status => (
          <PipelineColumn
            key={status}
            status={status}
            actions={actionsByStatus[status]}
            newestActionId={newestActionId}
            onMove={onMove}
            onDelete={onDelete}
          />
        ))}
      </div>
    </main>
  )
}
