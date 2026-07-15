-- Faza 4 — MCP booking: appointments table
-- Run manually in Supabase SQL Editor (MCP apply_migration not available for this project).

do $$ begin
  create type appointment_status as enum ('booked', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  requested_time timestamptz not null,
  treatment text,
  status appointment_status not null default 'booked',
  created_at timestamptz not null default now()
);

-- RLS on, no permissive policies for authenticated/anon — default-deny.
-- All access is server-side via service_role (webhook/MCP/admin). See SECURITY.md §3.
alter table appointments enable row level security;

grant select, insert, update, delete on appointments to service_role;
