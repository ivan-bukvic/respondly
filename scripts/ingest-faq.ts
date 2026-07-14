import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { extractTitle, splitIntoH2Sections } from '../lib/rag/chunk'
import { embed } from '../lib/rag/embed'
import { createServiceClient } from '../lib/supabase/server'

// One-shot FAQ ingestion — run manually when FAQ content changes.
// Reuses shared createServiceClient (no request-context dependency).
// Embedding still goes through shared /lib/rag/embed.ts.

const faqDir = path.join(process.cwd(), 'faq')

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

async function ingestFaq() {
  requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  requireEnv('EMBEDDING_MODEL_API_KEY')

  const supabase = await createServiceClient()

  const files = (await readdir(faqDir))
    .filter((name) => name.endsWith('.md'))
    .sort()

  if (files.length === 0) {
    throw new Error(`No .md files found in ${faqDir}`)
  }

  console.log(`Found ${files.length} FAQ file(s).`)

  // Capture current corpus IDs before inserting the new one.
  // Old rows are deleted only after a fully successful re-insert, so a mid-run
  // failure leaves the previous corpus intact instead of half-deleted.
  const { data: existingDocs, error: existingDocsError } = await supabase
    .from('faq_documents')
    .select('id')
  if (existingDocsError) {
    throw existingDocsError
  }
  const previousDocumentIds = (existingDocs ?? []).map(
    (doc: { id: string }) => doc.id
  )

  let totalChunks = 0

  for (const sourceFile of files) {
    const filePath = path.join(faqDir, sourceFile)
    const markdown = await readFile(filePath, 'utf8')
    const title = extractTitle(markdown)
    const sections = splitIntoH2Sections(markdown)

    console.log(`\n${sourceFile}: "${title}" — ${sections.length} section(s)`)

    const { data: document, error: docError } = await supabase
      .from('faq_documents')
      .insert({ title, source_file: sourceFile })
      .select('id')
      .single()

    if (docError || !document) {
      throw docError ?? new Error(`Failed to insert faq_documents for ${sourceFile}`)
    }

    for (const section of sections) {
      const embedding = await embed(section.content)

      const { error: chunkError } = await supabase.from('faq_chunks').insert({
        faq_document_id: document.id,
        heading: section.heading,
        content: section.content,
        embedding,
      })

      if (chunkError) {
        throw chunkError
      }

      totalChunks += 1
      console.log(`  ✓ ${section.heading}`)
    }
  }

  if (previousDocumentIds.length > 0) {
    console.log(
      `\nRemoving ${previousDocumentIds.length} previous document(s)...`
    )
    const { error: deleteError } = await supabase
      .from('faq_documents')
      .delete()
      .in('id', previousDocumentIds)
    if (deleteError) {
      throw deleteError
    }
    // faq_chunks cascade via FK on delete
  }

  console.log(
    `\nIngestion complete: ${files.length} documents, ${totalChunks} chunks.`
  )
}

ingestFaq().catch((error) => {
  console.error('FAQ ingestion failed:', error)
  process.exit(1)
})
