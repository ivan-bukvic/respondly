# RESPONDLY
## BACKEND MASTER — v1.1

> **THIS DOCUMENT IS THE SINGLE SOURCE OF TRUTH FOR:**
> - Database schema
> - RAG pipeline (ingestion + retrieval)
> - WhatsApp integration
> - HITL approval flow
> - MCP tool-calling
> - Auth
> - Query/mutation contracts
> - Environment variables

---

## 1. BACKEND CONTEXT

The backend supports exactly one flow, end to end:

```
WhatsApp message in → RAG-grounded draft generated → admin approves/edits/rejects → 
approved text sent via WhatsApp → (if booking intent) MCP tool writes appointment
```

Everything else is scaffolding around that flow. There is no multi-tenancy, no organization model, and no role system beyond a single admin.

### What the backend is NOT

- Not a multi-tenant SaaS backend
- Not a general-purpose chatbot platform
- Not an enterprise RAG system — 5 FAQ documents is the entire corpus

### What the backend IS

- A lightweight Supabase-first backend
- A thin orchestration layer around the Claude API
- A single Postgres database doing double duty as the relational store AND the vector store (pgvector)

---

## 2. OFFICIAL BACKEND STACK

| Layer | Technology |
|---|---|
| Database | Supabase Postgres |
| Vector store | Supabase pgvector (same database, no separate service) |
| Auth | Supabase Auth (single seeded admin user) |
| LLM | Anthropic Claude API |
| Tool-calling | MCP, exposed via a Next.js API route |
| Messaging | Twilio (WhatsApp Sandbox) |
| Hosting | Vercel (Next.js handles both frontend and all backend logic — no separate service) |

> **Provider note:** originally scoped against the Meta WhatsApp Cloud API sandbox directly. Switched to Twilio's WhatsApp Sandbox during Phase 0/1 after Meta developer account verification became persistently stuck (a platform-side issue, not project-specific). See `PRODUCT_MASTER.md` §4 for the full note. The WhatsApp integration surface (§8 below) reflects Twilio's model.

### FORBIDDEN

Do not introduce:
- A separate vector database (Pinecone, Weaviate, etc.) — pgvector is sufficient at this scale
- A separate microservice for MCP or RAG — everything runs inside the Next.js app
- Prisma, NestJS, Express, Redis — Supabase client + Next.js API routes are enough
- Any multi-tenant scaffolding (`organization_id`, RLS-by-org, etc.) — there is exactly one business

---

## 3. DATABASE SCHEMA

### `faq_documents`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| title | text | e.g. "Services & Treatments" |
| source_file | text | e.g. `01-services-and-treatments.md` |
| created_at | timestamptz | |

### `faq_chunks`

**The RAG corpus.**

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| faq_document_id | uuid | FK → faq_documents |
| heading | text | H2 section heading the chunk was split on |
| content | text | Chunk text |
| embedding | vector(1536) | pgvector column; dimension depends on embedding model chosen |
| created_at | timestamptz | |

Chunking strategy: split each FAQ markdown file on `##` headings. One chunk per section, tagged with its source document and heading. See §5.

