import type {
  ContentBlock,
  MessageParam,
  ToolResultBlockParam,
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/messages'
import { BOOK_APPOINTMENT_TOOL, claude } from '@/lib/claude/client'
import { retrieveRelevantChunks } from '@/lib/rag/retrieve'
import {
  determineSensitivityTag,
  type SensitivityTag,
} from '@/lib/rag/sensitivity'
import { taggedError } from '@/lib/rag/stage-error'

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOOL_ROUNDS = 3

const SYSTEM_PROMPT = `You are the WhatsApp assistant for Lumin Aesthetic Clinic.
Answer the patient's question using ONLY the FAQ context provided below.
If the context does not cover the question, say you don't know and suggest they contact the clinic directly.
Do not invent prices, policies, medical advice, or details that are not in the context.
Keep answers concise and suitable for WhatsApp. Write plain text only — no markdown syntax (no **bold**, no # headings, no markdown lists). WhatsApp does not render markdown; use plain paragraphs and simple dashes or numbers if a list is needed.

When the patient clearly wants to book an appointment and you can determine a requested date/time, call the book_appointment tool.
Resolve relative dates (e.g. "Friday", "petak", "tomorrow") to an absolute ISO 8601 date-time using the current date-time provided in the user message.
Always emit requested_time as a full ISO 8601 timestamp ending in Z (UTC), for example 2026-07-17T14:00:00Z. Treat the patient's stated wall-clock time as UTC for this demo.
Include treatment when the patient named one. After the tool returns, write a short draft confirming the booking details for admin review — never tell the patient the appointment is final without that review.`

export type DraftResult = {
  draftText: string
  retrievedChunkIds: string[]
  sensitivityTag: SensitivityTag
}

type BookedAppointmentDetail = {
  requested_time: string
  treatment: string | null
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

function extractText(content: ContentBlock[]): string {
  return content
    .filter((block) => block.type === 'text')
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('\n')
    .trim()
}

function toolUseBlocks(content: ContentBlock[]): ToolUseBlock[] {
  return content.filter((block): block is ToolUseBlock => block.type === 'tool_use')
}

function buildBookingRecordedDraft(
  booked: BookedAppointmentDetail[]
): string {
  const details = booked
    .map((appointment) => {
      const treatmentPart = appointment.treatment
        ? ` for ${appointment.treatment}`
        : ''
      return `${appointment.requested_time}${treatmentPart}`
    })
    .join('; ')

  return `An appointment has been recorded (${details}). Please review and confirm these details with the patient before sending.`
}

async function executeBookAppointmentTool({
  toolUse,
  conversationId,
  baseUrl,
}: {
  toolUse: ToolUseBlock
  conversationId: string
  baseUrl: string
}): Promise<{
  toolResult: ToolResultBlockParam
  booked: BookedAppointmentDetail | null
}> {
  const input = (toolUse.input ?? {}) as {
    requested_time?: string
    treatment?: string
  }

  try {
    const response = await fetch(`${baseUrl}/api/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-mcp-secret': process.env.MCP_SHARED_SECRET ?? '',
      },
      body: JSON.stringify({
        name: 'book_appointment',
        input: {
          // Always use the trusted conversation id from the webhook —
          // never trust a model-supplied conversation_id.
          conversation_id: conversationId,
          requested_time: input.requested_time,
          treatment: input.treatment,
        },
      }),
    })

    const payload = (await response.json()) as {
      content?: string
      appointment?: {
        requested_time?: string
        treatment?: string | null
      }
      error?: { code?: string; message?: string }
    }

    if (!response.ok) {
      return {
        toolResult: {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          is_error: true,
          content:
            payload.error?.message ??
            `book_appointment failed with status ${response.status}`,
        },
        booked: null,
      }
    }

    const booked: BookedAppointmentDetail | null = payload.appointment
      ?.requested_time
      ? {
          requested_time: payload.appointment.requested_time,
          treatment: payload.appointment.treatment ?? null,
        }
      : null

    return {
      toolResult: {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: payload.content ?? JSON.stringify(payload),
      },
      booked,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'book_appointment request failed'
    return {
      toolResult: {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        is_error: true,
        content: message,
      },
      booked: null,
    }
  }
}

// Orchestrates retrieval → grounded Claude draft (with optional MCP
// booking tool call) → sensitivity tag.
// Always produces a pending draft for HITL — never auto-sends.
export async function generateDraftResponse({
  inboundBody,
  conversationId,
  baseUrl,
}: {
  inboundBody: string
  conversationId: string
  baseUrl: string
}): Promise<DraftResult> {
  const chunks = await retrieveRelevantChunks(inboundBody)
  const sensitivityTag = determineSensitivityTag(chunks)
  const retrievedChunkIds = chunks.map((chunk) => chunk.id)

  const nowIso = new Date().toISOString()
  const userPrompt = `Current date-time (ISO 8601, UTC): ${nowIso}

FAQ context:
${buildContextBlock(chunks)}

Patient message:
${inboundBody}

conversation_id for tools: ${conversationId}`

  const messages: MessageParam[] = [{ role: 'user', content: userPrompt }]
  const bookedAppointments: BookedAppointmentDetail[] = []

  try {
    let response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      tools: [BOOK_APPOINTMENT_TOOL],
      messages,
    })

    for (
      let round = 0;
      response.stop_reason === 'tool_use' && round < MAX_TOOL_ROUNDS;
      round += 1
    ) {
      const assistantContent = response.content
      const toolUses = toolUseBlocks(assistantContent)

      messages.push({ role: 'assistant', content: assistantContent })

      const toolResults: ToolResultBlockParam[] = []
      for (const toolUse of toolUses) {
        if (toolUse.name !== 'book_appointment') {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            is_error: true,
            content: `Unknown tool: ${toolUse.name}`,
          })
          continue
        }

        const { toolResult, booked } = await executeBookAppointmentTool({
          toolUse,
          conversationId,
          baseUrl,
        })
        toolResults.push(toolResult)
        if (booked) {
          bookedAppointments.push(booked)
        }
      }

      messages.push({ role: 'user', content: toolResults })

      response = await claude.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        tools: [BOOK_APPOINTMENT_TOOL],
        messages,
      })
    }

    const draftText = extractText(response.content)

    if (!draftText) {
      // Round exhaustion (or empty final text) after a successful booking must
      // still surface the booking to the admin — not the generic fallback.
      if (bookedAppointments.length > 0) {
        return {
          draftText: buildBookingRecordedDraft(bookedAppointments),
          retrievedChunkIds,
          sensitivityTag: 'sensitive',
        }
      }
      throw new Error('Claude returned an empty draft response')
    }

    return {
      draftText,
      retrievedChunkIds,
      sensitivityTag,
    }
  } catch (error) {
    if (bookedAppointments.length > 0) {
      return {
        draftText: buildBookingRecordedDraft(bookedAppointments),
        retrievedChunkIds,
        sensitivityTag: 'sensitive',
      }
    }
    throw taggedError('generation', error)
  }
}
