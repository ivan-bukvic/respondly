# Respondly
## PROJECT MEMORY — v1.0

> **OVAJ DOKUMENT JE JEDINI IZVOR ISTINE ZA:**
> - Kritične podsetnike
> - Arhitektonske odluke koje su zaključane
> - Anti-patterns i zabranjene putanje

---

## ⚠️ Kritični podsetnik

**Ovo je portfolio demo projekat, ne pravi proizvod.** Cilj nije da klijenti stvarno koriste Respondly — cilj je da dokaže da autor zna da napravi WhatsApp + RAG + HITL + MCP obrazac. Svaka odluka se donosi kroz tu prizmu: da li ovo čini demo ubedljivijim i brzim za izgradnju, ili dodaje kompleksnost koju niko neće videti.

**HITL nije opciono ni za "rutinska" pitanja.** Svaki AI-generisani odgovor mora proći kroz admin odobrenje pre slanja — nema auto-send putanje, čak ni za pitanja tagovana kao "routine". Ovo je jedino pravilo u projektu koje se nikad ne sme prekršiti, jer je to tačno ono što projekat treba da dokaže.

---

## Architecture Lock — Struktura proizvoda

Respondly je **jedan Next.js app** koji radi sve:
- frontend (admin panel)
- backend (API routes: webhook, MCP endpoint, admin akcije)
- RAG orkestracija

Nema posebnog backend servisa, nema FastAPI parsera, nema mikroservisa. Sve živi u istom deploy-u na Vercel-u.

---

## Architecture Lock — Single-tenant, single-admin

Respondly NIJE multi-tenant.

- Nema `organization_id` nigde u šemi
- Nema role sistema — postoji samo jedan admin
- Nema signup/invite flow-a — admin nalog je ručno seedovan

> Ako se nađeš da pišeš RLS politiku po organizaciji ili role-check logiku za više tipova korisnika — stani. To ne pripada ovom projektu.

---

## Architecture Lock — Vector store

**Supabase pgvector, ne poseban vector store.**

Ne uvoditi Pinecone, Weaviate, ili bilo koji dodatni servis za embeddings. Isti Postgres koji drži sve ostale tabele drži i `faq_chunks` sa `vector` kolonom.

---

## Architecture Lock — MCP server

**MCP endpoint živi unutar Next.js app-a** (`/api/mcp`), ne kao poseban servis.

Razlog: jedan booking tool call ne opravdava drugi deployable. "Jedan backend" princip važi i ovde.

---

## Lock — Sensitivity tagging

`sensitivity_tag` (`routine` / `sensitive`) je **samo UI oznaka**. Ne sme nikad da utiče na to da li odgovor ide na odobrenje — svaki odgovor ide na odobrenje, bez izuzetka. Detalji predloženog pristupa (source-based tagging) su u `BACKEND_MASTER.md` §7.

---

## Lock — Booking storage

MVP piše rezervacije u Supabase `appointments` tabelu. Google Calendar sync je **stretch goal**, nije blocker za "gotovo".

---

## Lock — Realtime

**Realtime NIJE deo ovog projekta.**

Dozvoljeno: refresh na page load, manual refresh dugme.
Nije dozvoljeno: Supabase Realtime subscriptions, WebSocket arhitektura, polling.

Razlog: ovo je demo za par minuta gledanja, ne alat koji neko drži otvoren ceo dan.

---

## Lock — Šta se NE gradi

Ne uvoditi:
- Multi-tenancy ili role sistem
- Auto-send logiku bilo koje vrste
- Queue/job sistem
- Analytics ili reporting dashboard
- Multi-page admin konzolu
- Payment, reminders, ili patient account sistem
- Enterprise RAG (reranking, hybrid search) za korpus od 5 dokumenata

> Pravilo: ako feature deluje kao infrastruktura za skalu koju ovaj projekat nikad neće videti — ne pripada ovde.

---

## Lock — Naming Convention

`snake_case` svuda, i u bazi i u API payload-ima:

**Ispravno:** `pending_response_id`, `whatsapp_number`, `draft_text`, `sensitivity_tag`

**Pogrešno:** `pendingResponseId`, `whatsappNumber`, `draftText`

---

## Lock — Zabranjene biblioteke / patterns

**Frontend — NE koristiti:**
- Redux, Zustand, TanStack Query (component state + server components su dovoljni)
- Bootstrap, Material UI, Chakra UI, Styled Components
- Framer Motion (nema potrebe za animacijama na ovom obimu)

**Backend — NE koristiti:**
- Prisma, NestJS, Express backend
- Redis
- Posebni mikroservisi (uključujući poseban MCP servis)
- Separate vector database

---

## MVP Philosophy

```
Simple > clever
Working demo > scalable product
Realan WhatsApp broj > mock chat UI
Loom + live deploy > interaktivan demo
Svaki send je ljudska odluka > auto-send bilo gde
```

---

## Demo Integrity Rule

Sve što se pokazuje u Loom-u i proposal-u mora biti iskreno:
- Pravi WhatsApp broj, pravi live deploy, realan (ne lažan) FAQ sadržaj — ovo NIJE laganje, ovo je legitiman demo setup
- **Nikad**: lažni broj korisnika, izmišljeni testimonijali, ili implikacija da postoji pravi klijent
- Proposal-i moraju biti transparentni da je ovo demo/R&D projekat, ne pravi klijentski rad

---

## Final Reminder

Najveći rizici projekta:
- Scope creep ka "pravom SaaS proizvodu" (role sistem, multi-tenancy, settings stranica)
- Overengineering RAG pipeline-a za mali korpus
- Auto-send "samo za rutinska pitanja" — direktno protivreči poenti projekta
- Gubljenje fokusa sa 4 core stvari koje projekat treba da dokaže: WhatsApp, RAG, HITL, MCP

---

*Respondly PROJECT MEMORY · v1.0 · Portfolio Project*
