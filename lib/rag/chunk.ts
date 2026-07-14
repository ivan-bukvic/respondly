export type H2Section = {
  heading: string
  content: string
}

// Splits a FAQ markdown file on ## (H2) headings.
// Each section becomes one RAG chunk — no recursive/overlapping chunking.
export function splitIntoH2Sections(markdown: string): H2Section[] {
  const lines = markdown.split(/\r?\n/)
  const sections: H2Section[] = []

  let currentHeading: string | null = null
  let contentLines: string[] = []
  const leadingLines: string[] = []

  const flush = () => {
    if (currentHeading === null) {
      return
    }
    const content = contentLines.join('\n').trim()
    if (content.length > 0) {
      sections.push({ heading: currentHeading, content })
    }
    contentLines = []
  }

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/)
    if (h2Match) {
      if (currentHeading === null) {
        const leadingContent = leadingLines.join('\n').trim()
        // Strip the H1 title line — titles become faq_documents.title, not chunks.
        const withoutTitle = leadingContent
          .replace(/^#\s+.+$/m, '')
          .trim()
        if (withoutTitle.length > 0) {
          console.warn(
            `splitIntoH2Sections: content before the first H2 heading is not ingested:\n${withoutTitle}`
          )
        }
      }
      flush()
      currentHeading = h2Match[1].trim()
      continue
    }

    if (currentHeading !== null) {
      contentLines.push(line)
    } else {
      leadingLines.push(line)
    }
  }

  flush()
  return sections
}

// Extracts the H1 title from a FAQ markdown file (first `# ` line).
export function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m)
  if (!match) {
    throw new Error('FAQ document is missing an H1 title')
  }
  return match[1].trim()
}
