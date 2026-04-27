# SPEC-005 - Portal klienta: nowe zgloszenie spojne z backoffice

**Data**: 2026-04-25
**Status**: Ready
**Zaleznosci**:
- SPEC-002 - zalaczniki podczas tworzenia zgloszenia gwarancyjnego
- SPEC-004 - portal klienta: zgloszenia gwarancyjne

## TLDR

Portal klienta ma juz liste zgloszen, widok szczegolu, endpointy portalowe oraz strone create. Ta specyfikacja nie opisuje greenfield. Opisuje zmiane istniejacego flow tworzenia nowego zgloszenia tak, aby:

- UI bylo wizualnie i strukturalnie spojne z formularzem backoffice
- klient nie wybieral projektu ani podwykonawcy
- projekt ustawial sie automatycznie jako pierwszy projekt organizacji klienta o statusie `active`, sortowany `name asc`
- klient mogl dodac zalaczniki juz na formularzu create
- klient nie ustawial statusu, dat, osoby przypisanej ani zakresu/kategorii
- status ustawial sie automatycznie na `oczekuje`
- priorytet pozostawal jedynym polem operacyjnym wybieranym przez klienta
- w menu bocznym portalu byla dostepna pozycja pozwalajaca przejsc do create

Najwazniejsza roznica techniczna wzgledem stanu obecnego: obecny portalowy kontrakt `POST /api/warranty_claims/portal/claims` wymaga `projectId` i `categoryKey`. Po wdrozeniu create ma dzialac bez tych pol po stronie klienta. `categoryKey` staje sie opcjonalne w modelu — backoffice wypelnia je przy edycji zgloszenia, portal nie ustawia go wcale.

## Problem statement

Aktualny formularz `PortalClaimCreateForm` rozni sie od oczekiwanego procesu biznesowego:

- wymaga recznego wyboru projektu
- wymaga wyboru kategorii
- nie obsluguje zalacznikow
- nie korzysta z tego samego ukladu sekcji, jaki mamy w backoffice

To powoduje dwa problemy:

1. Portal klienta odchodzi od ustalonego modelu obslugi zgloszen.
2. Wymagania biznesowe dla klienta sa prostsze niz dla pracownika, ale aktualny formularz nadal eksponuje czesc pol wewnetrznych procesu.

## Zakres

### W zakresie

- przebudowa formularza create w portalu klienta
- dostosowanie portalowego kontraktu POST do nowych zasad
- automatyczny wybor projektu (pierwszy aktywny `status = 'active'`, `name asc`)
- rozluznienie modelu: `categoryKey` opcjonalne dla create portalowego
- wydzielenie wspolnych helperow zalacznikow z backoffice do `lib/attachments.ts`
- dodanie sekcji zalacznikow na create
- ukrycie pol wewnetrznych i operacyjnych niedostepnych dla klienta
- zachowanie lub doprecyzowanie pozycji menu portalu prowadzacej do create
- testy kontraktu i glownego flow create

### Poza zakresem

- zmiany listy zgloszen i widoku szczegolu poza niezbednymi polami prezentowanymi po utworzeniu
- edycja zgloszenia przez klienta
- komentarze, komunikacja, SLA, workflow wieloetapowy
- zmiana modelu uprawnien portalu
- zmiana procesu backoffice create/edit

## Stan obecny

Istniejace elementy w repo:

- `src/modules/warranty_claims/components/portal/PortalClaimCreateForm.tsx`
- `src/modules/warranty_claims/api/portal/claims/route.ts`
- `src/modules/warranty_claims/api/portal/lookups/route.ts`
- `src/modules/warranty_claims/widgets/injection/portal-sidebar-menu/widget.ts`

Obecne zachowanie:

- klient wybiera `projectId`
- klient wybiera `categoryKey`
- klient ustawia `title`, `issueDescription`, `locationText`, `priorityKey`
- status jest ustawiany automatycznie
- zalaczniki nie sa obslugiwane
- w menu portalu istnieje juz pozycja `Nowe zgloszenie`

## Wymagania docelowe

### UX create

Formularz create w portalu ma korzystac z tego samego jezyka UI co backoffice:

- sekcje typu card
- ta sama hierarchia informacji
- te same tony przyciskow i segmentow priorytetu
- podobny uklad: dane podstawowe, opis, zalaczniki

