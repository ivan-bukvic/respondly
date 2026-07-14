<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Review Rules

When /review is triggered:

- Never edit code during review — feedback only
- Check code quality and structure
- Check database schema and RLS policies (single-admin scope — no organization_id anywhere; RLS still required as baseline protection since NEXT_PUBLIC_SUPABASE_ANON_KEY is public)
- Check that HITL approval flow is never bypassed — no path from received message to sent message that skips an explicit admin action (Approve/Edit/Reject), even for sensitivity_tag = 'routine'
- Check that Shared Foundations modules are reused (/lib/supabase, /lib/claude, /lib/auth, /lib/rag, /lib/whatsapp) — flag any local reimplementation of a client or helper that already exists in /lib
- Check edge functions / API routes if present
- Verify Supabase MCP is used for all DB operations
- Never suggest `supabase db push` or migration files, EXCEPT: manual SQL migrations in `supabase/migrations/` are an allowed fallback when Supabase MCP has no access to the respondly project (verify via `list_projects` before flagging this as a violation)
- Check folder structure follows project conventions
- Check naming convention: snake_case in DB and API payloads, camelCase only in internal TS code
- Report issues by severity: Critical, High, Medium, Low

### Project Context — Required Reading

Before planning any phase implementation, fix, or feature, consult these documents in docs/:

- docs/PROJECT_MEMORY.md — locked architectural decisions and anti-patterns. Do not deviate from these without explicit user confirmation.
- docs/BACKEND_MASTER.md — database schema, RAG pipeline, WhatsApp integration, HITL flow, MCP tool-calling, auth, error handling, env variables.
- docs/FRONTEND_MASTER.md — routes, page layout, component requirements, frontend/backend contract.
- docs/SECURITY.md — public vs protected routes, server-side-only operations, webhook security, RLS conventions.

These are the single source of truth for cross-cutting rules. Phase documents (docs/phases/faza_*.md) implement these rules — they don't replace them. If a phase document and a master document conflict, flag it and ask rather than guessing which one wins.
