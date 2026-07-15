import Anthropic from '@anthropic-ai/sdk'
import type { Tool } from '@anthropic-ai/sdk/resources/messages'

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

// Registered tool for Phase 4 booking. Pass this into messages.create —
// do not redefine the schema at call sites.
export const BOOK_APPOINTMENT_TOOL: Tool = {
  name: 'book_appointment',
  description: 'Book an appointment for a patient at the requested time.',
  input_schema: {
    type: 'object',
    properties: {
      conversation_id: { type: 'string' },
      requested_time: { type: 'string', format: 'date-time' },
      treatment: { type: 'string' },
    },
    required: ['conversation_id', 'requested_time'],
  },
}