Nie oznacza to kopiowania 1:1 wszystkich pol z backoffice. Oznacza zachowanie tego samego wzorca wizualnego i struktury przy prostszym payloadzie klienta.

### Pola dostepne dla klienta

Klient widzi i edytuje tylko:

- `title` - wymagane
- `issueDescription` - wymagane
- `locationText` - **wymagane**
- `priorityKey` - wybierane przez klienta
- `attachments` - mozliwe do dodania na create

Klient nie widzi i nie ustawia:

- `projectId`
- `subcontractorId`
- `assignedUserId`
- `reportedAt`
- `resolvedAt`
- `statusKey`
- `basNumber`
- `categoryKey` / `zakres`

### Reguly biznesowe create

- `projectId` ustawia sie automatycznie: pierwszy projekt organizacji klienta gdzie `status = 'active'`, sortowanie `name asc`
- `statusKey` ustawia sie automatycznie na `oczekuje`
- `priorityKey` domyslnie pozostaje zgodny z `WARRANTY_DEFAULT_CREATE_PRIORITY_KEY`, ale klient moze go zmienic
- `assignedUserId` jest `null`
- `resolvedAt` jest `null`
- `reportedAt` jest nadawane automatycznie przy zapisie
- `subcontractorId` jest `null`
- `basNumber` pozostaje puste
- `categoryKey` nie jest ustawiane przez klienta — pole pozostaje `null` / puste w momencie create; backoffice wypelnia je przy pozniejszej edycji zgloszenia

## Decyzja dla pola "zakres" (categoryKey)

Przyjeta decyzja: **Opcja B — rozluznienie kontraktu danych**.

`categoryKey` przestaje byc wymagane dla create portalowego. Model i backend akceptuja puste/null dla tego pola przy tworzeniu z portalu. Backoffice zachowuje `categoryKey` jako wymagane przy edycji — pracownik musi je uzupelnic, zanim zgloszenie przejdzie dalej w procesie.

Konsekwencje:

- `portalClaimCreateSchema` nie zawiera `categoryKey`
- `preparePortalClaimInput` nie waliduje `categoryKey` — ustawia `null`
- encja `WarrantyClaim.categoryKey` musi akceptowac `null` (sprawdzic typ kolumny)
- walidacja backoffice (`warrantyClaimCreateSchema` / `warrantyClaimUpdateSchema`) pozostaje bez zmian — wymaga `categoryKey`
- widok szczegolu portalu (`PortalClaimDetail`) nie pokazuje pola kategorii
- lista zgloszen portalu nie filtruje po kategorii

Ryzyko: listy, filtry i raporty backoffice moga zakladac niepustosc `categoryKey`. Przed wdrozeniem nalezy sprawdzic wszelkie zapytania filtrujace lub grupujace po tym polu.

## API

### `POST /api/warranty_claims/portal/claims`

Obecny payload:

```ts
{
  title: string
  issueDescription: string
  locationText?: string
  priorityKey?: string
  categoryKey: string
  projectId: string
}
```

Docelowy payload klienta:

```ts
{
  title: string
  issueDescription: string
  locationText: string   // wymagane
  priorityKey?: string
}
```

Response po sukcesie:

```ts
{
  id: string   // UUID nowego zgloszenia — uzywany do redirectu na szczegol
}
```

Backend ma:

1. pobrac scope klienta
2. znalezc pierwszy projekt organizacji klienta gdzie `status = 'active'`, posortowany `name asc`
3. ustawic `projectId` automatycznie
4. ustawic `statusKey = WARRANTY_STATUS_KEYS.pending`
5. ustawic `reportedAt = now`
6. ustawic `assignedUserId = null`
7. ustawic `resolvedAt = null`
8. ustawic `subcontractorId = null`
9. ustawic `basNumber = ''`
10. ustawic `categoryKey = null`

### Walidacja backend

Nowe wymagania walidacyjne:

- `title`: 3..200 znakow
- `issueDescription`: 10..5000 znakow
- `locationText`: wymagane, 1..300 znakow
- `priorityKey`: tylko wartosci z lookupu priorytetow
- payload ma odrzucac pola niedozwolone (`portalClaimCreateSchema` zachowuje `.strict()`):
  - `projectId`
  - `statusKey`
  - `assignedUserId`
  - `resolvedAt`
  - `reportedAt`
  - `subcontractorId`
  - `basNumber`
  - `categoryKey`

