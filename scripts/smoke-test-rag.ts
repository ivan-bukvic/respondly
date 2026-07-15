import { generateDraftResponse } from '../lib/rag/generate-draft'
import { createServiceClient } from '../lib/supabase/server'
import { getInternalBaseUrl } from '../lib/http/internal-url'

// Smoke-test query-time RAG without WhatsApp.
// Requires: SQL migration applied + npm run ingest:faq already done.
// Usage: npx tsx --env-file=.env.local scripts/smoke-test-rag.ts

const cases: Array<{
  name: string
  body: string
  expect: (draft: string, tag: string) => void
}> = [
  {
    name: 'in-scope pricing',
    body: 'How much does Botox cost?',
    expect: (draft: string, tag: string) => {
      if (tag !== 'routine') {
        throw new Error(`Expected routine, got ${tag}`)
      }
      if (!/\$|unit|Botox|botox/i.test(draft)) {
        throw new Error(`Draft does not look price-grounded: ${draft}`)
      }
    },
  },
  {
    name: 'sensitive safety',
    body: 'Can I get Botox while pregnant?',
    expect: (draft: string, tag: string) => {
      if (tag !== 'sensitive') {
        throw new Error(`Expected sensitive, got ${tag}`)
      }
      if (!/pregnant|breastfeed|not performed|cannot|can't|provid/i.test(draft)) {
        throw new Error(`Draft does not look safety-grounded: ${draft}`)
      }
    },
  },
  {
    name: 'out-of-scope',
    body: "What's your clinic wifi password?",
    expect: (draft: string, _tag: string) => {
      void _tag
      if (!/don'?t know|do not know|not sure|don't have|unable|contact/i.test(draft)) {
        throw new Error(`Expected refusal / uncertainty, got: ${draft}`)
      }
    },
  },
]

async function resolveSmokeConversationId(): Promise<string> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (data?.id) {
    return data.id as string
  }

  // FAQ-only smoke runs may have an empty conversations table — create a
  // disposable row so generateDraftResponse has a valid conversation_id if
  // Claude unexpectedly calls book_appointment.
  const { data: created, error: insertError } = await supabase
    .from('conversations')
    .insert({
      whatsapp_number: '+10000000000',
      display_name: 'smoke-rag',
    })
    .select('id')
    .single()

  if (insertError) {
    throw insertError
  }

  return created.id as string
}

async function main() {
  const conversationId = await resolveSmokeConversationId()
  const baseUrl = getInternalBaseUrl()

  for (const testCase of cases) {
    console.log(`\n--- ${testCase.name} ---`)
    console.log(`Q: ${testCase.body}`)
    const result = await generateDraftResponse({
      inboundBody: testCase.body,
      conversationId,
      baseUrl,
    })
    console.log(`tag: ${result.sensitivityTag}`)
    console.log(`chunks: ${result.retrievedChunkIds.length}`)
    console.log(`draft: ${result.draftText}`)
    testCase.expect(result.draftText, result.sensitivityTag)
    console.log('PASS')
  }

  console.log('\nAll RAG smoke tests passed.')
}

main().catch((error) => {
  console.error('RAG smoke test failed:', error)
  process.exit(1)
})
