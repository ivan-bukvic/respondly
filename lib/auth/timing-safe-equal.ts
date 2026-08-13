import { timingSafeEqual as cryptoTimingSafeEqual } from 'node:crypto'

// Constant-time string compare for secrets (MCP shared secret, CRON_SECRET).
// Returns false when lengths differ — length is not secret for our demo use.
export function timingSafeEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && cryptoTimingSafeEqual(a, b)
}
