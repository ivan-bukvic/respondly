-- Faza 2 review fixes round 2 (#1: generation_failed flag)
-- Run manually in Supabase SQL Editor when MCP has no access to the respondly project.

-- Distinguishes a real AI draft from the static fallback text inserted when the
-- RAG pipeline fails. sensitivity_tag alone can't carry this (see BACKEND_MASTER.md §7) —
-- admin UI must refuse one-click Approve / must warn when this is true.
alter table pending_responses
  add column if not exists generation_failed boolean not null default false;