### `conversations`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| whatsapp_number | text | Patient's WhatsApp number (E.164 format, e.g. `+381...`) |
| display_name | text | nullable, from WhatsApp profile if available (Twilio's `ProfileName` field) |
| created_at | timestamptz | |

### `messages`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| conversation_id | uuid | FK → conversations |
| direction | message_direction | enum: `inbound`, `outbound` |
| body | text | |
| message_sid | text | nullable; Twilio `MessageSid` for inbound (unique when set) — used for webhook retry idempotency |
| created_at | timestamptz | |

### `pending_responses`

**Core HITL table.**

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| conversation_id | uuid | FK → conversations |
| inbound_message_id | uuid | FK → messages |
| draft_text | text | AI-generated draft, or a static fallback message when `generation_failed` |
| final_text | text | nullable — set if edited |
| sensitivity_tag | sensitivity_tag | enum: `routine`, `sensitive` — display only, see §7 |
| retrieved_chunk_ids | uuid[] | which `faq_chunks` grounded this draft — useful for the demo/README to show RAG is actually working |
| generation_failed | boolean | default `false` — true when `draft_text` is the static fallback, not a real AI draft; admin UI must not treat this as one-click-sendable, see §11 |
| status | pending_status | enum: `pending`, `approved`, `edited_and_sent`, `rejected` |
| created_at | timestamptz | |
| resolved_at | timestamptz | nullable |

### `appointments`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| conversation_id | uuid | FK → conversations |
| requested_time | timestamptz | |
| treatment | text | nullable, free text from the MCP tool call |
| status | appointment_status | enum: `booked`, `cancelled` |
| created_at | timestamptz | |

### `interaction_log`

**Powers the admin panel's history log — see `FRONTEND_MASTER.md` §7.**

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| pending_response_id | uuid | FK → pending_responses |
| action | log_action | enum: `approved`, `edited_and_sent`, `rejected` |
| actor | text | admin identifier (single-admin scope — mostly for future-proofing) |
| created_at | timestamptz | |

---

## 4. AUTH

Single seeded Supabase Auth user (the admin). No signup flow, no invite flow, no role table — this is a deliberate reduction from a real product's auth system.

```
1. Admin user seeded manually in Supabase (or via a one-time setup script)
2. Login via Supabase Auth (email + password)
3. Next.js middleware (proxy.ts in Next.js 16+) protects /admin — redirects unauthenticated requests to /login
```

If the public demo URL needs a lighter gate than full login (see `PRODUCT_MASTER.md` §11), a Vercel/Next.js basic-auth layer sits in front of the whole app in addition to this — this is a deployment-time decision (Phase 5), not a schema decision.

---

## 5. RAG PIPELINE — INGESTION

Run once (or whenever FAQ content changes), not part of the request path:

```
for each .md file in /faq:
    split content on H2 (`##`) headings
    for each section:
        chunk = { faq_document_id, heading, content }
        embedding = embed(chunk.content)
        insert into faq_chunks
```

- Embedding model: any Anthropic-compatible or OpenAI embedding model works with pgvector; pick one and keep it consistent between ingestion and query time (mismatched models = broken retrieval)
- No need for recursive/overlapping chunking at this corpus size — clean H2 splits are enough for 5 documents

---

## 6. RAG PIPELINE — QUERY TIME

On each inbound WhatsApp message:

```
1. embed(inbound_message.body)
2. similarity search against faq_chunks (top-k, k=3–5, cosine distance)
3. build prompt: system instructions + retrieved chunks + inbound message
4. call Claude API → draft_text
5. insert into pending_responses (status = 'pending')
```

### Prompt construction rule

The system prompt must instruct Claude to answer **only** from the retrieved chunks and to say it doesn't know rather than guessing if the chunks don't cover the question — this is what makes "RAG-grounded" a true claim in the demo, not just a marketing label.

---

## 7. SENSITIVITY TAGGING

**Every draft requires admin approval regardless of this tag** — see `PRODUCT_MASTER.md` §6.3. The tag is for admin-panel display only (badge/color coding in `FRONTEND_MASTER.md` §7).

Simplest viable approach for MVP: tag a draft `sensitive` if any retrieved chunk originates from `05-safety-and-contraindications.md` or contains an explicit escalation note (both FAQ docs 03 and 05 already contain sentences like "must be escalated to a licensed provider" — see `Respondly_Project_Spec` FAQ set). This avoids building a separate classifier for something that doesn't change system behavior, only UI framing.

This is listed as an open decision in `PRODUCT_MASTER.md` §11 — the keyword/source-based approach above is the recommended default unless a reason emerges during Phase 3 to do LLM-based classification instead.

**Update (Phase 2 review round 2):** `sensitive` is also set when retrieval finds zero grounding chunks, and on the RAG-failure fallback path (§11 ERROR HANDLING) — not just source-content matches. It now means "give this draft extra scrutiny" more broadly than "this is safety content." The `generation_failed` flag (§11) is the one that specifically means "there is no real draft here" — the admin UI must key off that, not off `sensitivity_tag`, to decide whether one-click Approve is safe.

---

## 8. WHATSAPP INTEGRATION (Twilio)

### Provider model

Twilio's WhatsApp Sandbox has no handshake/verification step (unlike Meta's Cloud API, which requires a `GET` challenge-response). Configuration is done once in the Twilio Console: point the Sandbox's **"When a message comes in"** webhook field at our `/api/webhook/whatsapp` endpoint. From that point on, every inbound WhatsApp message to the Sandbox number is POSTed to that URL automatically.

### Inbound (webhook)

`POST /api/webhook/whatsapp`

```
1. Verify Twilio request signature (X-Twilio-Signature header, validated against the
   full request URL + POST params using the Twilio Auth Token) — reject if invalid
2. Parse inbound message payload (Twilio sends application/x-www-form-urlencoded,
   not JSON — key fields: From, Body, ProfileName, MessageSid)
3. Normalize From field (Twilio sends it as "whatsapp:+381...") to a plain
   E.164 number before storing/matching against conversations.whatsapp_number
4. Find or create conversation by whatsapp_number
5. Insert into messages (direction = 'inbound')
6. Trigger RAG pipeline (§6) synchronously or via a queued job
```

Twilio expects a response to the webhook request — either an empty `200 OK`, or a TwiML response. Since Respondly never auto-replies (§9, HITL is mandatory), the webhook handler should return an empty `200` (no TwiML `<Message>` body) — the actual reply is sent later, separately, via the outbound path once an admin approves it.

### Outbound (send)

Triggered only from an admin action (`approve` / `edit`), never automatically:

```
1. Call the Twilio REST API (Messages resource) to send a WhatsApp message,
   From = the Twilio Sandbox WhatsApp number, To = whatsapp:+<patient number>
2. Insert into messages (direction = 'outbound')
3. Update pending_responses.status
4. Insert into interaction_log
```

### Sandbox session constraint (demo-relevant, not a bug)

The Twilio Sandbox requires each end-user phone to send a `join <sandbox-code>` message before it can receive messages, and that sandbox session expires after 3 days of inactivity. For the Loom recording, confirm the demo phone is actively joined before recording. This is a documented Twilio Sandbox limitation, not something to engineer around — worth a one-line mention in the README's "Known Limitations" section (`faza_5_demo_polish.md`).

### No GET handshake route needed

Unlike the original Meta-based plan, there is no `GET /api/webhook/whatsapp` handshake endpoint to implement — Twilio's Sandbox webhook is configured directly in the Console UI, with no verification challenge. If a production (non-sandbox) Twilio WhatsApp sender is ever used, this remains true — Twilio's webhook model does not require a handshake route regardless of sandbox vs. production.

---

## 9. HITL APPROVAL FLOW

State machine on `pending_responses.status`:

```
pending → approved        (Approve action → sends draft_text as-is)
pending → edited_and_sent (Edit action → sends final_text)
pending → rejected        (Reject action → nothing sent)
```

Each transition is server-validated (Zod) and writes one `interaction_log` row. No transition is allowed to skip the `pending` state — there is no path from message received to message sent that doesn't pass through an explicit admin action. This is the one rule in the entire project that must never be violated, since it's the core thing the demo is proving.

---

## 10. MCP TOOL CALL — BOOKING

### Tool definition

```json
{
  "name": "book_appointment",
  "description": "Book an appointment for a patient at the requested time.",
  "input_schema": {
    "type": "object",
    "properties": {
      "conversation_id": { "type": "string" },
      "requested_time": { "type": "string", "format": "date-time" },
      "treatment": { "type": "string" }
    },
    "required": ["conversation_id", "requested_time"]
  }
}
```

### Flow

```
1. Claude, while generating a draft response, determines the message expresses booking intent
2. Claude calls book_appointment via MCP instead of hardcoded booking logic
3. Next.js MCP endpoint (/api/mcp) receives the tool call, inserts into appointments
4. Tool result is returned to Claude, which incorporates confirmation into the draft response
5. The draft (including booking confirmation language) still goes through the normal HITL approval flow — booking is not auto-confirmed to the patient without admin approval, consistent with §9
```

### Where the MCP server lives

Inside the same Next.js app, as a single API route — not a separate service. This keeps the "one backend" principle intact and avoids the operational overhead of a second deployable for a single tool.

---

## 11. ERROR HANDLING

| Code | Trigger |
|---|---|
| `WHATSAPP_SEND_FAILED` | Twilio API returned an error on outbound send |
| `INVALID_WEBHOOK_SIGNATURE` | Inbound webhook signature verification failed (Twilio `X-Twilio-Signature` mismatch) |
| `EMBEDDING_FAILED` | Embedding call failed during ingestion or query |
| `NO_CHUNKS_RETRIEVED` | RAG retrieval returned nothing above similarity threshold — draft should say "I don't know," not hallucinate |
| `MCP_TOOL_ERROR` | `book_appointment` insert failed |
| `INVALID_STATE_TRANSITION` | Attempted transition out of a non-`pending` `pending_responses` row |

Errors are logged server-side; the admin panel surfaces a plain-language message, never a raw stack trace or SQL error (see `FRONTEND_MASTER.md` §8).

**RAG pipeline failure fallback:** if embedding, retrieval, or Claude generation throws, the webhook still inserts a `pending_responses` row (never drops the message from the HITL queue) with a static "please review manually" `draft_text`, `sensitivity_tag = 'sensitive'`, and `generation_failed = true`. Server logs tag which stage failed (`embedding` / `retrieval` / `generation` / `persistence`) instead of one generic message, so an on-call engineer can tell OpenAI, Supabase, and Claude failures apart.

**Known limitations / tech debt carried from Phase 2 into Phase 3 (not fixed, documented deliberately):**
- `scripts/ingest-faq.ts` inserts the new FAQ corpus before deleting the old one (to avoid a half-wiped corpus on failure), which means a webhook request arriving mid-ingestion can retrieve a mix of stale and fresh chunks for the same heading, and `retrieved_chunk_ids` captured during that window can end up pointing at chunks deleted moments later (no FK on that column). Acceptable at demo scale (ingestion is a rare, manual, low-traffic-overlap operation); would need a `faq_chunks.corpus_version` column or a swap-via-view pattern to close properly.
- The same script's final cleanup delete passes all previous document IDs in one `.in(...)` filter with no batching — fine at 5 FAQ documents, would need chunking into batches if the corpus grows into the hundreds.
- The `pending_responses_inbound_message_id_key` unique constraint has no pre-migration dedup step; if duplicate rows already exist when it's applied, the migration fails until someone manually removes the duplicates first.
- `scripts/test-pending-idempotency.ts` exercises sequential inserts (insert, then insert again) to prove the 23505 fallback path, not true concurrent inserts via `Promise.all` — it doesn't prove the fix under real request-level concurrency, only that the DB constraint + application-level catch cooperate correctly once a conflict occurs.
- `insertPendingResponse` (`lib/responses/queries.ts`) and `insertInboundMessage` (`lib/conversations/queries.ts`) both hand-roll the same "insert, catch 23505, re-select and return the existing row" idempotency pattern instead of sharing one helper. Low risk today (two call sites, unlikely to drift silently) but worth extracting if a third idempotent-insert call site appears.

---

## 12. ENVIRONMENT VARIABLES

| Variable | Type | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Client, RLS-protected |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Server only — used for the webhook and MCP routes, which act outside a logged-in user's session |
| `ANTHROPIC_API_KEY` | **Secret** | Server only |
| `TWILIO_ACCOUNT_SID` | **Secret** | Server only — Twilio account identifier, used to build API requests |
| `TWILIO_AUTH_TOKEN` | **Secret** | Server only — used both to authenticate outbound Twilio API calls and to validate the `X-Twilio-Signature` header on inbound webhooks |
| `TWILIO_WHATSAPP_NUMBER` | Server only (not secret, but not client-exposed either) | The Twilio Sandbox WhatsApp number (e.g. `whatsapp:+14155238886`), used as the `From` value on outbound sends |
| `EMBEDDING_MODEL_API_KEY` | **Secret** | Server only, if using a separate embedding provider |

---

## 13. WHAT NOT TO BUILD

Do not build:
- Multi-tenant schema (`organization_id` anywhere)
- A generic/reusable chatbot framework — this is one fixed flow for one fictional business
- Auto-send logic of any kind — every send goes through §9
- A queue/job system — the request volume for a demo never justifies one
- Realtime sync (see `FRONTEND_MASTER.md` §9)
- Analytics, reporting, or usage tracking beyond `interaction_log`
- A Meta-specific GET handshake route — not applicable to the Twilio integration model (see §8)
- Twilio Studio flows, Twilio Functions, or any Twilio no-code/low-code layer — the integration lives in our own Next.js API routes, consistent with the "one backend" principle

> If it sounds like infrastructure for scale this project will never see, it doesn't belong here.

---

## 14. FINAL BACKEND PHILOSOPHY

```
Backend serves the demo.
Simple > clever.
One flow, done well > many flows, done shallowly.
Every send is a human decision — no exceptions.
```

### Final Reminder

Biggest backend risks for this project:
- Building auto-send "just for routine questions" — this directly contradicts the thing the project exists to prove
- Over-building the RAG pipeline (reranking, hybrid search, etc.) for a 5-document corpus
- Splitting MCP or RAG into separate services when one Next.js app is sufficient
- Assuming Meta-specific webhook mechanics (handshake, `X-Hub-Signature-256`) apply to Twilio — they don't; see §8

---

*Respondly BACKEND MASTER · v1.1 · Portfolio Project*
