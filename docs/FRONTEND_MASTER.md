# RESPONDLY
## FRONTEND MASTER — v1.0

> **THIS DOCUMENT IS THE SINGLE SOURCE OF TRUTH FOR:**
> - Route structure
> - Page layout and UX rules
> - Component requirements per screen
> - Frontend stack and forbidden patterns
> - Frontend/backend contract

---

## 1. PRODUCT CONTEXT

Respondly's frontend is **one thing**: a single-admin panel for reviewing and acting on AI-generated WhatsApp draft responses. There is no patient-facing UI — patients only ever interact via WhatsApp itself.

### Core UX Goal

Make the HITL loop fast and legible: an admin should be able to see a pending draft, its RAG context, and take an action (Approve / Edit / Reject) in seconds — while also being able to glance at recent history to confirm the system is behaving correctly.

### What this is NOT

- Not a multi-page enterprise admin console
- Not a patient-facing chat UI (WhatsApp itself is the chat UI)
- Not a configurable, multi-tenant dashboard

---

## 2. FRONTEND PHILOSOPHY

```
Functionality first, then a clean and simple UI.
One page > many pages.
Legible > exhaustive.
Real placeholder data > lorem ipsum.
```

Since the deployed URL is part of the demo (see `PRODUCT_MASTER.md` §9), the UI needs to look intentional and branded — not like a scaffold — but does not need a polished design system beyond shadcn/Tailwind defaults.

---

## 3. OFFICIAL FRONTEND STACK

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Data fetching | Server components + Supabase server client; client-side `fetch` for actions |
| Forms | React Hook Form + Zod (only where needed — Edit action) |

### FORBIDDEN

Do not introduce, given the scope:
- Redux, Zustand, or any global state library — component state and server data are enough for a single-page admin panel
- TanStack Query — no client-side caching complexity needed for this data volume
- Complex routing / nested layouts
- Custom design system or component library beyond shadcn
- Realtime subscriptions (see §9)

---

## 4. PROJECT STRUCTURE (indicative)

```
src/
  app/
    login/
      page.tsx
    admin/
      page.tsx              → pending queue + history log
      loading.tsx
    api/
      webhook/whatsapp/route.ts   → inbound WhatsApp messages
      mcp/route.ts                 → MCP tool endpoint (book_appointment)
      responses/[id]/approve/route.ts
      responses/[id]/edit/route.ts
      responses/[id]/reject/route.ts
  components/
    admin/
      pending-list.tsx
      pending-card.tsx
      history-log.tsx
      response-editor.tsx
    ui/                       → shadcn primitives
  lib/
    supabase/
    claude/
    rag/
```

---

## 5. ROUTE STRUCTURE

### Public routes

| Route | Auth required |
|---|---|
| `/login` | No |

### Protected routes

| Route | Auth required |
|---|---|
| `/admin` | Yes (single admin user) |

### API routes (not pages)

| Route | Public/Protected | Notes |
|---|---|---|
| `/api/webhook/whatsapp` | Public, but Meta signature-verified | Inbound messages |
| `/api/mcp` | Server-to-server (Claude tool call) | Not user-facing |
| `/api/responses/[id]/approve` | Protected | Admin action |
| `/api/responses/[id]/edit` | Protected | Admin action |
| `/api/responses/[id]/reject` | Protected | Admin action |

### Route protection rule

Next.js middleware redirects any unauthenticated request to `/admin` back to `/login`. Given there is only one role, there is no role-based routing logic to build.

---

## 6. LOGIN PAGE

### Purpose

Gate the admin panel with Supabase Auth email/password for one seeded user (`proxy.ts` redirects unauthenticated `/admin` traffic to `/login`). Public demo URL has no basic-auth curtain — see `PRODUCT_MASTER.md` §11.

### Must contain

- Email + password fields
- Clinic branding (logo, name) — reinforces "real product" feel for the demo
- Error state for invalid credentials

---

## 7. ADMIN PAGE

**The only real screen in the product.**

### Layout

Single column (or two-column on desktop: pending queue left, history log right — collapses to stacked on mobile).

### Section 1 — Pending Approvals

