import { readFileSync } from 'node:fs'
import { extractTitle, splitIntoH2Sections } from '../lib/rag/chunk'
import { determineSensitivityTag } from '../lib/rag/sensitivity'
import type { RetrievedChunk } from '../lib/rag/retrieve'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function chunkStub(
  overrides: Partial<RetrievedChunk> & Pick<RetrievedChunk, 'source_file' | 'content'>
): RetrievedChunk {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    faq_document_id: '00000000-0000-0000-0000-000000000002',
    heading: 'Test',
    similarity: 0.9,
    ...overrides,
  }
}

const servicesMd = readFileSync('faq/01-services-and-treatments.md', 'utf8')
const title = extractTitle(servicesMd)
const sections = splitIntoH2Sections(servicesMd)

assert(title.includes('Services'), `Unexpected title: ${title}`)
assert(sections.length === 8, `Expected 8 H2 sections, got ${sections.length}`)
assert(
  sections[0].heading === 'Botox & Anti-Wrinkle Injections',
  `Unexpected first heading: ${sections[0].heading}`
)

assert(
  determineSensitivityTag([
    chunkStub({
      source_file: '05-safety-and-contraindications.md',
      content: 'Pregnancy contraindications',
    }),
  ]) === 'sensitive',
  'Safety source file should be sensitive'
)

assert(
  determineSensitivityTag([
    chunkStub({
      source_file: '03-booking-and-cancellation.md',
      content: 'must be escalated to a licensed provider before confirming',
    }),
  ]) === 'sensitive',
  'Escalation wording should be sensitive'
)

assert(
  determineSensitivityTag([
    chunkStub({
      source_file: '02-pricing.md',
      content: 'Botox starts at 12 dollars per unit',
    }),
  ]) === 'routine',
  'Pricing chunk should be routine'
)

assert(
  determineSensitivityTag([]) === 'sensitive',
  'Zero retrieved chunks should be sensitive (no grounding)'
)

console.log('chunk + sensitivity unit checks passed')
console.log(`  title: ${title}`)
console.log(`  sections in 01: ${sections.length}`)
