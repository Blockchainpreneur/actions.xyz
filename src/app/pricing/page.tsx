'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import {
  ANNUAL_DISCOUNT_PCT,
  FREE_BOARD_LIMIT,
  FREE_MEETING_LIMIT,
  PLANS,
  type BillingInterval,
  type PlanId,
} from '@/lib/billing/config'

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>('annual')
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleCheckout(plan: PlanId) {
    setLoadingPlan(plan)
    setNotice(null)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      })

      if (res.status === 503) {
        setNotice('Payments launching this week — start free.')
        return
      }
      if (res.status === 401) {
        window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent('/pricing')}`
        return
      }

      const data = await res.json().catch(() => ({})) as { url?: string }
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      setNotice('Could not start checkout. Please try again shortly.')
    } catch {
      setNotice('Could not start checkout. Please try again shortly.')
    } finally {
      setLoadingPlan(null)
    }
  }

  const segmentStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 14px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    background: active ? 'var(--surface-3)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Top bar */}
      <nav
        className="glass flex items-center justify-between flex-shrink-0"
        style={{
          height: 52,
          borderBottom: '1px solid var(--border-primary)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="var(--text-muted)" strokeWidth="1" />
            <path d="M7 4.5v2.5l1.5 1.5" stroke="var(--teal-400)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
            actions<span style={{ color: 'var(--teal-400)' }}>.xyz</span>
          </span>
        </Link>
        <Link
          href="/auth/signin"
          className="btn-press"
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-2)',
            color: 'var(--text-secondary)',
            fontSize: 11,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Sign in
        </Link>
      </nav>

      <main className="flex-1 w-full" style={{ maxWidth: 1020, margin: '0 auto', padding: '56px 24px 80px' }}>
        {/* Header */}
        <div className="flex flex-col items-center text-center" style={{ gap: 12, marginBottom: 36 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal-400)' }}>
            Pricing
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.15 }}>
            Every meeting, accounted for.
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 440 }}>
            Start free. Upgrade when your meetings outgrow the limit — cancel anytime.
          </p>

          {/* Interval toggle — annual is the default */}
          <div
            role="group"
            aria-label="Billing interval"
            className="flex items-center"
            style={{
              marginTop: 8,
              padding: 3,
              borderRadius: 8,
              background: 'var(--surface-1)',
              border: '1px solid var(--border-subtle)',
              gap: 2,
            }}
          >
            <button
              type="button"
              data-testid="pricing-toggle-annual"
              aria-pressed={interval === 'annual'}
              onClick={() => setInterval('annual')}
              className="btn-press"
              style={segmentStyle(interval === 'annual')}
            >
              Annual
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 500,
                  padding: '1px 5px',
                  borderRadius: 20,
                  background: 'rgba(45,212,191,0.12)',
                  border: '1px solid var(--border-accent)',
                  color: 'var(--teal-400)',
                }}
              >
                −{ANNUAL_DISCOUNT_PCT}%
              </span>
            </button>
            <button
              type="button"
              data-testid="pricing-toggle-monthly"
              aria-pressed={interval === 'monthly'}
              onClick={() => setInterval('monthly')}
              className="btn-press"
              style={segmentStyle(interval === 'monthly')}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Billing-unavailable notice */}
        {notice && (
          <div
            data-testid="billing-notice"
            role="status"
            className="animate-slide-up flex items-center justify-center"
            style={{
              margin: '0 auto 24px',
              maxWidth: 560,
              padding: '10px 16px',
              borderRadius: 8,
              background: 'rgba(245,165,36,0.08)',
              border: '1px solid rgba(245,165,36,0.2)',
              color: 'var(--warning)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              gap: 8,
            }}
          >
            {notice}
            <Link href="/auth/signin" style={{ color: 'var(--teal-400)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Start free →
            </Link>
          </div>
        )}

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 16, alignItems: 'stretch' }}>
          {PLANS.map(plan => {
            const price = interval === 'annual' ? plan.annualMonthlyPrice : plan.monthlyPrice
            return (
              <div
                key={plan.id}
                data-testid={`plan-card-${plan.id}`}
                className="card-shadow flex flex-col"
                style={{
                  position: 'relative',
                  padding: 24,
                  borderRadius: 12,
                  background: 'var(--surface-1)',
                  border: plan.recommended ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                  boxShadow: plan.recommended ? '0 0 32px rgba(45,212,191,0.08), 0 2px 8px rgba(0,0,0,0.35)' : undefined,
                  gap: 16,
                }}
              >
                {plan.recommended && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -9,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      padding: '2px 10px',
                      borderRadius: 20,
                      background: 'var(--teal-500)',
                      border: '1px solid var(--teal-400)',
                      color: '#fff',
                    }}
                  >
                    Recommended
                  </span>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: plan.recommended ? 'var(--teal-400)' : 'var(--text-muted)' }}>
                    {plan.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span
                      data-testid={`plan-price-${plan.id}`}
                      style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      ${price}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/mo</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                    {interval === 'annual' ? `billed annually · $${price * 12}/yr` : 'billed monthly'}
                  </span>
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{plan.blurb}</p>

                <ul className="flex flex-col" style={{ gap: 8, listStyle: 'none', flex: 1 }}>
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start" style={{ gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <Check size={12} style={{ color: 'var(--teal-400)', flexShrink: 0, marginTop: 2 }} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  data-testid={`plan-cta-${plan.id}`}
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loadingPlan !== null}
                  className="btn-press w-full disabled:opacity-50"
                  style={{
                    padding: '9px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    ...(plan.recommended
                      ? {
                          background: 'var(--teal-500)',
                          border: '1px solid var(--teal-400)',
                          color: '#fff',
                          boxShadow: '0 0 18px rgba(14,145,136,0.25)',
                        }
                      : {
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }),
                  }}
                >
                  {loadingPlan === plan.id ? 'Starting checkout…' : `Start with ${plan.name}`}
                </button>
              </div>
            )
          })}
        </div>

        {/* Free tier */}
        <div
          data-testid="free-tier"
          className="flex flex-col sm:flex-row items-center justify-between"
          style={{
            marginTop: 24,
            padding: '14px 20px',
            borderRadius: 10,
            background: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
            gap: 12,
          }}
        >
          <div className="flex flex-col sm:flex-row items-center" style={{ gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
              Free
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {FREE_MEETING_LIMIT} meetings/mo · {FREE_BOARD_LIMIT} board · live transcription + AI action extraction
            </span>
          </div>
          <Link
            href="/auth/signin"
            className="btn-press"
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 500,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Start free →
          </Link>
        </div>

        <p style={{ marginTop: 24, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
          Prices in USD. Annual billing saves {ANNUAL_DISCOUNT_PCT}%. Cancel anytime from the billing portal.
        </p>
      </main>
    </div>
  )
}
