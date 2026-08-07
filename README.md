# Respondly

Portfolio demo: WhatsApp clinic assistant with RAG, human-in-the-loop approval, and optional MCP booking — not a real client product.

Brand stand-in: **Lumin Aesthetic Clinic**. Every outbound reply must pass an explicit admin Approve / Edit / Reject action before it reaches the patient.

## Architecture

```text
Patient WhatsApp
      │
      ▼
Twilio WhatsApp Sandbox ──POST──► /api/webhook/whatsapp
                                      │
                                      ▼
                              RAG (pgvector FAQ)
                                      │
                                      ▼
                         Claude draft (+ optional MCP
                         book_appointment → /api/mcp)
                                      │
                                      ▼
                         pending_responses (status=pending)
                                      │
                                      ▼
                         Admin dashboard (/admin)
                         Approve / Edit / Reject
                                      │
                                      ▼
                         Twilio send ──► Patient WhatsApp
```

Inbound Twilio message → embed + retrieve FAQ chunks → Claude generates a draft (and may call `book_appointment` via an internal MCP HTTP round-trip) → draft lands in `pending_responses` → admin reviews → only after Approve/Edit is a message sent outbound.

## How to Run Locally

1. Copy env vars into `.env.local` (see list below).
2. `npm install`
3. Ingest FAQ corpus: `npm run ingest:faq`
4. Start the app: `npm run dev`
5. Open `http://localhost:3000` — browser will prompt for basic-auth, then you log into `/admin` with the Supabase admin user.

### Environment variables

| Variable                        | Notes                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Public                                                                                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public                                                                                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only                                                                                            |
| `ANTHROPIC_API_KEY`             | Server only                                                                                            |
| `EMBEDDING_MODEL_API_KEY`       | Server only                                                                                            |
| `TWILIO_ACCOUNT_SID`            | Server only                                                                                            |
| `TWILIO_AUTH_TOKEN`             | Server only (send + webhook signature)                                                                 |
| `TWILIO_WHATSAPP_NUMBER`        | e.g. `whatsapp:+14155238886`                                                                           |
| `MCP_SHARED_SECRET`             | Header `x-mcp-secret` for `/api/mcp`                                                                   |
| `BASIC_AUTH_USER`               | Demo URL curtain (proxy.ts)                                                                            |
| `BASIC_AUTH_PASSWORD`           | Demo URL curtain (proxy.ts)                                                                            |
| `CRON_SECRET`                   | Server only; Vercel Cron Bearer token for `/api/cron/keep-alive` (set in Vercel Environment Variables) |
| `APP_BASE_URL`                  | Optional; local/script origin override                                                                 |

`CRON_SECRET` powers a daily Vercel Cron (`0 6 * * *`) that runs a trivial read-only Supabase query so the free-plan project does not auto-pause after 7 days of inactivity.

For local Twilio testing, point the Sandbox webhook at your tunnel URL (e.g. ngrok) + `/api/webhook/whatsapp`.

## Known Limitations

- **Booking is written before HITL confirmation.** `book_appointment` inserts into `appointments` when Claude calls the tool during draft generation; the patient is notified only after admin Approve/Edit. The booking row can therefore exist even if the admin later Rejects the draft.
- **No realtime.** Admin UI does not subscribe to live updates — use the Refresh button.
- **Twilio Sandbox requires `join <code>`** from the demo phone before each demo session, and the sandbox session expires after ~3 days of inactivity.
- Single admin, no multi-tenancy, no auto-send — every outbound path goes through explicit HITL.

## WhatsApp Provider — Decision Note

The project originally targeted the Meta WhatsApp Cloud API sandbox. During setup, Meta developer-account verification stayed persistently stuck (a known platform issue at the time — not specific to this codebase), which blocked registration. Twilio WhatsApp Sandbox was adopted instead: no business verification for sandbox use, simpler webhook model (no GET handshake), and a real WhatsApp number rather than a mocked chat UI.

The demonstrated patterns — RAG, HITL approval, MCP tool-calling — are **provider-agnostic**. Twilio vs Meta is a swappable implementation detail; a real engagement can use whichever WhatsApp Business channel the client prefers.

## What Would Change for a Real Client

- Multi-tenant schema (`organization_id`, per-clinic FAQ corpora and auth)
- Production WhatsApp Business sender (Meta Cloud API or Twilio production), not Sandbox
- Larger, clinic-specific FAQ corpus and voice/tone calibration
- Optional Google Calendar (or PMS) sync for bookings beyond the `appointments` table
- Hardening for concurrency, idempotent outbound sends, and operational monitoring

---

Respondly · Portfolio demo · Lumin Aesthetic Clinic
