**Respondly**

**Faza 0 — Setup i Tech Stack**

Temeljna infrastruktura projekta

# **Tech Stack**

| **Sloj** | **Tehnologija** | **Status** | **Obrazloženje** |
|---|---|---|---|
| Frontend | Next.js 15 (App Router) | Setup | Jedan app za frontend I backend (API routes) — nema potrebe za posebnim serverom za webhook/MCP |
| Backend + DB | Supabase (PostgreSQL) | Setup | DB, Auth, Storage u jednom servisu — najmanji operativni overhead za solo demo projekat |
| Vector store | Supabase pgvector | Setup | Isti Postgres, nema dodatnog servisa. Vidi `BACKEND_MASTER.md` §2 |
| Auth | Supabase Auth | Setup | Email/password, jedan seedovan admin nalog — nema signup flow-a |
| LLM | Anthropic Claude API | Setup | Response generacija + MCP orkestracija |
| Tool-calling | MCP (unutar Next.js API rute) | Setup | Booking tool kao MCP tool, ne hardkodovana logika |
| Messaging | Twilio (WhatsApp Sandbox) | Setup | Sandbox broj, nije potreban pravi biznis nalog za demo. Vidi napomenu ispod. |
| Hosting | Vercel | Napomena | Koristiće se, setup u Fazi 5 (public deploy) |
| Naziv projekta | Respondly | Zaključeno | — |

## **Napomena o WhatsApp provajderu**

Projekat je originalno planiran protiv Meta WhatsApp Cloud API sandbox-a direktno. Tokom Faze 0/1, Meta developer account verifikacija je ostala trajno zaglavljena (poznat, raširen platformski problem u tom periodu — ne specifičan za ovaj nalog ili projekat; probano je i sa drugim Facebook nalogom, isti rezultat). Umesto dužeg čekanja, prešlo se na **Twilio WhatsApp Sandbox**:

- Nema business verifikacije potrebne za sandbox korišćenje
- Nema GET handshake koraka (Meta je zahtevala `hub.verify_token` proveru — Twilio nema ekvivalent, webhook se konfiguriše direktno u Console-u)
- I dalje ispunjava zahtev iz `PRODUCT_MASTER.md` §9 — realan WhatsApp broj, ne mock UI

Ovo je transparentna build odluka, dokumentovana i u README-u (Faza 5).

## **Zašto sve u jednom Next.js app-u (bez posebnog backend servisa)?**

| **Kriterij** | **Next.js (monolit)** | **Poseban backend servis** |
|---|---|---|
| Broj deployable-a za demo obima | 1 | 2+ |
| MCP endpoint | Jedna API ruta | Poseban servis + interna komunikacija |
| Vreme izgradnje (5-8 dana cilj) | Sve na jednom mestu | Dodatni setup i deploy overhead |
| Opravdanost za ovaj obim | Da — jedan flow, mali korpus | Ne — nema saobraćaja/skale koja to traži |

Ključni razlog: Respondly dokazuje 4 patterna (WhatsApp, RAG, HITL, MCP) na jednom fiksnom flow-u za jedan fiktivni biznis. Poseban servis bi dodao operativnu kompleksnost bez ijedne stvarne prednosti na ovom obimu — direktno kršenje `PROJECT_MEMORY.md` pravila "ako feature deluje kao infrastruktura za skalu koju ovaj projekat nikad neće videti, ne pripada ovde".

# **Shared Foundations — jedan izvor istine za sve faze**

> ⚠️ **Ovo je najvažniji deo ove faze.** Svaka sledeća faza (1-4) koristi ove deljene module. Nijedna faza ne sme ponovo inicijalizovati Supabase klijent, Claude klijent, embedding poziv, ili WhatsApp send funkciju — samo ih importuje odavde. Ovo direktno sprečava grešku opisanu u `ARCHITECTURE_PRINCIPLES.md` (dupliran fetching/inicijalizacija kroz faze pisane izolovano jedna od druge).

