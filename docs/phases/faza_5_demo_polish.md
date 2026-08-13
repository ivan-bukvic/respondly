**Respondly**

**Faza 5 — Demo Polish**

Da demo deluje kao pravi, live proizvod — ne kao mockup

> Ova faza ne dodaje novu funkcionalnost iz `PRODUCT_MASTER.md` §6 — sve četiri core stvari su već dokazane (Faze 1-4). Ovde se proverava da li se to vidi jasno i uverljivo.

# **Brendiranje**

| **Element** | **Izvor** | **Gde se primenjuje** |
|---|---|---|
| Ime klinike | Lumin Aesthetic Clinic (`PRODUCT_MASTER.md` §2) | Login stranica, admin header, WhatsApp poruke |
| Logo / favicon | Jednostavan, generisan ili placeholder u skladu sa imenom | Login, admin header, browser tab |
| Accent boja | Jedna boja, shadcn theme override | Dugmad, badge-ovi, aktivni elementi |

Cilj nije originalan dizajn sistem — cilj je da ništa ne izgleda kao neizmenjen scaffold. Vidi `FRONTEND_MASTER.md` §10.

# **Realistični podaci pre snimanja**

| **Provera** | **Detalji** |
|---|---|
| History log nije prazan | Poslati 3-5 test poruka kroz ceo flow (uključujući bar jednu `sensitive` i jednu booking poruku) pre snimanja Loom-a, tako da history log ima realistične redove — vidi `PRODUCT_MASTER.md` §9 |
| FAQ sadržaj je stvaran | Već obezbeđeno u Fazi 0/2 — samo potvrditi da nijedan placeholder tekst ("lorem ipsum", "test test") nije ostao |
| WhatsApp broj je pravi sandbox broj | Twilio Sandbox broj, ne mock chat UI — vidi `PRODUCT_MASTER.md` §9 |
| Twilio Sandbox sesija je aktivna | Sandbox sesija ističe posle 3 dana neaktivnosti — poslati `join <kod>` ponovo sa demo telefona ako je isteklo, PRE snimanja |

# **Deploy**

| **Korak** | **Detalji** |
|---|---|
| 1 | Produkcioni Vercel deploy (razlika od Faze 1 preview-a: stabilan, javni URL) |
| 2 | ~~Basic-auth middleware~~ — uklonjen; javni demo URL je namerno otvoren (revidirana odluka iz `PRODUCT_MASTER.md` §11). Supabase Auth ostaje prava zaštita za `/admin` |
| 3 | Environment varijable potvrđene u Vercel production environment-u (ne samo lokalno) — uključujući `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` |
| 4 | Twilio Sandbox webhook URL ažuriran da pokazuje na produkcioni URL (Console → Sandbox Settings → "When a message comes in") |

# **README**

Mora sadržati, u ovom redosledu:

| **Sekcija** | **Sadržaj** |
|---|---|
| Šta je ovo | 2-3 rečenice — portfolio demo, ne pravi proizvod (vidi `PRODUCT_MASTER.md` §9 — transparentnost) |
| Arhitektura | Dijagram ili kratak opis flow-a: WhatsApp (Twilio) → RAG → HITL → (opciono) MCP booking |
| Kako pokrenuti lokalno | Env varijable, `npm install`, ingestion skripta, dev server |
| Poznata ograničenja | Npr. booking upisan u bazu pre HITL potvrde (Faza 4), realtime nije implementiran (ručni refresh), Twilio Sandbox zahteva "join" pre svake demo sesije i ističe posle 3 dana neaktivnosti |
| WhatsApp provajder — napomena o odluci | Kratko objašnjenje da je projekat prešao sa Meta Cloud API na Twilio WhatsApp Sandbox tokom razvoja zbog Meta developer verifikacionog problema (platformski, ne projektni) — vidi `PRODUCT_MASTER.md` §4. Naglasiti da su patterni (RAG, HITL, MCP) provider-agnostic; provajder je zamenjiv implementacioni detalj |
| Šta bi se promenilo za pravog klijenta | Multi-tenant šema, pravi WhatsApp Business nalog (Meta ili Twilio produkcioni sender, zavisno od klijentovih preferenci), veći FAQ korpus, možda Google Calendar sync |

# **Security checklist (pre javnog deploy-a)**

Prolazi se kompletan checklist iz `SECURITY.md` §7 pre nego što se URL deli javno — naročito stavke 2 (Twilio webhook signature), 4 (server-side ključevi), 9 (nema secret-a u git-u), i 11 (Twilio Sandbox sesija aktivna).

# **Faza 5 — Checklist**

| **#** | **Zadatak** | **Status** |
|---|---|---|
| 1 | Brendiranje (ime, logo, accent boja) primenjeno svuda | [x] |
| 2 | 3-5 test poruka poslato kroz ceo flow pre snimanja | [ ] |
| 3 | History log sadrži realistične redove (approve, edit, reject, booking) | [ ] |
| 4 | Produkcioni Vercel deploy | [ ] |
| 5 | ~~Basic-auth middleware na javnom URL-u~~ — uklonjen (javni URL namerno otvoren) | N/A |
| 6 | Twilio Sandbox webhook URL ažuriran na produkcioni | [ ] |
| 7 | README napisan (svih 6 sekcija, uključujući WhatsApp provajder napomenu) | [x] |
| 8 | `SECURITY.md` checklist kompletno prošao | [ ] |
| 9 | Twilio Sandbox sesija potvrđena aktivna neposredno pre Loom snimanja | [ ] |

Respondly · Faza 5 · Demo Polish · Portfolio Project
