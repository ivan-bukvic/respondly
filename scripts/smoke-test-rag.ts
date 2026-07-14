import { generateDraftResponse } from '../lib/rag/generate-draft'

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

async function main() {
  for (const testCase of cases) {
    console.log(`\n--- ${testCase.name} ---`)
    console.log(`Q: ${testCase.body}`)
    const result = await generateDraftResponse(testCase.body)
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
