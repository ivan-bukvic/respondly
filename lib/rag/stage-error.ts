export type RagStage = 'embedding' | 'retrieval' | 'generation'

export type StageTaggedError = Error & { stage?: RagStage }

// Tags an error with which RAG stage it came from, without logging —
// the webhook route logs once, using this tag to say what actually failed.
// Idempotent: won't overwrite a stage a deeper call already set.
export function taggedError(stage: RagStage, error: unknown): StageTaggedError {
  const err = error instanceof Error ? error : new Error(String(error))
  const tagged = err as StageTaggedError
  if (!tagged.stage) {
    tagged.stage = stage
  }
  return tagged
}