### Brak projektow

Jesli organizacja klienta nie ma zadnego aktywnego projektu:

- API zwraca `409`
- komunikat: `Brak aktywnego projektu dla organizacji klienta`

## Lookups

Portalowy formularz create nadal potrzebuje lookupow dla:

- priorytetow

Nie potrzebuje lookupow dla:

- projektow
- kategorii
- statusow

`GET /api/warranty_claims/portal/lookups` pozostaje bez zmian — szerszy bundle jest akceptowalny na tym etapie.

## Zalaczniki

Portalowe create dostaje ten sam wzorzec co backoffice create (SPEC-002):

- tymczasowy `draftAttachmentRecordId`
- upload do `attachments:library`
- po skutecznym create transfer do `warranty_claims:claim`

### Wydzielenie wspolnych helperow

Obecna implementacja w `WarrantyClaimForm.tsx` zawiera lokalne funkcje:

- `createDraftAttachmentRecordId()`
- `transferDraftAttachments()`

W ramach tej specyfikacji nalezy:

1. Wydzielic te helpery do `src/modules/warranty_claims/lib/attachments.ts`
2. Zaktualizowac `WarrantyClaimForm.tsx` do importu z nowej lokalizacji
3. Uzyc tych samych helperow w `PortalClaimCreateForm.tsx`

### Wymagania UX dla zalacznikow

- klient moze dodawac i usuwac pliki przed pierwszym zapisem
- po udanym create pliki sa przepinane do nowego `claimId`
- blad transferu zalacznikow nie cofa utworzenia zgloszenia
- klient dostaje czytelny komunikat, ze zgloszenie zostalo zapisane, ale zalaczniki nie zostaly w pelni przypiete

### Wymagania techniczne

- nie duplikowac logiki uploadu — uzyc wspolnych helperow z `lib/attachments.ts`
- zachowac istniejacy flow transferu z backoffice

## UI

### Struktura formularza

Docelowy formularz powinien miec 3 glowne sekcje:

1. `Dane podstawowe`
2. `Opis`
3. `Zalaczniki`

### Sekcja `Dane podstawowe`

Widoczne elementy:

- informacja tekstowa o automatycznie nadawanym statusie (`oczekuje`)
- wybor priorytetu (segmenty, tak jak w backoffice)

Nie pokazujemy selektora projektu ani informacji readonly o projekcie.

### Sekcja `Opis`

Widoczne pola:

- `title` — wymagane
- `locationText` — wymagane
- `issueDescription` — wymagane

### Sekcja `Zalaczniki`

Takie samo zachowanie funkcjonalne jak w backoffice create, ale w UI portalowym.

### Pola i bloki do usuniecia z obecnego create

Z formularza portalowego usuwamy:

- select projektu
- select kategorii

Nie dodajemy:

- podwykonawcy
- osoby przypisanej
- dat
- BAS

## Menu boczne portalu

Wymaganie biznesowe: w menu bocznym portalu ma byc mozliwosc dodawania nowego zgloszenia.

Widget juz istnieje:

- `warranty-claims-list`
- `warranty-claims-create`

Wymaganie weryfikacyjne:

- pozycja `Nowe zgloszenie` ma pozostac widoczna i aktywna w sidebarze portalu
- zweryfikowac injection point `menu:portal:sidebar:main` na dzialajacym dev shellu portalu
- jesli nie renderuje sie — naprawic integracje widgetu, nie tworzyc alternatywnej nawigacji

## Zmiany techniczne

### Frontend

Plik bazowy do zmiany:

- `src/modules/warranty_claims/components/portal/PortalClaimCreateForm.tsx`

Zakres:

- uproszczenie `FormValues` — usuniecie `projectId` i `categoryKey`
- `locationText` jako wymagane pole formularza
- dodanie sekcji zalacznikow z reusem helperow z `lib/attachments.ts`
- przebudowa layoutu tak, aby byl blizej `WarrantyClaimForm.tsx`
- po sukcesie create: redirect na szczegol uzywajac `id` z response
- zachowanie portalowych komponentow shell/page header/card

