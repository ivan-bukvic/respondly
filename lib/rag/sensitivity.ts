import type { RetrievedChunk } from '@/lib/rag/retrieve'

export type SensitivityTag = 'routine' | 'sensitive'

const SAFETY_SOURCE_FILE = '05-safety-and-contraindications.md'
const ESCALATION_PATTERN = /escalat/i

// Source-based tagging only — not an LLM classifier.
// Every draft still goes through HITL approval regardless of this tag.
export function determineSensitivityTag(
  chunks: RetrievedChunk[]
): SensitivityTag {
  // Zero chunks = no grounding at all — treat as highest-risk for admin UI.
  if (chunks.length === 0) {
    return 'sensitive'
  }

  for (const chunk of chunks) {
    if (chunk.source_file === SAFETY_SOURCE_FILE) {
      return 'sensitive'
    }
    if (ESCALATION_PATTERN.test(chunk.content)) {
      return 'sensitive'
    }
  }

  return 'routine'
}
