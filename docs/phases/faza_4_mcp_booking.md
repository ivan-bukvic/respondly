**Respondly**

**Faza 4 — MCP Tool Call (Booking)**

Zakazivanje termina kao MCP tool — četvrta core funkcionalnost

> Koristi Shared Foundations iz Faze 0 (`/lib/claude`, `/lib/supabase`). MCP endpoint je jedna API ruta unutar istog Next.js app-a — ne poseban servis (vidi `PROJECT_MEMORY.md` — Architecture Lock).

# **Zašto MCP umesto hardkodovanog if-a**

| **Kriterij** | **MCP tool call** | **Hardkodovana logika u promptu** |
|---|---|---|
| Šta se dokazuje u proposal-ima | Tool-calling pattern, tražen u više Great Fit poslova | Ništa specifično — svaki chatbot ima if-ove |
| Proširivost (van demo obima) | Novi tool = nova definicija, model odlučuje kad da ga zove | Svaki novi slučaj = novi if/else |
| Odgovara stvarnoj arhitekturi koju bi klijent dobio | Da | Ne |

Ovo je razlog zašto MCP postoji u projektu uopšte — vidi `PRODUCT_MASTER.md` §1 (capability gap koji projekat popunjava).

# **Tool definicija**

```json
{
  "name": "book_appointment",
  "description": "Book an appointment for a patient at the requested time.",
  "input_schema": {
    "type": "object",
    "properties": {
      "conversation_id": { "type": "string" },
      "requested_time": { "type": "string", "format": "date-time" },
      "treatment": { "type": "string" }
    },
    "required": ["conversation_id", "requested_time"]
  }
}
```

# **Flow**

| **Korak** | **Detalji** |
|---|---|
| 1 | Inbound poruka izražava booking nameru (npr. "želim da zakažem termin za petak") |
| 2 | Claude (unutar iste generacije draft odgovora iz Faze 2) prepoznaje nameru i poziva `book_appointment` preko MCP-a, umesto da generiše slobodan tekst |
| 3 | `/api/mcp` prima tool call, insert u `appointments` |
| 4 | Tool rezultat (potvrda + booking detalji) se vraća Claude-u |
| 5 | Claude uklapa potvrdu u `draft_text` |
| 6 | `draft_text` (uključujući booking potvrdu) ide u `pending_responses` — **isti HITL flow kao svaki drugi odgovor (Faza 3)** |

**Kritično:** booking se upisuje u `appointments` čim je tool pozvan (korak 3), ali pacijent ne dobija potvrdu dok admin ne odobri poruku (korak 6). Ovo znači da je moguće da termin postoji u bazi pre nego što je pacijent obavešten — prihvatljivo za demo obim, ali vredi napomenuti u README-u (Faza 5) kao poznato ograničenje, ne kao grešku.

# **Baza — tabela koju ova faza kreira**

## `appointments`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| conversation_id | uuid | FK → conversations |
| requested_time | timestamptz | |
| treatment | text | nullable, slobodan tekst iz tool poziva |
| status | enum (`booked`, `cancelled`) | |
| created_at | timestamptz | |

# **Gde MCP endpoint živi i ko ga sme zvati**

| **Pitanje** | **Odgovor** |
|---|---|
| Poseban servis? | Ne — `/api/mcp` unutar istog Next.js app-a (vidi Faza 0, "Zašto sve u jednom Next.js app-u") |
| Ko poziva ovaj endpoint? | Claude orkestracija (server-side, iz Faze 2 pipeline-a), ne proizvoljni klijenti |
| Da li treba dodatna autentikacija? | Ako je endpoint dostupan sa javnog interneta (a ne samo internim pozivom), dodati shared-secret header da se spreči da neko spolja piše u `appointments` — vidi `SECURITY.md` §5 |

# **Faza 4 — Checklist**

| **#** | **Zadatak** | **Status** |
|---|---|---|
| 1 | `appointments` tabela | [x] migration file; apply manually in Supabase SQL Editor |
| 2 | `book_appointment` tool definicija registrovana u `/lib/claude/client.ts` | [x] |
| 3 | `/api/mcp` endpoint | [x] |
| 4 | Claude prepoznaje booking nameru i poziva tool (ne hardkodovan if) | [x] |
| 5 | Tool rezultat se uklapa u draft odgovor | [x] |
| 6 | Booking potvrda i dalje prolazi kroz HITL flow (Faza 3), ne šalje se automatski | [x] |
| 7 | Shared-secret zaštita na `/api/mcp` ako je endpoint javno dostupan | [x] |
| 8 | Test: poruka "želim termin za [datum]" rezultuje redom u `appointments` | [ ] run `npm run smoke:booking` with `npm run dev` |
| 9 | Test: booking potvrda se pojavljuje u Pending Approvals, ne šalje se sama | [ ] manual WhatsApp / admin check |

Respondly · Faza 4 · MCP Tool Call (Booking) · Portfolio Project
