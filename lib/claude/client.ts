import Anthropic from '@anthropic-ai/sdk'

// Single shared Anthropic client wrapper.
// Used by the RAG pipeline (Phase 2) for draft generation, and by the
// MCP booking flow (Phase 4) for tool-calling. Do not instantiate
// Anthropic clients anywhere else — import this instead.
//
// Module-scope init (same pattern embed.ts used to have). Intentionally
// left as-is: Anthropic's constructor does not throw when ANTHROPIC_API_KEY
// is missing at build time, so it does not break Vercel "Collecting page
// data". If that ever changes, lazy-init like lib/rag/embed.ts.
export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})