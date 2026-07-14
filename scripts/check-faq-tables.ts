import { createServiceClient } from '../lib/supabase/server'

async function main() {
  const supabase = await createServiceClient()

  for (const table of ['conversations', 'messages', 'faq_documents', 'faq_chunks', 'pending_responses']) {
    const { error } = await supabase.from(table).select('id').limit(1)
    console.log(`${table}: ${error ? error.message : 'OK'}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
