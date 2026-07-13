# Respondly — Execution Phases Index

Detaljne specifikacije po fazi su u zasebnim dokumentima (format po uzoru na Gallebo/Flight Sharing Platform fazne dokumente), umesto u jednom sažetom fajlu. Svaka faza je samostalna — sadrži kontekst, tačne flow-ove/tabele/šeme i checklist, i ne zahteva skakanje po drugim master dokumentima za osnovne detalje.

| Faza | Dokument | Dokazuje |
|---|---|---|
| 0 | `faza_0_setup_tech_stack.md` | — (infrastruktura + Shared Foundations) |
| 1 | `faza_1_auth_whatsapp_webhook.md` | WhatsApp integracija |
| 2 | `faza_2_rag_pipeline.md` | RAG-grounded odgovor |
| 3 | `faza_3_hitl_approval.md` | Human-in-the-loop |
| 4 | `faza_4_mcp_booking.md` | MCP tool-calling |
| 5 | `faza_5_demo_polish.md` | — (verodostojnost demo-a) |
| 6 | `faza_6_loom_case_study.md` | — (deliverable za proposal-e) |

**Napomena o arhitekturi:** Faza 0 uspostavlja set deljenih modula (`Shared Foundations`) koje sve ostale faze koriste bez ponovne inicijalizacije — Supabase klijent, Claude klijent, embedding helper, WhatsApp send/verify, auth guard. Ovo je namerna zaštita od problema opisanog u `ARCHITECTURE_PRINCIPLES.md` (isti kod/pozivi duplirani kroz faze pisane izolovano jedna od druge). Pri pisanju ili reviziji bilo koje faze, prvo proveriti da li već postoji deljeni modul za tu potrebu pre nego što se piše nova implementacija.

**Napomena o WhatsApp provajderu:** Projekat je tokom Faze 0/1 prešao sa direktnog Meta WhatsApp Cloud API sandbox-a na Twilio WhatsApp Sandbox, zbog trajno zaglavljene Meta developer account verifikacije (platformski problem u tom periodu, ne specifičan za ovaj projekat — probano i sa drugim Facebook nalogom). Ovo utiče na `faza_1_auth_whatsapp_webhook.md` (nema GET handshake koraka), `BACKEND_MASTER.md` §8, i `SECURITY.md` §5. Svi ostali patterni (RAG, HITL, MCP) ostaju nepromenjeni — WhatsApp provajder je izolovan, zamenjiv detalj.

Ostali master dokumenti (`PRODUCT_MASTER.md`, `FRONTEND_MASTER.md`, `BACKEND_MASTER.md`, `PROJECT_MEMORY.md`, `SECURITY.md`) i dalje važe kao izvor istine za cross-cutting pravila (šta se ne gradi, naming convention, security checklist itd.) — fazni dokumenti implementiraju ta pravila, ne zamenjuju ih.

*Respondly · Execution Phases Index · v2.1 · Portfolio Project*
