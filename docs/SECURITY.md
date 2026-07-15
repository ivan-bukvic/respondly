# Respondly
## SECURITY — v1.1

> **OVAJ DOKUMENT JE JEDINI IZVOR ISTINE ZA:**
> - Javne vs zaštićene rute
> - Server-side only operacije
> - Zaštita webhook-a
> - Osetljivi podaci i environment varijable
> - Security checklist

---

## 1. JAVNE VS ZAŠTIĆENE RUTE

Respondly je jednostavniji sigurnosno od multi-tenant sistema — postoji samo jedan admin i jedna WhatsApp integracija — ali osnovna pravila i dalje važe.

| Route | Ko vidi | Auth potreban |
|-------|---------|----------------|
| `/login` | Svi (neulogovani) | Ne |
| `/admin` | Admin | Da |
| `/api/webhook/whatsapp` (POST) | Twilio (server-to-server) | Ne — ali signature-verified (§6) |
| `/api/mcp` | Claude API (server-to-server) | Interni — ne izlagati javno bez provere |
| `/api/responses/[id]/*` | Admin | Da |

> **Napomena o provajderu:** originalno planirano protiv Meta WhatsApp Cloud API sandbox-a, koji je zahtevao i GET handshake rutu (`hub.verify_token` provera). Prešli smo na Twilio WhatsApp Sandbox tokom Faze 0/1 (Meta developer account verifikacija je ostala trajno zaglavljena — platformski problem, ne specifičan za ovaj projekat). Twilio nema handshake korak — webhook se konfiguriše direktno u Twilio Console-u, pa GET ruta više nije potrebna. Vidi `BACKEND_MASTER.md` §8.

### Middleware pravila

Next.js middleware (`proxy.ts` u Next.js 16+) mora:
- Primijeniti basic-auth zavesu na ceo javni URL (env: `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`) — dodatna zaštita preko edge-a; Supabase Auth ostaje prava zaštita za `/admin`
- Redirectovati neulogovane korisnike sa `/admin` na `/login`
- Ne primenjivati auth check (niti basic-auth) na `/api/webhook/whatsapp` (Twilio ne šalje Supabase session ni Basic header) — umesto toga, signature verifikacija (§5) je jedina linija odbrane, pa mora biti striktna
- Ne primenjivati basic-auth na `/api/mcp` (server-to-server, štiti se `x-mcp-secret`)

---

## 2. SERVER-SIDE ONLY

> ⚠️ Sledeće operacije NIKAD ne smeju biti na klijentu (browser).

| Operacija | Razlog |
|-----------|--------|
| Supabase `service_role` key operacije | Zaobilazi RLS — koristi se u webhook i MCP rutama koje rade van ulogovane sesije |
| Twilio send-message poziv (Messages API) | Auth Token ne sme biti izložen klijentu |
| Claude API pozivi | API ključ ne sme biti na klijentu |
| Twilio webhook signature verifikacija | Auth Token (korišćen za verifikaciju `X-Twilio-Signature`) ne sme biti dostupan klijentu |
| Embedding API pozivi (ingestion i query) | API ključ server-side only |

---

## 3. RLS (ROW LEVEL SECURITY)

Respondly nema multi-tenancy, pa RLS politike nisu organizacione — ali i dalje treba da postoje kao osnovna zaštita, pošto `NEXT_PUBLIC_SUPABASE_ANON_KEY` je javan.

| Tabela | Ko može čitati (anon key) | Ko može pisati (anon key) |
|--------|----------------------------|------------------------------|
| `faq_documents`, `faq_chunks` | Niko direktno — čitanje ide isključivo kroz server-side RAG kod | Niko — samo ingestion skripta sa service_role |
| `conversations`, `messages` | Niko direktno sa klijenta | Niko — samo server (webhook, admin akcije) |
| `pending_responses` | Samo ulogovani admin (server-side query sa proverom sesije) | Samo server-side admin akcije |
| `appointments` | Samo ulogovani admin | Samo server (MCP tool call) |
| `interaction_log` | Samo ulogovani admin | Samo server |

**Pravilo:** anon key se praktično nigde ne koristi za direktan read/write iz browsera — sve prolazi kroz Next.js server komponente ili API rute koje koriste `service_role` sa eksplicitnom auth proverom. Ovo je jednostavnije od pravog RLS-po-organizaciji sistema jer nema tenant izolacije koju treba dokazati, ali princip "ništa osetljivo direktno sa klijenta" i dalje važi.

---

## 4. ENVIRONMENT VARIJABLE

### Pravila

- `NEXT_PUBLIC_` prefiks isključivo za zaista javne ključeve (Supabase URL i anon key)
- Svi tajni ključevi u `.env.local` (dev) i Vercel Environment Variables (prod), nikad u git repozitorijumu

### Varijable po tipu

