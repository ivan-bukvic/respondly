-- Faza 2 — RAG Pipeline schema
-- Run manually in Supabase SQL Editor (MCP apply_migration not available for this project).

create extension if not exists vector;

create table if not exists faq_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_file text not null,
  created_at timestamptz not null default now()
);

create table if not exists faq_chunks (
  id uuid primary key default gen_random_uuid(),
  faq_document_id uuid not null references faq_documents(id) on delete cascade,
  heading text not null,
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create index if not exists faq_chunks_embedding_idx
  on faq_chunks using hnsw (embedding vector_cosine_ops);

do $$ begin
  create type sensitivity_tag as enum ('routine', 'sensitive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pending_status as enum ('pending', 'approved', 'edited_and_sent', 'rejected');
exception when duplicate_object then null; end $$;

-- FK targets (conversations, messages) must already exist from Phase 1.
create table if not exists pending_responses (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  inbound_message_id uuid not null references messages(id) on delete cascade,
  draft_text text not null,
  retrieved_chunk_ids uuid[] not null default '{}',
  sensitivity_tag sensitivity_tag not null default 'routine',
  status pending_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- Similarity search RPC — supabase-js calls via .rpc('match_faq_chunks', ...)
create or replace function match_faq_chunks(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  faq_document_id uuid,
  heading text,
  content text,
  source_file text,
  similarity float
)
language sql stable
as $$
  select
    faq_chunks.id,
    faq_chunks.faq_document_id,
    faq_chunks.heading,
    faq_chunks.content,
    faq_documents.source_file,
    1 - (faq_chunks.embedding <=> query_embedding) as similarity
  from faq_chunks
  join faq_documents on faq_documents.id = faq_chunks.faq_document_id
  order by faq_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- RLS on, no permissive policies for authenticated — default-deny.
-- All access is server-side via service_role (see SECURITY.md §3).
alter table faq_documents enable row level security;
alter table faq_chunks enable row level security;
alter table pending_responses enable row level security;

-- service_role bypasses RLS, but still needs explicit table-level GRANT
-- (same fix pattern as conversations/messages permission-denied bug).
grant select, insert, update, delete on faq_documents to service_role;
grant select, insert, update, delete on faq_chunks to service_role;
grant select, insert, update, delete on pending_responses to service_role;
grant execute on function match_faq_chunks(vector, int) to service_role;