### Backend

Pliki bazowe do zmiany:

- `src/modules/warranty_claims/lib/portal.ts` — zmiana `portalClaimCreateSchema`
- `src/modules/warranty_claims/lib/claim-logic.ts` — `preparePortalClaimInput` bez `categoryKey` i `projectId` w inputcie, z automatycznym wyborem projektu
- `src/modules/warranty_claims/api/portal/claims/route.ts` — response body `{ id }`
- `src/modules/warranty_claims/data/entities.ts` — sprawdzic i dostosowac typ kolumny `categoryKey` (nullable)

Zakres:

- zmiana `portalClaimCreateSchema`: usun `categoryKey` i `projectId`, `locationText` wymagane, zachowaj `.strict()`
- automatyczny wybor projektu: zapytanie `status = 'active'` + `name asc` + limit 1
- `categoryKey = null` w `preparePortalClaimInput`
- walidacja: jesli brak aktywnego projektu → `409` z komunikatem biznesowym
- response `POST` zwraca `{ id: string }`

### Reuse

Wydzielic do `src/modules/warranty_claims/lib/attachments.ts`:

- `createDraftAttachmentRecordId()`
- `transferDraftAttachments()`

Zaktualizowac import w `WarrantyClaimForm.tsx` i uzyc w `PortalClaimCreateForm.tsx`.

## Fazy implementacji

### Faza 1 - model i helpery

1. Sprawdzic typ kolumny `categoryKey` w encji i migracji — zmienic na nullable jesli wymagane.
2. Wydzielic `createDraftAttachmentRecordId()` i `transferDraftAttachments()` do `lib/attachments.ts`.
3. Zaktualizowac import w `WarrantyClaimForm.tsx`.

Gate:

- `categoryKey` jest nullable w encji
- helpery zalacznikow sa w `lib/attachments.ts` i backoffice dalej dziala

### Faza 2 - backend create

1. Zmienic `portalClaimCreateSchema`: usun `categoryKey` i `projectId`, `locationText` wymagane, zachowaj `.strict()`.
2. Zaktualizowac `preparePortalClaimInput`: automatyczny wybor aktywnego projektu (`status = 'active'`, `name asc`), `categoryKey = null`.
3. Zmienic response `POST` na `{ id: string }`.
4. Dodac czytelny blad `409` przy braku aktywnego projektu.
5. Dodac testy kontraktu i testy negatywne.

Gate:

- endpoint tworzy zgloszenie bez `projectId` i `categoryKey` w payloadzie
- response zawiera tylko `{ id }`

### Faza 3 - frontend create

1. Przebudowac `PortalClaimCreateForm`: usunac selecty projektu i kategorii, `locationText` jako wymagane.
2. Dodac zalaczniki z reusem `lib/attachments.ts`.
3. Zachowac segmentowany wybor priorytetu.
4. Redirect po create uzywajac `id` z response.
5. Dostosowac komunikaty sukcesu i bledu (w tym blad czesciowego uploadu zalacznikow).

Gate:

- klient tworzy zgloszenie z zalacznikami bez wyboru projektu i kategorii

### Faza 4 - menu i QA

1. Zweryfikowac render pozycji `Nowe zgloszenie` w sidebarze portalu (injection point `menu:portal:sidebar:main`).
2. Zweryfikowac widok szczegolu — brak pola kategorii.
3. Sprawdzic listy i filtry backoffice przy `categoryKey = null`.
4. Dodac test scenariusza end-to-end.

Gate:

- flow create jest domkniete funkcjonalnie z poziomu portalu

## Test plan

### Testy jednostkowe / kontraktowe

- `portalClaimCreateSchema` akceptuje payload bez `projectId` i bez `categoryKey`
- `portalClaimCreateSchema` odrzuca payload z polami niedozwolonymi (`categoryKey`, `projectId`, `statusKey` itd.)
- `portalClaimCreateSchema` odrzuca payload bez `locationText`
- helper backend wybiera pierwszy aktywny projekt organizacji (`status = 'active'`, `name asc`)
- helper backend zwraca `409`, gdy brak aktywnego projektu

### Testy integracyjne backend

