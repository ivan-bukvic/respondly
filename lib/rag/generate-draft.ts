import { claude } from '@/lib/claude/client'
import { retrieveRelevantChunks } from '@/lib/rag/retrieve'
import {
  determineSensitivityTag,
  type SensitivityTag,
} from '@/lib/rag/sensitivity'
import { taggedError } from '@/lib/rag/stage-error'

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'

const SYSTEM_PROMPT = `You are the WhatsApp assistant for Lumin Aesthetic Clinic.
Answer the patient's question using ONLY the FAQ context provided below.
If the context does not cover the question, say you don't know and suggest they contact the clinic directly.
Do not invent prices, policies, medical advice, or details that are not in the context.
Keep answers concise and suitable for WhatsApp (short paragraphs, no markdown headings).`

export type DraftResult = {
  draftText: string
  retrievedChunkIds: string[]
  sensitivityTag: SensitivityTag
}

function buildContextBlock(
  chunks: Awaited<ReturnType<typeof retrieveRelevantChunks>>
): string {
  if (chunks.length === 0) {
    return 'No FAQ context was retrieved for this question.'
  }

  return chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] (${chunk.source_file} — ${chunk.heading})\n${chunk.content}`
    )
    .join('\n\n')
}

// Orchestrates retrieval → grounded Claude draft → sensitivity tag.
// Always produces a pending draft for HITL — never auto-sends.
export async function generateDraftResponse(
  inboundBody: string
): Promise<DraftResult> {
  const chunks = await retrieveRelevantChunks(inboundBody)
  const sensitivityTag = determineSensitivityTag(chunks)
  const retrievedChunkIds = chunks.map((chunk) => chunk.id)

  const userPrompt = `FAQ context:
${buildContextBlock(chunks)}

Patient message:
${inboundBody}`

  try {
    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = response.content.find((block) => block.type === 'text')
    const draftText = textBlock?.type === 'text' ? textBlock.text.trim() : ''

    if (!draftText) {
      throw new Error('Claude returned an empty draft response')
    }

    return {
      draftText,
      retrievedChunkIds,
      sensitivityTag,
    }
  } catch (error) {
    throw taggedError('generation', error)
  }
}
