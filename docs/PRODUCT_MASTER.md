# RESPONDLY

Product Master Specification

|             |                                    |
|-------------|------------------------------------|
| **Version** | 1.1 — Twilio WhatsApp provider     |
| **Status**  | Planning                           |
| **Stack**   | Next.js 15 · Supabase (incl. pgvector) · Claude API · TypeScript |
| **Hosting** | Vercel                             |
| **Date**    | 2026                               |

**PORTFOLIO PROJECT — NOT FOR PRODUCTION USE**

---

## 1. Product Vision

Respondly is a portfolio demo project: a WhatsApp AI Support Agent for a small appointment-based service business. It exists to prove — concretely and demonstrably — four capability patterns that recur constantly in Upwork AI Automation jobs: WhatsApp integration, RAG-grounded responses, human-in-the-loop (HITL) approval, and MCP tool-calling.

**This is not a product meant for real users.** The goal is a convincing, honest, working demo that can be shown in a 30–60 second Loom recording and referenced directly in proposals ("I built something similar to this").

### Why this project (context)

Review of Great Fit / Bad Fit Upwork listings surfaced four capability gaps not covered by the existing portfolio (FlowOps, Wellora, Savio, Optilium, Gallebo, AI Knowledge Workspace, AI Meeting Intelligence):

- **WhatsApp Business API integration** — appears across many Great Fit jobs (car rental chatbot, clinic support, DTC support, lead reactivation). Not demonstrated anywhere yet.
- **Human-in-the-loop approval** — explicitly requested in multiple listings ("no output reaches the client without review"). Not demonstrated anywhere yet.
- **MCP tool-calling** — mentioned in multiple Great Fit jobs, only ever listed as "planned" elsewhere in the portfolio.

Decision: one combined project (WhatsApp + RAG + HITL + MCP) instead of several smaller ones — maximum ground covered for minimum total build time, and one strong Loom demo instead of several weaker ones.

## 2. Fictional Business

**Lumin Aesthetic Clinic** — a boutique dermatology & aesthetics practice in Austin, TX. Chosen because appointment-based service businesses are the most common pattern across the reviewed job listings, and an aesthetics clinic gives the FAQ content enough nuance (treatment types, contraindications, pricing tiers) to make RAG grounding visibly meaningful, rather than trivial keyword matching.

Source content: 5 FAQ documents (`/faq`) covering services, pricing, booking policy, pre/post-treatment care, and safety/contraindications. These double as the RAG knowledge base and the demo's "realistic placeholder data."

## 3. Users & Roles

Respondly is single-tenant and single-admin — there is no organization model, no multi-tenancy, and no role system. This is a deliberate scope reduction from a real product.

| Role | Access | Purpose |
|---|---|---|
| **Admin** | Full access to `/admin` | Reviews, edits, approves, or rejects every AI-generated draft before it is sent |
| **Patient (WhatsApp user)** | No system access | Interacts only via WhatsApp; never sees the admin panel |

## 4. Tech Stack

### Frontend

| Technology | Role |
|---|---|
| Next.js 15 (App Router) | Admin panel + API routes (webhook, MCP endpoint) |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| shadcn/ui | Component library — no custom design system from scratch |

### Backend

| Technology | Purpose |
|---|---|
| Supabase (Postgres) | Database, Auth (single admin user), Storage |
| Supabase pgvector | Vector store for RAG — no separate vector DB |
| Claude API (Anthropic) | Response generation + orchestration |
| Claude Agent SDK / MCP | Tool-calling for the booking action |

### Hosting & External Services

| Service | Provider | Purpose |
|---|---|---|
| App hosting | Vercel | Next.js deployment, public demo URL |
| Database | Supabase Cloud | Postgres + pgvector + Auth |
| Messaging | Twilio (WhatsApp Sandbox) | WhatsApp channel — no business verification required for sandbox use |
| LLM | Anthropic Claude API | RAG response generation |

> **Provider note:** Respondly originally targeted the Meta WhatsApp Cloud API sandbox directly. During Phase 0/1 setup, Meta's developer account verification became persistently stuck (a known, widely-reported platform issue at the time of building — not specific to this project) and blocked registration entirely. Twilio's WhatsApp Sandbox was adopted instead: it requires no business verification for sandbox/testing use, has a simpler webhook model (no handshake step), and fulfills the same requirement — a real WhatsApp number, not a mocked chat UI. This is disclosed here and in the README (see §9) as a transparent build decision, not a shortcut.

## 5. Database Entities (high-level)

| Table | Core Fields | Description |
|---|---|---|
| `faq_documents` | id, title, source_file | One row per FAQ markdown source file |
| `faq_chunks` | id, faq_document_id, heading, content, embedding (vector) | Chunked, embedded FAQ content — the RAG corpus |
| `conversations` | id, whatsapp_number, created_at | One per distinct WhatsApp contact |
| `messages` | id, conversation_id, direction, body, created_at | Full inbound/outbound message log |
| `pending_responses` | id, conversation_id, inbound_message_id, draft_text, status, sensitivity_tag | Drafts awaiting admin action |
| `appointments` | id, conversation_id, requested_time, status | Bookings created via the MCP tool call |
| `interaction_log` | id, pending_response_id, action, actor, created_at | Human-readable audit trail shown in the admin panel |

