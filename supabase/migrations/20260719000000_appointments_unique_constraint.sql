-- Faza 4 review fix #1 — idempotency on book_appointment.
-- Run manually in Supabase SQL Editor (MCP apply_migration not available for this project).

-- Dedup first: earlier smoke runs may already have duplicate (conversation_id, requested_time) rows
-- that would block the unique constraint.
delete from appointments a
using appointments b
where a.conversation_id = b.conversation_id
  and a.requested_time = b.requested_time
  and a.created_at > b.created_at;

alter table appointments
  add constraint appointments_conversation_time_key
  unique (conversation_id, requested_time);
