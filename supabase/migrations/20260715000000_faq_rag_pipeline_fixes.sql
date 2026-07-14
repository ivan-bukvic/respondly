-- Faza 2 review fixes (#3 unique inbound_message_id, #4 similarity threshold)
-- Run manually in Supabase SQL Editor when MCP has no access to the respondly project.

-- #3: one pending_responses row per inbound message (prevents concurrent duplicates)
alter table pending_responses
  add constraint pending_responses_inbound_message_id_key unique (inbound_message_id);

-- #4: replace 2-arg signature with 3-arg (match_threshold).
-- Postgres overloads by signature, so the old function must be dropped first.
drop function if exists match_faq_chunks(vector(1536), int);

create or replace function match_faq_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  match_threshold float default 0.15
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
  where 1 - (faq_chunks.embedding <=> query_embedding) > match_threshold
  order by faq_chunks.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function match_faq_chunks(vector, int, float) to service_role;