| Modul | Fajl | Šta radi | Ko ga koristi |
|---|---|---|---|
| Supabase server klijent | `/lib/supabase/server.ts` | `service_role` klijent za server-side operacije, `session` klijent za Server Components, i `middleware` klijent (request/response cookie pattern) za `proxy.ts` | Faze 1, 2, 3, 4 |
| Supabase browser klijent | `/lib/supabase/client.ts` | Za admin login/session na klijentu | Faza 1, 3 |
| Claude klijent | `/lib/claude/client.ts` | Jedan wrapper oko Anthropic SDK-a, uključujući MCP tool registraciju | Faze 2, 4 |
| Embedding helper | `/lib/rag/embed.ts` | Jedna funkcija `embed(text): number[]`, korišćena i pri ingestion-u i pri query-ju — **mora biti isti model na oba mesta** | Faza 2 (ingestion i query) |
| WhatsApp send helper | `/lib/whatsapp/send.ts` | Jedna funkcija za slanje poruke preko Twilio Messages API-ja | Faza 3 (approve/edit), Faza 4 (booking confirmation) |
| WhatsApp signature verifikacija | `/lib/whatsapp/verify.ts` | Jedna funkcija koja proverava `X-Twilio-Signature` | Faza 1 (webhook) |
| Auth guard | `/lib/auth/require-admin.ts` | Jedna funkcija koja proverava admin sesiju, koristi se u middleware-u i u svakoj `/api/responses/*` ruti | Faze 1, 3, 4 |

**Pravilo:** ako neka faza "treba Supabase klijent" ili "treba da pozove Claude" — poziva postojeći modul iz tabele iznad. Ako modul ne postoji, dodaje se ovde u Fazi 0/1, ne redefiniše lokalno unutar kasnije faze.

# **Setup koraci**

**1. Git i projekt struktura**

- GitHub repozitorijum kreiran (private)
- Branching: `main` + `feature/*` (nema potrebe za `develop` granom na ovom obimu — jedan developer, kratak rok)
- `.gitignore` postavljen
- `README.md` sa uputama za lokalni setup (dopunjuje se kroz svaku fazu, finalna verzija u Fazi 5)

**2. Next.js inicijalizacija**

- `npx create-next-app@latest` sa TypeScript, Tailwind, App Router
- Folder struktura i path alias (`@/lib`, `@/components`)
- shadcn/ui inicijalizacija
- ESLint i Prettier konfiguracija

**3. Supabase projekat**

- Kreirati novi Supabase projekat
- Uključiti `pgvector` extension
- Sačuvati Project URL i API ključeve
- Supabase Auth konfigurisan (email/password), jedan admin nalog ručno seedovan
- Supabase MCP server povezan u Cursor/Claude Code (za razvoj, razlikuje se od aplikacionog MCP-a iz Faze 4)

**4. Anthropic setup**

- Anthropic API ključ kreiran
- Test poziv iz `/lib/claude/client.ts` da se potvrdi da radi

**5. Twilio WhatsApp Sandbox**

- Twilio nalog kreiran
- WhatsApp Sandbox aktiviran (Console → Messaging → Try it out → Send a WhatsApp message)
- Demo telefon povezan sa sandboxom (`join <sandbox-code>` poruka poslata i potvrđena)
- Account SID i Auth Token sačuvani
- Napomena: sandbox sesija ističe posle 3 dana neaktivnosti — treba ponovo poslati `join` poruku ako prođe previše vremena bez aktivnosti

**6. Cursor / Claude Code setup**

- `.cursorrules` (ili ekvivalentna konvencija za Claude Code) kreiran sa projektnim konvencijama iz `PROJECT_MEMORY.md`

# **Environment varijable (referenca)**

| **Varijabla** | **Opis** | **Status** |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase projekat URL | Setup |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase javni ključ | Setup |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server ključ (samo server-side) | Setup |
| `ANTHROPIC_API_KEY` | Claude API ključ | Setup |
| `TWILIO_ACCOUNT_SID` | Twilio nalog identifikator | Setup |
| `TWILIO_AUTH_TOKEN` | Za autentikaciju outbound poziva i verifikaciju inbound webhook potpisa | Setup |
| `TWILIO_WHATSAPP_NUMBER` | Twilio Sandbox WhatsApp broj (npr. `whatsapp:+14155238886`) | Setup |
| `EMBEDDING_MODEL_API_KEY` | Ako se koristi odvojeni embedding provajder | Setup (Faza 2) |

# **Folder struktura**

