'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { FREE_MEETING_LIMIT } from '@/lib/billing/config'

interface UpgradeModalProps {
  open: boolean
  limit?: number
  onClose: () => void
}

// Shown when the server blocks meeting creation with 402 (free plan limit).
export function UpgradeModal({ open, limit = FREE_MEETING_LIMIT, onClose }: UpgradeModalProps) {
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      data-testid="upgrade-modal-overlay"
      onClick={onClose}
      className="animate-fade-in flex items-center justify-center"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        data-testid="upgrade-modal"
        onClick={e => e.stopPropagation()}
        className="animate-slide-up flex flex-col"
        style={{
          width: 380,
          maxWidth: 'calc(100vw - 32px)',
          padding: 24,
          borderRadius: 12,
          background: 'var(--surface-1)',
          border: '1px solid var(--border-accent)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          gap: 12,
        }}
      >
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal-400)' }}>
          Free limit reached
        </p>
        <h2 id="upgrade-modal-title" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)', lineHeight: 1.3 }}>
          You&apos;ve used all {limit} free meetings this month
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          The free plan includes {limit} meetings per calendar month. Upgrade to keep
          every meeting in the pipeline — unlimited meetings start at $15/mo.
        </p>
        <div className="flex items-center" style={{ gap: 8, marginTop: 6 }}>
          <Link
            href="/pricing"
            className="btn-press flex-1 text-center"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              background: 'var(--teal-500)',
              border: '1px solid var(--teal-400)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 500,
              textDecoration: 'none',
              boxShadow: '0 0 18px rgba(14,145,136,0.25)',
            }}
          >
            View plans
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="btn-press"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
