import OpenAI from 'openai'
import { taggedError } from '@/lib/rag/stage-error'

// Single shared embedding helper used at ingestion AND query time.
// Must stay on the same model in both paths — mismatched models break retrieval.
//
// Lazy init (not module-scope): Next.js "Collecting page data" imports the
// webhook → generate-draft → retrieve → embed graph at build time. If
// EMBEDDING_MODEL_API_KEY is unset during that phase, `new OpenAI({ apiKey:
// undefined })` falls through the SDK's default to OPENAI_API_KEY and throws
// "Missing credentials…". Construct only when embed() actually runs.
let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (openai) {
    return openai
  }

  const apiKey = process.env.EMBEDDING_MODEL_API_KEY
  if (!apiKey) {
    throw new Error(
      'EMBEDDING_MODEL_API_KEY is not set — required for embedding calls'
    )
  }

  openai = new OpenAI({ apiKey })
  return openai
}

const EMBEDDING_MODEL = 'text-embedding-3-small'

export async function embed(text: string): Promise<number[]> {
  try {
    const response = await getOpenAIClient().embeddings.create({
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
