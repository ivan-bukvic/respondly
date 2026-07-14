-- Faza 3 — HITL approval: final_text / resolved_at + interaction_log
-- Run manually in Supabase SQL Editor (MCP apply_migration not available for this project).

alter table pending_responses
  add column if not exists final_text text,
  add column if not exists resolved_at timestamptz;

do $$ begin
  create type log_action as enum ('approved', 'edited_and_sent', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists interaction_log (
  id uuid primary key default gen_random_uuid(),
  pending_response_id uuid not null references pending_responses(id) on delete cascade,
  action log_action not null,
  actor text not null,
  created_at timestamptz not null default now()
);

-- RLS on, no permissive policies for authenticated/anon — default-deny.
-- All access is server-side via service_role after requireAdmin() (see SECURITY.md §3).
alter table interaction_log enable row level security;

grant select, insert, update, delete on interaction_log to service_role;