Full schema detail lives in `BACKEND_MASTER.md`.

## 6. Core Modules (the 4 things this project must prove)

### 6.1 WhatsApp Integration
Inbound messages arrive via Twilio's WhatsApp Sandbox webhook (Twilio forwards each incoming WhatsApp message as a POST request to our configured webhook URL). Outbound messages (approved responses) are sent through the Twilio REST API (Programmable Messaging). No mock chat UI — the Loom demo must show a real WhatsApp number (the Twilio Sandbox number, with the demo phone joined to the sandbox).

### 6.2 RAG-Grounded Response
Every inbound message is embedded and matched against `faq_chunks` (top-k retrieval, k=3–5). Claude generates a draft response grounded in the retrieved chunks. Knowledge base is intentionally small (5 FAQ docs) — the point is proving the pattern works, not building an enterprise corpus.

### 6.3 Human-in-the-Loop Approval
**Every generated draft requires admin approval before sending — there is no auto-send path.** This matches the pattern explicitly requested in the source job listings ("no AI output reaches the client without review") more faithfully than only escalating "sensitive" messages. Each draft is tagged `routine` or `sensitive` for admin-panel display, but the tag affects UI presentation only, never the approval requirement. One screen, three actions: **Approve / Edit / Reject.**

### 6.4 MCP Tool Call
One concrete action — booking an appointment — is exposed as an MCP tool (`book_appointment`) rather than hardcoded into the response logic. The tool writes to the `appointments` Supabase table. Google Calendar sync is an optional stretch goal, not a requirement.

## 7. Deliberately Out of Scope

- Full CRM — one Supabase table is enough
- Multiple languages or channels — WhatsApp only
- Complex analytics dashboard — a simple log is enough
- Multi-page, polished admin panel — one page with a pending list + history log
- Custom UI design from scratch — shadcn/Tailwind defaults
- Multi-tenancy, roles beyond a single admin
- Real appointment reminders, payments, or patient accounts
- Production WhatsApp Business Account / Meta app review — sandbox (Twilio) is sufficient for demo purposes; a real client engagement would go through proper business verification with whichever provider fits their needs

## 8. Time & Quality Bar

Target: 5–8 focused working days using AI-assisted tooling (Cursor / Claude Code). Priority order: functionality first, then a clean and modern but simple UI, no polish beyond that. The end goal is not a product real clients would use — it's proof of a working pattern that prospective clients can see and trust.

## 9. Demo & Portfolio Requirements

These directly affect what "done" looks like for each module — see `EXECUTION_PHASES.md` for where they land in the build order.

- Loom recorded against a **real WhatsApp number** (Twilio Sandbox), not a mocked chat UI
- Deployed to a **real URL** (Vercel), optionally behind a basic password
- **Realistic placeholder data** — real business name/logo/FAQ content, not lorem ipsum or "test test test"
- Admin panel shows a **visible history log** (Approved / Edited & sent / Rejected), not just an empty pending queue
- A short **README** covering how to run it, the architecture, what would change for a real client, and the Twilio-instead-of-Meta provider decision (see §4 provider note)
- **Transparency in proposals**: this is disclosed as a demo/R&D project, not real client work — the architecture is presented as identical to what a client would receive, adapted to their own FAQs and workflow. The WhatsApp provider (Twilio vs. direct Meta Cloud API) is a swappable implementation detail — the patterns proven (RAG, HITL, MCP) are provider-agnostic.

**What NOT to do:** fake user counts, invented testimonials, or implying a real client exists behind this. Unnecessary risk — easily discovered, and undermines trust if it is. The Loom + live deploy + clean code already do most of the work.

## 10. Implementation Priority

| # | Module | Notes |
|---|---|---|
| 1 | Fictional business & FAQ content | Done — Lumin Aesthetic Clinic, 5 FAQ docs |
| 2 | WhatsApp webhook (receive + send) | Foundation for everything else — Twilio Sandbox |
| 3 | RAG pipeline (ingestion + retrieval + generation) | Core value #2 |
| 4 | HITL approval admin screen | Core value #3 |
| 5 | MCP tool call (booking) | Core value #4 |
| 6 | Demo polish (branding, log, README, deploy) | Makes it look like a real product |
| 7 | Loom recording + case study | The actual proposal-ready deliverable |

Full phase breakdown with exit criteria: see `EXECUTION_PHASES.md`.

## 11. Open Questions / Future Scope

| # | Topic | Status |
|---|---|---|
| 1 | Google Calendar sync for bookings | Stretch goal — Supabase table is the MVP baseline |
| 2 | Sensitivity classification method (keyword vs. LLM-flagged) | To be decided during Phase 3 build — see `BACKEND_MASTER.md` §6 |
| 3 | Basic-auth password vs. full login for the public demo URL | Decided — basic-auth middleware in front of the whole app (Phase 5), Supabase Auth remains the real access control on `/admin` |

---

*Respondly · Product Master · v1.1 · Portfolio Project*
