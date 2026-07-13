**Respondly**

**Faza 3 — HITL Approval Ekran**

Admin panel za odobrenje — treća core funkcionalnost, srce demo-a

> Koristi Shared Foundations iz Faze 0 (`/lib/supabase`, `/lib/whatsapp/send.ts`, `/lib/auth/require-admin.ts`). Outbound slanje poruka ide isključivo kroz `send.ts` — ne pisati novi poziv ka Meta API-ju ovde.

# **Pravilo koje se nikad ne krši**

**Nema puta od primljene poruke do poslate poruke koji ne prolazi kroz eksplicitnu admin akciju.** Ovo je jedino pravilo u projektu koje se ne sme prekršiti ni u jednom edge case-u — ono je tačno ono što ovaj deo projekta treba da dokaže. Vidi `PROJECT_MEMORY.md` i `BACKEND_MASTER.md` §9.

# **Status state machine**

| **Prelaz** | **Trigger** | **Rezultat** |
|---|---|---|
| `pending → approved` | Admin klikne Approve | `draft_text` se šalje na WhatsApp kakav jeste |
| `pending → edited_and_sent` | Admin izmeni tekst i sačuva | `final_text` se šalje na WhatsApp |
| `pending → rejected` | Admin klikne Reject | Ništa se ne šalje |

Svaki prelaz:
1. Server-side validovan (Zod) — status mora biti tačno `pending` pre prelaza, inače `INVALID_STATE_TRANSITION` (vidi `BACKEND_MASTER.md` §11)
2. Upisuje jedan red u `interaction_log`
3. Update-uje `pending_responses.status` i `resolved_at`

# **Admin stranica — Pending Approvals**

| **Element kartice** | **Izvor podataka** |
|---|---|
| WhatsApp broj / ime pacijenta | `conversations.whatsapp_number` / `display_name` |
| Originalna poruka | `messages.body` (preko `inbound_message_id`) |
| AI draft odgovor | `pending_responses.draft_text` |
| Sensitivity badge | `pending_responses.sensitivity_tag` — vizuelno, ne menja dostupne akcije |
| Vreme | `pending_responses.created_at` |
| Akcije | Approve / Edit / Reject dugmad |

## **Approve flow**

```
1. POST /api/responses/[id]/approve
2. require-admin.ts proverava sesiju
3. Proveri da je status = 'pending', inače 409
4. sendWhatsAppMessage(conversation.whatsapp_number, draft_text) — /lib/whatsapp/send.ts
5. Insert messages (direction = 'outbound')
6. Update pending_responses.status = 'approved', resolved_at = now()
7. Insert interaction_log (action = 'approved')
```

## **Edit flow**

```
1. Admin otvara inline textarea, prefilled sa draft_text
2. POST /api/responses/[id]/edit sa { final_text }
3. Ista provera statusa i sesije kao Approve
4. sendWhatsAppMessage(conversation.whatsapp_number, final_text)
5. Update pending_responses: final_text, status = 'edited_and_sent', resolved_at
6. Insert interaction_log (action = 'edited_and_sent')
```

## **Reject flow**

```
1. POST /api/responses/[id]/reject
2. Ista provera statusa i sesije
3. NE poziva se sendWhatsAppMessage — ovo je namerno, ništa se ne šalje pacijentu
4. Update pending_responses.status = 'rejected', resolved_at
5. Insert interaction_log (action = 'rejected')
```

# **Admin stranica — History Log**

| **Element reda** | **Izvor podataka** |
|---|---|
| Vreme akcije | `interaction_log.created_at` |
| WhatsApp broj | preko `pending_response_id → conversation` |
| Akcija | `interaction_log.action` (Approved / Edited & sent / Rejected) |
| Preview poruke | `pending_responses.draft_text` (skraćeno) |

Postoji specifično zato da admin panel ne izgleda kao prazna ljuska u demo snimku — vidi `PRODUCT_MASTER.md` §9.

# **Baza — tabele koje ova faza dovršava**

## `pending_responses` (puna verzija)

Dodaje se na ono što je Faza 2 kreirala:

| Field | Type | Notes |
|---|---|---|
| final_text | text | nullable — popunjava se samo kod Edit akcije |
| resolved_at | timestamptz | nullable |

## `interaction_log`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| pending_response_id | uuid | FK |
| action | enum (`approved`, `edited_and_sent`, `rejected`) | |
| actor | text | Admin identifikator — future-proofing, trenutno uvek isti nalog |
| created_at | timestamptz | |

# **Empty i loading states**

| **Situacija** | **Prikaz** |
|---|---|
| Nema pending odgovora | "No pending responses" poruka, ne prazan div |
| Nema istorije | "No activity yet" poruka |
| Stranica se učitava | Skeleton redovi (`loading.tsx`) i za pending i za history sekciju |
| WhatsApp send neuspešan (Approve/Edit) | Vidljiva error poruka adminu, akcija se NE označava kao uspešna — status ostaje `pending` |

# **Faza 3 — Checklist**

| **#** | **Zadatak** | **Status** |
|---|---|---|
| 1 | `/admin` stranica — Pending Approvals sekcija | [ ] |
| 2 | Approve akcija (ruta + UI) | [ ] |
| 3 | Edit akcija (inline textarea + ruta) | [ ] |
| 4 | Reject akcija (ruta + UI) | [ ] |
| 5 | Server-side status transition validacija (Zod) | [ ] |
| 6 | `interaction_log` insert na svaku akciju | [ ] |
| 7 | History Log sekcija | [ ] |
| 8 | Loading i empty states (oba dela stranice) | [ ] |
| 9 | Test: Approve stvarno šalje poruku na WhatsApp | [ ] |
| 10 | Test: Reject ne šalje ništa, samo loguje | [ ] |
| 11 | Test: pokušaj dvostrukog approve-a istog reda vraća 409 | [ ] |

Respondly · Faza 3 · HITL Approval Ekran · Portfolio Project
