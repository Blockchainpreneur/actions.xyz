-- Billing: subscriptions table + usage-count index
--
-- Apply with one of:
--   supabase db push                  (linked project, supabase CLI)
--   supabase migration up             (local stack)
--   or paste into the Supabase SQL editor.
--
-- Assumes public.users(id) is uuid (Supabase convention; users are created via
-- upsert without explicit ids in src/lib/supabase.ts).

create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.users(id) on delete cascade,
  plan                   text not null check (plan in ('starter', 'pro', 'team')),
  status                 text not null default 'incomplete',
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- One subscription row per user — webhook handler upserts on user_id.
create unique index if not exists subscriptions_user_id_key
  on public.subscriptions (user_id);

create index if not exists subscriptions_stripe_customer_idx
  on public.subscriptions (stripe_customer_id);

-- Deny-all by default: only the service-role key (API routes) touches this table.
alter table public.subscriptions enable row level security;

-- Freemium usage counting: meetings created per owner per calendar month.
-- Counting is done over the existing sessions table (owner_id + created_at).
create index if not exists sessions_owner_created_idx
  on public.sessions (owner_id, created_at);
