import { createServiceClient } from '../lib/supabase/server'
import { insertPendingResponse } from '../lib/responses/queries'

// Manual duplicate-delivery test for pending_responses unique(inbound_message_id).
// Requires: fix migration applied.
// Usage: npx tsx --env-file=.env.local scripts/test-pending-idempotency.ts

async function main() {
  const supabase = await createServiceClient()

  const { data: message, error: messageError } = await supabase
    .from('messages')
    .select('id, conversation_id')
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (messageError) {
    throw messageError
  }

  if (!message) {
    throw new Error(
      'No inbound messages found — send a WhatsApp message first, then re-run.'
    )
  }

  const first = await insertPendingResponse({
    conversationId: message.conversation_id,
    inboundMessageId: message.id,
    draftText: 'Idempotency test draft A',
    retrievedChunkIds: [],
    sensitivityTag: 'sensitive',
  })

  const second = await insertPendingResponse({
    conversationId: message.conversation_id,
    inboundMessageId: message.id,
    draftText: 'Idempotency test draft B (should not create a second row)',
    retrievedChunkIds: [],
    sensitivityTag: 'routine',
  })

  if (first.id !== second.id) {
    throw new Error(
      `Expected same pending_response id, got ${first.id} vs ${second.id}`
    )
  }

  const { count, error: countError } = await supabase
    .from('pending_responses')
    .select('id', { count: 'exact', head: true })
    .eq('inbound_message_id', message.id)

  if (countError) {
    throw countError
  }

  if (count !== 1) {
    throw new Error(`Expected exactly 1 pending_response, got ${count}`)
  }

  console.log('pending_responses idempotency PASS')
  console.log(`  inbound_message_id: ${message.id}`)
  console.log(`  pending_response_id: ${first.id}`)
}

main().catch((error) => {
  console.error('Idempotency test failed:', error)
  process.exit(1)
})
