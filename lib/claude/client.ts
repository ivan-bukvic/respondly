import Anthropic from '@anthropic-ai/sdk'

// Single shared Anthropic client wrapper.
// Used by the RAG pipeline (Phase 2) for draft generation, and by the
// MCP booking flow (Phase 4) for tool-calling. Do not instantiate
// Anthropic clients anywhere else — import this instead.
export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})