| **Folder / File** | **Sadržaj** |
|---|---|
| `/app` | Next.js App Router stranice |
| `/app/login` | Login stranica |
| `/app/admin` | Zaštićena admin stranica (pending + history) |
| `/app/api/webhook/whatsapp` | Inbound WhatsApp webhook (Twilio POST, bez GET handshake) |
| `/app/api/mcp` | MCP tool endpoint (booking) |
| `/app/api/responses/[id]/*` | Approve/Edit/Reject akcije |
| `/components/admin` | Pending card, history log, response editor |
| `/components/ui` | shadcn primitivi |
| `/lib/supabase` | Deljeni Supabase klijenti — vidi Shared Foundations |
| `/lib/claude` | Deljeni Claude klijent |
| `/lib/rag` | Embedding helper + retrieval logika |
| `/lib/whatsapp` | Twilio send + verify helperi |
| `/lib/auth` | Admin auth guard |
| `/faq` | 5 FAQ izvornih dokumenata (već postoje) |
| `proxy.ts` | Next.js 16+ middleware (root nivo, zamena za `middleware.ts`) |
| `.cursorrules` | AI konvencije za projekat |
| `.env.local` | Lokalne environment varijable (nije u gitu) |

# **.gitignore**

| **Kategorija** | **Šta se ignoriše** | **Zašto** |
|---|---|---|
| Environment | `.env.local`, `.env*.local` | API ključevi i tajni podaci |
| Dependencies | `/node_modules` | Regeneriše se sa `npm install` |
| Next.js build | `/.next`, `/out` | Build artifakti |
| OS fajlovi | `.DS_Store`, `Thumbs.db` | Sistemski fajlovi |
| IDE | `.cursor`, `.vscode` | Lokalne postavke |
| Logs | `*.log` | Log fajlovi |

# **Cursor / Claude Code konvencije**

| **Pravilo** | **Detalji** |
|---|---|
| Tech stack | Next.js App Router, TypeScript strict, Tailwind, Supabase |
| Komponente | Server komponente po defaultu, `"use client"` samo kad treba |
| Deljeni moduli | Uvek koristiti postojeće module iz `/lib` (vidi Shared Foundations) — nikad lokalno redefinisati Supabase/Claude/embedding poziv unutar pojedinačne rute |
| Supabase | Uvek server klijent (`service_role`) za osetljive operacije — webhook i MCP rute rade van korisničke sesije |
| Naming | `snake_case` u bazi i payload-ima, `camelCase` samo u čisto internom TS kodu gde ne dodiruje payload |
| Error handling | Svaka async operacija ima try/catch, greške se loguju server-side i vraćaju kao `{ error: { code, message } }` (format iz `BACKEND_MASTER.md` §11) |
| Env varijable | `NEXT_PUBLIC_` prefiks isključivo za zaista javne vrednosti |
| Auto-send | Nikad — svaki send prolazi kroz HITL flow (Faza 3) |
| Webhook payload | Twilio šalje `application/x-www-form-urlencoded`, ne JSON — parsirati u skladu s tim, i koristiti raw body za signature validaciju |

# **Faza 0 — Checklist**

| **#** | **Zadatak** | **Status** |
|---|---|---|
| 1 | GitHub repozitorijum kreiran (private) | [x] |
| 2 | Next.js projekat inicijalizovan (TypeScript, Tailwind, App Router, shadcn/ui) | [x] |
| 3 | Folder struktura postavljena | [x] |
| 4 | ESLint i Prettier konfigurisani | [x] |
| 5 | `.gitignore` postavljen | [x] |
| 6 | Supabase projekat kreiran, `pgvector` extension uključen | [x] |
| 7 | Supabase Auth konfigurisan, admin nalog seedovan | [x] |
| 8 | Shared Foundations moduli kreirani (`/lib/supabase`, `/lib/claude`, `/lib/rag`, `/lib/whatsapp`, `/lib/auth`) | Delimično — Supabase, Claude, Auth gotovi; RAG/WhatsApp čekaju svoje faze |
| 9 | Anthropic API ključ testiran | Odloženo — testira se prirodno u Fazi 2 |
| 10 | Twilio nalog kreiran, WhatsApp Sandbox aktiviran, demo telefon povezan | [x] |
| 11 | `.cursorrules` kreiran | [x] |
| 12 | `.env.local` kreiran sa svim Setup varijablama | [x] |

Respondly · Faza 0 · Setup i Tech Stack · Portfolio Project
