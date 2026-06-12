// Billing config — single source of truth for plans, prices, and free-tier limits.
// Shared by /pricing (display), /api/billing/* (Stripe), and /api/db/sessions (enforcement).

export type PlanId = 'starter' | 'pro' | 'team'
export type BillingInterval = 'monthly' | 'annual'

export const PLAN_IDS: PlanId[] = ['starter', 'pro', 'team']
export const BILLING_INTERVALS: BillingInterval[] = ['monthly', 'annual']

// Free tier
export const FREE_MEETING_LIMIT = 5
export const FREE_BOARD_LIMIT = 1

// ── Stripe price IDs ─────────────────────────────────────────
// ⚠️ PLACEHOLDERS — no Stripe keys/CLI were available when this was built.
// Provision test-mode Products/Prices (one product per plan, a monthly and an
// annual price each) and set the real IDs via env. Until then, /api/billing/*
// responds 503 and /pricing degrades gracefully.
//
//   stripe products create --name "actions.xyz Pro"
//   stripe prices create --product <prod_id> --currency usd \
//     --unit-amount 2900 -d "recurring[interval]=month"
//   stripe prices create --product <prod_id> --currency usd \
//     --unit-amount 27600 -d "recurring[interval]=year"   # $23/mo equivalent
const PLACEHOLDER_PREFIX = 'price_PLACEHOLDER_'

export const STRIPE_PRICE_IDS: Record<PlanId, Record<BillingInterval, string>> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? `${PLACEHOLDER_PREFIX}starter_monthly`,
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? `${PLACEHOLDER_PREFIX}starter_annual`,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? `${PLACEHOLDER_PREFIX}pro_monthly`,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? `${PLACEHOLDER_PREFIX}pro_annual`,
  },
  team: {
    monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY ?? `${PLACEHOLDER_PREFIX}team_monthly`,
    annual: process.env.STRIPE_PRICE_TEAM_ANNUAL ?? `${PLACEHOLDER_PREFIX}team_annual`,
  },
}

export function isPlaceholderPrice(priceId: string): boolean {
  return priceId.startsWith(PLACEHOLDER_PREFIX)
}

// Reverse lookup: Stripe price id → plan + interval (used by the webhook handler)
export function planFromPriceId(priceId: string | undefined | null): { plan: PlanId; interval: BillingInterval } | null {
  if (!priceId) return null
  for (const plan of PLAN_IDS) {
    for (const interval of BILLING_INTERVALS) {
      if (STRIPE_PRICE_IDS[plan][interval] === priceId) return { plan, interval }
    }
  }
  return null
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_IDS as string[]).includes(value)
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return typeof value === 'string' && (BILLING_INTERVALS as string[]).includes(value)
}

// ── Display data for /pricing ────────────────────────────────
export interface PlanDisplay {
  id: PlanId
  name: string
  monthlyPrice: number        // $/mo when billed monthly
  annualMonthlyPrice: number  // $/mo equivalent when billed annually (−20%)
  blurb: string
  features: string[]
  recommended?: boolean
}

export const ANNUAL_DISCOUNT_PCT = 20

export const PLANS: PlanDisplay[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 19,
    annualMonthlyPrice: 15,
    blurb: 'For solo operators who never want to take notes again.',
    features: [
      'Unlimited meetings',
      'Live transcription + AI action extraction',
      'Pipeline board with full meeting history',
      'Email task assignment + notifications',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 29,
    annualMonthlyPrice: 23,
    blurb: 'For people who live in meetings and ship from them.',
    recommended: true,
    features: [
      'Everything in Starter',
      'Auto-join meeting bot',
      'Google Calendar sync',
      'End-of-meeting AI synthesis + dedup',
      'Priority support',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    monthlyPrice: 79,
    annualMonthlyPrice: 63,
    blurb: 'Accountability for the whole team, one bill.',
    features: [
      'Everything in Pro',
      'Unlimited assignees across your team',
      'Shared “My Tasks” dashboard for everyone',
      'Weekly activity reporting',
      'Centralized billing',
    ],
  },
]
