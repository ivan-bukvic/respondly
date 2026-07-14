import OpenAI from 'openai'
import { taggedError } from '@/lib/rag/stage-error'

// Single shared embedding helper used at ingestion AND query time.
// Must stay on the same model in both paths — mismatched models break retrieval.
const openai = new OpenAI({
  apiKey: process.env.EMBEDDING_MODEL_API_KEY!,
})

const EMBEDDING_MODEL = 'text-embedding-3-small'

export async function embed(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    })

    const embedding = response.data[0]?.embedding
    if (!embedding || embedding.length === 0) {
      throw new Error('Embedding provider returned an empty vector')
    }

    return embedding
  } catch (error) {
    throw taggedError('embedding', error)
  }
}
