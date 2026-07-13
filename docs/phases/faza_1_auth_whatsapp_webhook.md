**Respondly**

**Faza 1 — Auth i WhatsApp Webhook**

Login zaštita i prva od četiri core funkcionalnosti — WhatsApp integracija

> Koristi Shared Foundations iz Faze 0 (`/lib/supabase`, `/lib/auth`, `/lib/whatsapp/verify.ts`). Ne redefinisati Supabase klijent ili auth logiku lokalno u ovoj fazi.

> **Status:** Auth deo (login, `proxy.ts` middleware, admin placeholder) je implementiran i završen — review prošao, commitovan. WhatsApp Webhook deo je bio odložen dok se čekala Meta developer verifikacija; projekat je u međuvremenu prešao na Twilio WhatsApp Sandbox (vidi `PRODUCT_MASTER.md` §4 i `BACKEND_MASTER.md` §8 za kontekst odluke). Ovaj dokument je ažuriran da odražava Twilio integraciju.

# **Login i zaštita admin panela** ✅ Završeno

| **Element** | **Detalji** |
|---|---|
| Metoda | Supabase Auth, email/password |
| Korisnik | Jedan ručno seedovan admin nalog (Faza 0) — nema signup/invite flow |
| Zaštićena ruta | `/admin` |
| Middleware | `proxy.ts` (Next.js 16+ naziv za middleware) proverava sesiju preko `require-admin.ts`/`createMiddlewareClient`, redirect na `/login` ako nema validne sesije |

Login stranica sadrži:
- Email + password polja
- Brend klinike (naziv, mali logo) — deo verodostojnosti demo-a, vidi `FRONTEND_MASTER.md` §10
- Error state za pogrešne kredencijale

Admin placeholder stranica (`/admin`) sa Logout dugmetom takođe implementirana — pravi sadržaj (Pending Approvals + History Log) dolazi u Fazi 3.

---

# **WhatsApp Webhook — Twilio (preostaje da se implementira)**

## **Provider model — nema GET handshake**

Za razliku od originalnog Meta-based plana, Twilio WhatsApp Sandbox **nema verifikacioni handshake korak**. Webhook se konfiguriše jednom, direktno u Twilio Console-u:

1. Twilio Console → **Messaging → Try it out → Send a WhatsApp message → Sandbox Settings**
2. Polje **"When a message comes in"** → unosi se URL: `https://<tvoj-deploy-url>/api/webhook/whatsapp`
3. Sačuvaj — od tog trenutka, svaka inbound WhatsApp poruka na sandbox broj se POST-uje na taj URL

Nema `GET /api/webhook/whatsapp` rute za implementaciju — ovo je namerna razlika u odnosu na originalni plan, ne propust.

## **POST inbound poruka**

| **Korak** | **Detalji** |
|---|---|
| 1 | Twilio šalje POST sa porukom, `application/x-www-form-urlencoded` payload-om, i `X-Twilio-Signature` header-om |
| 2 | Poziva se `verifyTwilioSignature()` iz `/lib/whatsapp/verify.ts` (Faza 0) — **pre bilo kakve obrade**. Validacija koristi Auth Token + puni webhook URL + POST parametre (Twilio Node SDK: `twilio.validateRequest()`) |
| 3 | Ako signature ne odgovara → 401, ne obrađuje se dalje |
| 4 | Parsira se payload — ključna polja: `From` (format `whatsapp:+381...`), `Body`, `ProfileName`, `MessageSid`. `From` se normalizuje na čist E.164 broj (bez `whatsapp:` prefiksa) pre upisa/pretrage u `conversations.whatsapp_number` |
| 5 | `findOrCreateConversation(whatsapp_number)` — traži postojeći red u `conversations`, ili kreira novi (koristi `ProfileName` za `display_name` ako je dostupan) |
| 6 | Insert u `messages` (`direction = 'inbound'`) |
| 7 | Trigger RAG pipeline (Faza 2) — poziva se, ne implementira ovde |
| 8 | Vraća se prazan `200 OK` response (bez TwiML `<Message>` body-ja) — Respondly nikad ne auto-odgovara, svaki odgovor ide kroz HITL (Faza 3) |

**Napomena o odgovornosti ove faze:** ova ruta se zaustavlja na koraku 7/8 — samo prima i čuva poruku i prosleđuje je dalje. Generisanje odgovora je odgovornost Faze 2, ne ove rute. Ovo razdvajanje sprečava da webhook handler naraste u monolitnu funkciju koja radi sve.

## **Sandbox ograničenje (relevantno za demo, ne bug)**

Twilio Sandbox zahteva da svaki telefon koji učestvuje pošalje `join <sandbox-kod>` poruku pre nego što može da prima poruke, i ta sandbox sesija ističe posle 3 dana neaktivnosti. Pre Loom snimanja (Faza 6), potvrditi da je demo telefon i dalje "joined" — ako je isteklo, poslati `join` poruku ponovo. Ovo je dokumentovano ograničenje Twilio Sandbox-a, ne nešto oko čega treba graditi rešenje — vredi jedna rečenica u README "Known Limitations" sekciji (Faza 5).

# **Baza — tabele koje ova faza kreira**

## `conversations`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| whatsapp_number | text | Unique, E.164 format (bez `whatsapp:` prefiksa) |
| display_name | text | nullable, iz Twilio `ProfileName` polja ako je dostupno |
| created_at | timestamptz | |

## `messages`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| conversation_id | uuid | FK → conversations |
| direction | enum (`inbound`, `outbound`) | |
| body | text | |
| created_at | timestamptz | |

Pune definicije ostalih tabela (koje koriste kasnije faze) su u `BACKEND_MASTER.md` §3 — ova faza kreira samo ono što joj je potrebno.

# **Deploy checkpoint**

Na kraju ove faze, projekat mora biti deploy-ovan na Vercel (preview je dovoljan za sada — produkcioni URL dolazi u Fazi 5). Twilio webhook zahteva javno dostupan HTTPS URL da bi Console konfiguracija uopšte mogla da se testira — ovo nije opciono za testiranje, isto kao što je bilo i sa Meta planom, samo bez handshake koraka.

# **Faza 1 — Checklist**

| **#** | **Zadatak** | **Status** |
|---|---|---|
| 1 | Login stranica + Supabase Auth | [x] |
| 2 | Middleware zaštita `/admin` (`proxy.ts`, koristi `require-admin.ts`/`createMiddlewareClient` iz Faze 0) | [x] |
| 3 | Vercel preview deploy (potreban za webhook testiranje) | [ ] |
| 4 | Twilio Sandbox webhook URL konfigurisan u Console-u (zamena za GET handshake rutu) | [ ] |
| 5 | POST inbound ruta sa `X-Twilio-Signature` verifikacijom | [ ] |
| 6 | `conversations` i `messages` tabele kreirane | [ ] |
| 7 | Test poruka poslata na sandbox broj stiže i upisuje se u bazu | [ ] |
| 8 | Nevalidan signature test — potvrđeno da se odbacuje (401) | [ ] |

Respondly · Faza 1 · Auth i WhatsApp Webhook · Portfolio Project