- List of `pending_responses` where `status = 'pending'`, newest first
- Each card must show:
  - Patient WhatsApp number (or name if known)
  - Original inbound message
  - AI-generated draft response
  - Sensitivity tag badge (`routine` / `sensitive`) — visual only, does not change available actions
  - Timestamp
  - Three actions: **Approve** / **Edit** / **Reject**
- **Approve** → sends the draft as-is via WhatsApp, logs the action, removes from pending
- **Edit** → opens an inline textarea pre-filled with the draft; saving sends the edited text and logs `edited_and_sent`
- **Reject** → logs the rejection, does not send anything, removes from pending
- Empty state: "No pending responses" with a short explanation, not a blank area

### Section 2 — History Log

- Reverse-chronological list of past actions (`interaction_log`)
- Each row: timestamp, patient number, action taken (`Approved` / `Edited & sent` / `Rejected`), short preview of the message
- This section exists specifically so the admin panel doesn't look like an empty shell in the demo — see `PRODUCT_MASTER.md` §9

---

## 8. EMPTY & LOADING STATES

### OBAVEZNO (mandatory)

- `/admin` gets a `loading.tsx` skeleton — pending list and history log both show skeleton rows while data loads
- Empty pending queue and empty history log each get a real empty-state message, never a blank div
- Failed WhatsApp send (approve/edit action) surfaces a visible error, not a silent failure

---

## 9. REALTIME

**Not part of MVP**, consistent with the project's simplicity-first approach.

Allowed:
- Refresh on page load
- Manual refresh button on the admin page

Not allowed:
- Supabase Realtime subscriptions
- WebSocket/polling architecture

If a new WhatsApp message needs to show up as "pending" while the admin has the page open, a manual refresh button is sufficient for demo purposes.

---

## 10. DESIGN SYSTEM

### Visual direction

- Clean, modern, minimal — shadcn defaults with the clinic's branding (name, small logo/favicon, a simple accent color) layered on top
- No custom illustration or animation work — Framer Motion is not needed at this scope

### Branding source

Clinic name, logo, and content come from the FAQ documents and `PRODUCT_MASTER.md` §2 (Lumin Aesthetic Clinic). This is what makes the demo read as "a real product" rather than a scaffold — see `PRODUCT_MASTER.md` §9.

---

## 11. RESPONSIVE RULES

- Desktop-first is acceptable — this is an internal admin tool, not a consumer product — but the page must not break on a phone-sized viewport, since the Loom demo may show it on mobile
- Two-column pending/history layout collapses to a single stacked column below `md` breakpoint

---

## 12. FRONTEND / BACKEND CONTRACT

### Naming convention

`snake_case` everywhere, matching `BACKEND_MASTER.md`:

```
pending_response_id, whatsapp_number, draft_text,
sensitivity_tag, created_at, requested_time
```

### Admin page data requirements

- Pending list: `pending_responses` joined with `conversations` and the originating `messages` row
- History log: `interaction_log` joined with `pending_responses` for message preview

Full payload/query detail: see `BACKEND_MASTER.md` §10.

---

## 13. WHAT NOT TO BUILD

Do not build, regardless of how small the addition seems:

- User/role management UI (there is only one admin)
- Settings page
- Multi-conversation chat-style UI (the admin never chats — only approves/edits/rejects)
- Analytics or reporting views
- Notification bell / in-app notification system
- Anything resembling multi-tenant org switching

> If a feature idea sounds like it belongs in a "real SaaS product," it does not belong in Respondly. This is a demo of four specific patterns, not a product.

---

## 14. FINAL FRONTEND PHILOSOPHY

Frontend must be:
- fast to build (this is one page, not a platform)
- legible enough that a Loom viewer immediately understands the HITL loop from the UI alone
- polished enough to not look like a scaffold, without spending time on polish beyond that

### Final Reminder

Biggest frontend risks for this project:
- Scope creep toward "an actual admin platform"
- Spending build time on a settings/config screen nobody will ever see in the demo
- Losing focus on the one thing this screen needs to prove: **a human is in the loop before anything reaches the patient**

---

*Respondly FRONTEND MASTER · v1.0 · Portfolio Project*