| Varijabla | Tip | Gde se koristi |
|-----------|-----|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Client (praktično neiskorišćen za pisanje, vidi §3) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Server only |
| `ANTHROPIC_API_KEY` | **Secret** | Server only |
| `TWILIO_ACCOUNT_SID` | **Secret** | Server only |
| `TWILIO_AUTH_TOKEN` | **Secret** | Server only — koristi se i za autentikaciju outbound poziva i za verifikaciju inbound webhook potpisa (`X-Twilio-Signature`) |
| `TWILIO_WHATSAPP_NUMBER` | Server only | Sandbox WhatsApp broj (npr. `whatsapp:+14155238886`), koristi se kao `From` na outbound slanju — nije tajna vrednost sama po sebi, ali se ne izlaže klijentu jer nema razloga da bude javna |
| `EMBEDDING_MODEL_API_KEY` | **Secret** | Server only |
| `MCP_SHARED_SECRET` | **Secret** | Server only — `x-mcp-secret` header na `/api/mcp` |
| `BASIC_AUTH_USER` | **Secret** | Server only — basic-auth zavesa u `proxy.ts` (demo URL) |
| `BASIC_AUTH_PASSWORD` | **Secret** | Server only — basic-auth zavesa u `proxy.ts` (demo URL) |
| `APP_BASE_URL` | Server only | Opcioni eksplicitni origin za interne fetch-eve (lokalno/script); na Vercel-u ima prednost request `X-Forwarded-*` / `VERCEL_URL` |

---

## 5. WEBHOOK SIGURNOST

**Najkritičnija sigurnosna tačka u projektu** — ovo je jedina javno dostupna ruta koja prima podatke bez ulogovane sesije.

### Twilio (WhatsApp Sandbox)

- Validirati `X-Twilio-Signature` header na SVAKOM inbound pozivu pre bilo kakve obrade — Twilio potpisuje zahtev koristeći Auth Token, puni URL webhook-a, i POST parametre (Twilio Node SDK ima `twilio.validateRequest()` helper za ovo)
- Odbaciti zahtev (401) ako signature ne odgovara — ne obrađivati "samo da vidimo šta je"
- `TWILIO_AUTH_TOKEN` nikad ne izlagati klijentu ili logovati u plaintext-u
- Pošto Twilio šalje `application/x-www-form-urlencoded` payload (ne JSON), signature validacija mora da koristi tačno raw POST parametre, ne parsirani/transformisani body — pažljivo sa Next.js body parsing-om u API ruti
- Nema GET handshake rute — Twilio Sandbox webhook se konfiguriše direktno u Twilio Console-u ("When a message comes in" polje), bez verifikacionog izazova

### MCP endpoint

- `/api/mcp` poziva se od strane Claude orkestracije (interni HTTP round-trip iz `generate-draft`), ne od proizvoljnih klijenata
- Svaki zahtev mora imati header `x-mcp-secret` jednak `MCP_SHARED_SECRET` — odbaciti 401 ako nedostaje ili ne odgovara, da niko spolja ne piše u `appointments`

---

## 6. API SIGURNOST

- Session validacija na svakom `/admin` i `/api/responses/*` zahtevu (Supabase Auth)
- Input validacija (Zod) na svim API rutama, naročito na admin akcijama (approve/edit/reject) i webhook payload-u
- Nikad ne verovati klijentskom inputu za bilo šta što utiče na `pending_responses.status` — status transition logika mora biti server-side (vidi `BACKEND_MASTER.md` §9)

### Rate limiting

| Ruta | Limit |
|------|-------|
| `/login` | 5 pokušaja / minuta po IP |
| `/api/webhook/whatsapp` | Razuman throttle da se spreči spam/abuse tokom demo perioda |

---

## 7. SECURITY CHECKLIST

> Koristiti pre deploy-a na javni demo URL.

| # | Zadatak | Status |
|---|---------|--------|
| 1 | `/admin` zaštićen middleware-om (`proxy.ts`) | [x] |
| 2 | Twilio webhook signature verifikacija (`X-Twilio-Signature`) implementirana i testirana | [ ] |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` korišćen isključivo server-side | [ ] |
| 4 | `ANTHROPIC_API_KEY`, `TWILIO_AUTH_TOKEN` server-side only | [ ] |
| 5 | `NEXT_PUBLIC_` prefiks samo na zaista javnim ključevima | [ ] |
| 6 | Input validacija (Zod) na admin akcijama i webhook-u | [ ] |
| 7 | Status transition logika (`pending_responses`) je server-side, ne poverena klijentu | [ ] |
| 8 | `/api/mcp` nije otvoren za proizvoljne pozive bez provere | [ ] |
| 9 | Nema secret-a u git repozitorijumu (proveri `.env` u `.gitignore`) | [ ] |
| 10 | Ako je demo URL javan bez logina, basic-auth je postavljen na edge-u | [x] |
| 11 | Twilio Sandbox session je aktivna (demo telefon "joined") pre snimanja Loom-a | [ ] |

---

*Respondly SECURITY · v1.1 · Portfolio Project*
