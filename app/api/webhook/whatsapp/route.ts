import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  findMessageBySid,
  findOrCreateConversation,
  insertInboundMessage,
} from '@/lib/conversations/queries'
import { getInternalBaseUrl } from '@/lib/http/internal-url'
import { generateDraftResponse } from '@/lib/rag/generate-draft'
import { insertPendingResponse } from '@/lib/responses/queries'
import { stripWhatsAppPrefix } from '@/lib/whatsapp/format'
import {
  getTwilioWebhookUrl,
  verifyTwilioSignature,
} from '@/lib/whatsapp/verify'

// Twilio SDK uses Node crypto — keep this route on the Node.js runtime.
export const runtime = 'nodejs'

const twilioInboundSchema = z.object({
  From: z.string().min(1),
  Body: z.string(),
  ProfileName: z.string().optional(),
  MessageSid: z.string().min(1),
})

function formDataToParams(formData: FormData): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      params[key] = value
    }
  }
  return params
}

// Twilio WhatsApp Sandbox inbound webhook.
// No GET handshake — Twilio has no Meta-style challenge step.
// Returns empty 200 OK (no TwiML) — Respondly never auto-replies.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const params = formDataToParams(formData)

    const signature = request.headers.get('x-twilio-signature')
    const url = getTwilioWebhookUrl(request)
    const isValid = verifyTwilioSignature(url, signature, params)

    if (!isValid) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_WEBHOOK_SIGNATURE',
            message: 'Twilio signature verification failed',
          },
        },
        { status: 401 }
      )
    }

    const parsed = twilioInboundSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_WEBHOOK_PAYLOAD',
            message: 'Missing or invalid Twilio webhook fields',
          },
        },
        { status: 400 }
      )
    }

    const { From, Body, ProfileName, MessageSid } = parsed.data
    const whatsappNumber = stripWhatsAppPrefix(From)

    // Twilio retries on 5xx with the same MessageSid — early-return if known.
    const existing = await findMessageBySid(MessageSid)
    if (existing) {
      return new Response(null, { status: 200 })
    }

    const conversation = await findOrCreateConversation(
      whatsappNumber,
      ProfileName
    )
    const inboundMessage = await insertInboundMessage(
      conversation.id,
      Body,
      MessageSid
    )

    // RAG draft generation — always creates a pending row for HITL.
    // Failures must not fail the webhook (Twilio would retry the same MessageSid),
    // but a fallback pending row keeps the message in the HITL queue.
    try {
      const baseUrl = getInternalBaseUrl(request)
      const { draftText, retrievedChunkIds, sensitivityTag } =
        await generateDraftResponse({
          inboundBody: Body,
          conversationId: conversation.id,
          baseUrl,
        })
      await insertPendingResponse({
        conversationId: conversation.id,
        inboundMessageId: inboundMessage.id,
        draftText,
        retrievedChunkIds,
        sensitivityTag,
      })
    } catch (ragError) {
      // generate-draft.ts/retrieve.ts/embed.ts tag their own errors with a stage;
      // an untagged error here can only have come from insertPendingResponse.
      const stage = (ragError as { stage?: string })?.stage ?? 'persistence'
      console.error(`RAG pipeline error [${stage}]:`, ragError)
      try {
        await insertPendingResponse({
          conversationId: conversation.id,
          inboundMessageId: inboundMessage.id,
          draftText:
            'Automatic draft generation failed for this message. Please review the original message and reply manually.',
          retrievedChunkIds: [],
          sensitivityTag: 'sensitive',
          generationFailed: true,
        })
      } catch (fallbackError) {
        console.error(
          'Failed to insert fallback pending_response:',
          fallbackError
        )
      }
    }

    return new Response(null, { status: 200 })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'WEBHOOK_PROCESSING_FAILED',
          message: 'Failed to process inbound WhatsApp message',
        },
      },
      { status: 500 }
    )
  }
}
