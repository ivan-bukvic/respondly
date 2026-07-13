**Respondly**

**Faza 2 — RAG Pipeline**

Ingestion, retrieval i generisanje draft odgovora — druga od četiri core funkcionalnosti

> Koristi Shared Foundations iz Faze 0 (`/lib/supabase`, `/lib/claude`, `/lib/rag/embed.ts`). Embedding funkcija se poziva na identičan način i pri ingestion-u i pri query-ju — **ne pisati dve različite implementacije.**

# **Ingestion — jednokratni proces**

Pokreće se ručno (skripta), ne kao deo request path-a. Ponovo se pokreće samo kad se FAQ sadržaj promeni.

| **Korak** | **Detalji** |
|---|---|
| 1 | Učitaj svih 5 `.md` fajlova iz `/faq` |
| 2 | Split svakog fajla po `##` (H2) heading-ovima |
| 3 | Za svaku sekciju: `{ faq_document_id, heading, content }` |
| 4 | `embed(content)` — poziva se `/lib/rag/embed.ts` iz Faze 0 |
| 5 | Insert u `faq_chunks` sa embedding vektorom |

## **Zašto H2-split umesto rekurzivnog/preklapajućeg chunking-a?**

| **Kriterij** | **H2-split (izabrano)** | **Rekurzivni/overlapping chunking** |
|---|---|---|
| Veličina korpusa | 5 dokumenata, ~5-8 sekcija svaki | Isplativo tek za velike korpuse |
| Predvidivost | Svaki chunk = jedna jasna tema | Chunk granice manje intuitivne |
| Implementaciono vreme | Par linija koda | Zahteva biblioteku/tuning |
| Dovoljno za demo cilj? | Da — dokazuje pattern, ne treba enterprise preciznost | Overkill |

# **Query time — po svakoj inbound poruci**

| **Korak** | **Detalji** |
|---|---|
| 1 | `embed(inbound_message.body)` |
| 2 | Similarity search protiv `faq_chunks` (cosine distance, top-k, k=3–5) |
| 3 | Sastavi prompt: system instrukcije + retrieved chunks + inbound poruka |
| 4 | Pozovi Claude API preko `/lib/claude/client.ts` → `draft_text` |
| 5 | Insert u `pending_responses` (`status = 'pending'`) |
| 6 | Odredi `sensitivity_tag` (vidi ispod) |

## **Prompt pravilo (kritično za verodostojnost demo-a)**

System prompt mora eksplicitno instruirati Claude da odgovara **isključivo** iz retrieved chunk-ova, i da kaže da ne zna umesto da nagađa ako chunk-ovi ne pokrivaju pitanje. Bez ovog pravila, "RAG-grounded" postaje neistinita tvrdnja u proposal-ima — model bi mogao odgovarati iz opšteg znanja umesto iz FAQ baze, što se ne bi videlo dok neko ne postavi pitanje van opsega.

# **Sensitivity tagging**

**Ne utiče na to da li odgovor ide na odobrenje — svaki odgovor ide na odobrenje bez izuzetka** (vidi Fazu 3). Ovo je samo UI oznaka.

| **Uslov** | **Tag** |
|---|---|
| Retrieved chunk potiče iz `05-safety-and-contraindications.md` | `sensitive` |
| Retrieved chunk sadrži eksplicitnu escalation napomenu (npr. iz `03-booking-and-cancellation.md`) | `sensitive` |
| Sve ostalo | `routine` |

Ovo je source-based pristup, ne LLM klasifikator — dovoljno za demo, izbegava dodatnu kompleksnost bez stvarne koristi na ovom obimu.

# **Baza — tabele koje ova faza kreira**

## `faq_documents`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| title | text | |
| source_file | text | |
| created_at | timestamptz | |

## `faq_chunks`

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| faq_document_id | uuid | FK |
| heading | text | |
| content | text | |
| embedding | vector(1536) | Dimenzija zavisi od izabranog embedding modela — mora biti ista u ingestion i query kodu |
| created_at | timestamptz | |

## `pending_responses` (delimično — puna verzija u Fazi 3)

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| conversation_id | uuid | FK |
| inbound_message_id | uuid | FK → messages |
| draft_text | text | |
| retrieved_chunk_ids | uuid[] | Za dokazivanje da je RAG stvarno korišćen — vidi README u Fazi 5 |
| sensitivity_tag | enum (`routine`, `sensitive`) | |
| status | enum | Default `pending` — polje pripada Fazi 3, ovde se samo popunjava |
| created_at | timestamptz | |

# **Faza 2 — Checklist**

| **#** | **Zadatak** | **Status** |
|---|---|---|
| 1 | `faq_documents` i `faq_chunks` tabele | [ ] |
| 2 | Ingestion skripta (H2-split + embed + insert) | [ ] |
| 3 | Ingestion pokrenuta nad svih 5 FAQ dokumenata | [ ] |
| 4 | Query-time retrieval funkcija (top-k similarity search) | [ ] |
| 5 | System prompt sa "odgovaraj samo iz konteksta" pravilom | [ ] |
| 6 | Claude poziv generiše `draft_text` | [ ] |
| 7 | `pending_responses` insert na svaku inbound poruku | [ ] |
| 8 | Sensitivity tagging (source-based) | [ ] |
| 9 | Test: pitanje unutar FAQ opsega → tačan grounded odgovor | [ ] |
| 10 | Test: pitanje van FAQ opsega → model kaže da ne zna, ne izmišlja | [ ] |

Respondly · Faza 2 · RAG Pipeline · Portfolio Project