- klient tworzy zgloszenie bez `projectId` i `categoryKey` w payloadzie
- response zawiera tylko `{ id: string }`
- utworzony rekord dostaje `statusKey = oczekuje`
- utworzony rekord dostaje `assignedUserId = null`
- utworzony rekord dostaje `subcontractorId = null`
- utworzony rekord ma `categoryKey = null`
- organizacja bez aktywnego projektu dostaje `409` z komunikatem biznesowym
- brak `locationText` w payloadzie skutkuje bledem walidacji

### Testy UI

- create nie pokazuje selecta projektu
- create nie pokazuje selecta kategorii/zakresu
- `locationText` jest wymagane — walidacja na formularzu
- create pokazuje segmenty priorytetu
- create pozwala dodac zalaczniki przed zapisem
- po sukcesie nastepuje redirect do szczegolu
- szczegol nie pokazuje pola kategorii

### Testy end-to-end

1. klient otwiera portal
2. z menu bocznego przechodzi do `Nowe zgloszenie`
3. wypelnia tytul, lokalizacje (wymagane), opis, wybiera priorytet
4. dodaje zalacznik
5. zapisuje formularz
6. trafia na szczegol nowego zgloszenia (redirect po `id`)
7. widzi status `oczekuje`
8. widzi zalacznik przypiety do rekordu

### Scenariusz bledu zalacznikow

1. klient tworzy zgloszenie z zalacznikiem
2. transfer zalacznika nie powodzi sie (symulowany blad)
3. zgloszenie zostaje zapisane — brak rollbacku
4. klient widzi komunikat: zgloszenie zostalo zapisane, ale zalaczniki nie zostaly przypiete

## Ryzyka

| # | Ryzyko | Mitygacja |
|---|---|---|
| 1 | Listy, filtry i raporty backoffice moga zakladac niepustosc `categoryKey` | Przed wdrozeniem przegladnac wszystkie zapytania filtrujace/grupujace po `categoryKey` |
| 2 | "Pierwszy dostepny projekt" bedzie niestabilny bez jawnego sortowania | Ustalic deterministyczne sortowanie `name asc` — juz zapisane w spec |
| 3 | Race condition przy `resolveNextClaimNumber` | Zweryfikowac czy implementacja jest transakcyjna przed Faza 2 |
| 4 | Pozycja menu create istnieje w kodzie, ale nie renderuje sie w konkretnym shellu portalu | Zweryfikowac injection point `menu:portal:sidebar:main` w Fazie 4 |

## Acceptance criteria

- [ ] Klient moze wejsc do create z menu bocznego portalu.
- [ ] Formularz create jest wizualnie spojny z ukladem backoffice, ale zawiera tylko pola potrzebne klientowi.
- [ ] Klient nie wybiera projektu — system automatycznie przypisuje pierwszy aktywny projekt (`status = 'active'`, `name asc`).
- [ ] Klient nie wybiera podwykonawcy.
- [ ] Klient nie ustawia statusu, dat ani osoby przypisanej.
- [ ] Status nowego zgloszenia ustawia sie automatycznie na `oczekuje`.
- [ ] Klient moze ustawic priorytet.
- [ ] Klient moze dodac zalaczniki juz na create.
- [ ] `locationText` jest wymagane po stronie formularza i backendu.
- [ ] Formularz nie wymaga od klienta pola `zakres` / `kategoria`.
- [ ] `categoryKey` zapisuje sie jako `null` — backoffice uzupelnia je przy edycji.
- [ ] Response `POST` zwraca `{ id }` i nastepuje redirect na szczegol.
- [ ] Przy braku aktywnego projektu klient dostaje `409` z czytelnym komunikatem.
- [ ] Helpery zalacznikow sa wydzielone do `lib/attachments.ts` i reuzywane przez backoffice i portal.
- [ ] Glowne scenariusze (w tym blad transferu zalacznikow) sa pokryte testami.

## Changelog

| Data | Zmiana |
|------|--------|
| 2026-04-25 | Utworzono spec zmiany formularza nowego zgloszenia w portalu klienta, jako modyfikacje istniejacego modulu portalowego |
| 2026-04-25 | Uzupelniono decyzje: categoryKey=null (Opcja B), locationText wymagane, automatyczny wybor projektu status=active name asc, response POST zwraca tylko id, wydzielenie helperow zalacznikow do lib/attachments.ts |
