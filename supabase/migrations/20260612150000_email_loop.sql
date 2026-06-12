-- Email loop: public task-page tokens, comments, conversion attribution, events
--
-- NOTE: the remote project is currently PAUSED — this migration is staged and
-- NOT applied. All runtime code that touches these tables/columns is fail-open
-- and works (degraded) without it. Apply with one of:
--   supabase db push                  (linked project, supabase CLI)
--   supabase migration up             (local stack)
--   or paste into the Supabase SQL editor.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Public task tokens
-- Tokens are stateless HMAC-signed (src/lib/task-token.ts) so they validate
-- even with the DB down. They are ALSO persisted here (best-effort) to enable
-- future revocation and to join email clicks back to assignments.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.task_assignees
  add column if not exists access_token text;

create unique index if not exists task_assignees_access_token_key
  on public.task_assignees (access_token)
  where access_token is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Comments on tasks (public task page allows commenting without an account)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.task_comments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks(id) on delete cascade,
  author_email text,
  author_name  text,
  body         text not null check (char_length(body) <= 2000),
  created_at   timestamptz not null default now()
);

create index if not exists task_comments_task_idx
  on public.task_comments (task_id, created_at);

-- Deny-all by default: only the service-role key (API routes) touches this.
alter table public.task_comments enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Conversion attribution on users
-- signup_source: e.g. 'assignment_email' (utm_source at signup)
-- referrer_token: the /t/[token] that referred the signup
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.users
  add column if not exists signup_source text,
  add column if not exists referrer_token text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Minimal product events (fail-open inserts from src/lib/events.ts)
-- Types: assigned_email_sent, task_page_view, task_done_no_login, signup_from_task
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,
  email      text,
  task_id    uuid,
  token      text,            -- token prefix only (join key, not the full secret)
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_type_created_idx
  on public.events (type, created_at);

create index if not exists events_task_idx
  on public.events (task_id)
  where task_id is not null;

alter table public.events enable row level security;
