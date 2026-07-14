import { embed } from '@/lib/rag/embed'
import { taggedError } from '@/lib/rag/stage-error'
import { createServiceClient } from '@/lib/supabase/server'

export type RetrievedChunk = {
  id: string
  faq_document_id: string
  heading: string
  content: string
  source_file: string
  similarity: number
}

const DEFAULT_MATCH_COUNT = 5

// Embeds the query and runs cosine similarity search against faq_chunks.
export async function retrieveRelevantChunks(
  query: string,
  matchCount: number = DEFAULT_MATCH_COUNT
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embed(query)
  const supabase = await createServiceClient()

  const { data, error } = await supabase.rpc('match_faq_chunks', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  })

  if (error) {
    throw taggedError('retrieval', error)
  }

  if (!data || data.length === 0) {
    console.warn(
      'NO_CHUNKS_RETRIEVED: no FAQ chunks above similarity threshold for query'
    )
    return []
  }

  return data as RetrievedChunk[]
}
