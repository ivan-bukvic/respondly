**Respondly**

Dokumentacija proizvoda — v1.0

WhatsApp AI Support Agent sa ljudskim odobrenjem u petlji

Portfolio / R&D projekat · Ne za produkciju

---

**1. Šta je Respondly**

Respondly je radeći demo WhatsApp asistenta za biznis zasnovan na terminima — u ovom slučaju fiktivnu estetsku kliniku, Lumin Aesthetic Clinic. Pacijent piše na WhatsApp, sistem generiše odgovor zasnovan na stvarnom FAQ sadržaju klinike, a ljudski administrator odobrava, menja ili odbija taj odgovor pre nego što ikad stigne do pacijenta. Ako poruka sadrži nameru zakazivanja termina, sistem to prepoznaje kao posebnu akciju (alat koji poziva) umesto da to hardkoduje kao poseban slučaj u kodu.

Ovo nije proizvod namenjen pravim klijentima. To je dokaz da četiri specifična obrasca — WhatsApp integracija, odgovori zasnovani na stvarnom sadržaju (RAG), ljudsko odobrenje pre slanja (HITL), i alati koje AI poziva po potrebi (MCP tool-calling) — rade zajedno, u jednom malom ali potpuno funkcionalnom sistemu.

**2. Korisnici**

Respondly ima samo dve strane, bez sistema uloga:

| **Strana** | **Ko je** | **Pristup** |
|---|---|---|
| Administrator | Vlasnik/osoblje fiktivne klinike | Jedan nalog, admin panel na `/admin` |
| Pacijent | Bilo ko ko piše na WhatsApp broj klinike | Nema pristup sistemu — komunicira isključivo preko WhatsApp-a |

Nema registracije, nema verifikacije, nema više rola. Ovo je namerno — vidi §8.

**3. Kako izgleda razgovor**

| **#** | **Korak** | **Šta se dešava** |
|---|---|---|
| 1 | Pacijent piše pitanje | Npr. "Koliko košta laser hair removal?" |
| 2 | Sistem pretražuje FAQ bazu | Pitanje se poredi sa sadržajem 5 FAQ dokumenata klinike (cene, tretmani, politika zakazivanja, nega, bezbednost) |
| 3 | AI piše draft odgovor | Odgovor je zasnovan isključivo na pronađenom sadržaju — ako pitanje nije pokriveno FAQ bazom, sistem to i kaže, ne izmišlja odgovor |
| 4 | Odgovor čeka administratora | Draft se pojavljuje u admin panelu, sa oznakom da li se tiče rutinske ili osetljive teme |
| 5 | Administrator odlučuje | Odobri kakav jeste, izmeni pa pošalje, ili odbije (ništa se ne šalje) |
| 6 | Pacijent dobija odgovor | Samo ako je administrator to odobrio — nikad automatski |

**4. Zašto svaki odgovor ide na odobrenje**

Ovo je centralna odluka celog projekta, ne samo tehnička sitnica. U pravim poslovima ovog tipa (podrška klinika, iznajmljivanje vozila, reaktivacija leadova preko WhatsApp-a), klijenti eksplicitno traže da nijedan AI odgovor ne stigne do njihovog korisnika bez ljudskog pregleda — bez obzira koliko "rutinsko" pitanje deluje. Respondly to dosledno primenjuje: nema praga ispod kojeg se odgovor šalje sam. Oznaka "rutinsko" ili "osetljivo" postoji samo da administrator brže skenira listu — nikad ne menja da li nešto ide na odobrenje.

**5. FAQ baza znanja**

Pet dokumenata čine celokupno znanje sistema:

| **Dokument** | **Pokriva** |
|---|---|
| Services & Treatments | Šta klinika nudi — injektabili, tretmani kože i tela |
| Pricing | Cenovnik po tretmanu, depoziti, popusti |
| Booking & Cancellation | Radno vreme, politika otkazivanja, kada se eskalira ljudskom osoblju |
| Pre- & Post-Treatment Care | Priprema i nega pre/posle svakog tipa tretmana |
| Safety & Contraindications | Kontraindikacije, rizici, kad pitanje mora kod licenciranog lekara |

Korpus je namerno mali — cilj nije enterprise baza znanja, nego dokaz da sistem tačno povlači pravi sadržaj za pravo pitanje, i da prepoznaje granicu sopstvenog znanja.

**6. Zakazivanje termina**

Kada poruka izražava nameru zakazivanja (npr. "želim termin za petak"), sistem to ne obrađuje kao specijalan if-slučaj u kodu — umesto toga, AI model sam odlučuje da pozove poseban "alat" (MCP tool) koji upisuje rezervaciju u bazu. Ovo je isti obrazac (Model Context Protocol) koji se sve više traži u AI automatizacijama, jer omogućava da se nove akcije dodaju kao novi alati, ne kao novi hardkodovani slučajevi. Potvrda termina i dalje prolazi kroz isto odobrenje kao svaki drugi odgovor — sistem ne šalje pacijentu potvrdu termina bez ljudskog pregleda.

**7. Admin panel**

Jedan ekran, dve sekcije:

- **Pending Approvals** — lista odgovora koji čekaju odluku, sa originalnom porukom pacijenta, draft odgovorom, i oznakom rutinsko/osetljivo
- **History Log** — hronološki pregled prethodnih odluka (odobreno / izmenjeno i poslato / odbijeno), da administrator (i svako ko gleda demo) vidi da sistem ima trag, ne samo trenutnu listu

Nema podešavanja, nema upravljanja korisnicima, nema analitike — samo ono što je potrebno da se HITL petlja jasno vidi i koristi.

**8. Šta je namerno izostavljeno**

Respondly nije umanjena verzija pravog proizvoda — to je fokusiran dokaz četiri obrasca, i sve što ne služi tom cilju je isključeno:

| **Nije uključeno** | **Zašto** |
|---|---|
| Više kanala (email, Instagram...) | WhatsApp je dovoljan da dokaže obrazac |
| Multi-tenant/više klijenata | Jedan fiktivni biznis je dovoljan |
| Sistem uloga i dozvola | Postoji samo jedan administrator |
| Plaćanja, podsetnici, nalozi pacijenata | Van opsega onoga što se dokazuje |
| Veliki FAQ korpus | Mali korpus dovoljno pokazuje da RAG radi tačno |

**9. Pozicioniranje**

Respondly nastaje direktno iz analize stvarnih Upwork poslova koji traže tačno ovu kombinaciju — WhatsApp podršku, ljudski pregled pre slanja, i AI koji poziva alate po potrebi — a koje dosadašnji portfolio nije pokrivao. Cilj nije zameniti pravi proizvod, nego dati konkretan, proverljiv primer (živ demo + snimak) koji potencijalni klijent može sam da isproba, umesto da veruje samo opisu u proposal-u.

---

*Respondly · Dokumentacija proizvoda · v1.0 · Portfolio Project*
