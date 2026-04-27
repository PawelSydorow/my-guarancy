# SPEC-002 - Zalaczniki podczas tworzenia zgloszenia gwarancyjnego

**Data**: 2026-04-22
**Status**: Draft

## TLDR

Obecnie modul `warranty_claims` pozwala dodawac zalaczniki dopiero po zapisaniu rekordu i przejsciu do edycji, bo sekcja uploadu opiera sie o `recordId` istniejacego zgloszenia. Celem tej specyfikacji jest wprowadzenie flow, w ktorym uzytkownik moze dodawac pliki juz na ekranie tworzenia zgloszenia, jeszcze przed pierwszym zapisem formularza.

Rekomendowane rozwiazanie to wykorzystanie istniejacego wzorca Open Mercato z `attachments:library` i tymczasowym `recordId`, a po utworzeniu zgloszenia przepisanie zalacznikow do docelowego rekordu `warranty_claims:claim` przez istniejacy endpoint transferu zalacznikow.

## Problem Statement

Aktualny stan modulu:
- na formularzu create sekcja zalacznikow pokazuje komunikat "Save the record before uploading files."
- upload dziala dopiero po utworzeniu rekordu i przejsciu na ekran edit
- zachowanie jest zgodne z wiekszoscia modulow Open Mercato, ale jest mniej wygodne dla procesu gwarancyjnego

W praktyce w obsludze zgloszen gwarancyjnych uzytkownik czesto zaczyna od:
- zalaczenia zdjec
- zalaczenia protokolu, PDF lub skanu
- dopiero potem dopelnienia opisu i danych operacyjnych

Brak mozliwosci dodania plikow na etapie create powoduje:
- dodatkowy krok po zapisaniu rekordu
- ryzyko, ze uzytkownik zapisze niepelne zgloszenie "tylko po to, by dodac pliki"
- gorsza ergonomie procesu

## Cel funkcjonalny

Uzytkownik ma moc:
- dodawac zalaczniki juz na ekranie tworzenia zgloszenia
- usuwac zalaczniki przed pierwszym zapisem zgloszenia
- po zapisaniu formularza miec te same pliki przypiete do utworzonego rekordu gwarancyjnego

Cel nie obejmuje:
- pelnej galerii mediow
- wersjonowania plikow
- automatycznej kategoryzacji zalacznikow
- uploadu chunkowanego

## Stan obecny i punkt odniesienia

W projekcie istnieja dwa wzorce obslugi zalacznikow:

### Wzorzec A - rekord musi juz istniec

Uzywany przez:
- `AttachmentsSection`
- pole customowe `kind: 'attachment'`
- formularze typu `staff`, `resources`, `sales detail`

Charakterystyka:
- upload wymaga `entityId` i `recordId`
- przy braku `recordId` UI blokuje upload

### Wzorzec B - tymczasowe zalaczniki w bibliotece

Uzywany przez:
- composer wiadomosci

Charakterystyka:
- pliki trafiaja do `entityId = attachments:library`
- `recordId` jest tymczasowym identyfikatorem typu `messages-composer:<uuid>`
- po wykonaniu akcji biznesowej pliki moga zostac powiazane z rekordem docelowym

To jest jedyny istniejacy wzorzec w stacku, ktory pozwala na upload przed utworzeniem docelowego rekordu.

## Proponowane rozwiazanie

## Glowna decyzja

Nie tworzymy pustego rekordu `warranty_claim` przy wejsciu na create.

Zamiast tego:
- generujemy tymczasowy `draftAttachmentRecordId`
- podczas create sekcja zalacznikow pracuje na:
  - `entityId = attachments:library`
  - `recordId = warranty-claim-create:<uuid>`
- po udanym `POST /api/warranty_claims/claims` wywolujemy transfer zalacznikow do:
  - `entityId = warranty_claims:claim`
  - `toRecordId = <id utworzonego zgloszenia>`

## Dlaczego ten kierunek

Plusy:
- zgodny z istniejacym wzorcem frameworka
- nie tworzy pustych szkicow w tabeli zgloszen
- nie wymaga zmiany modelu danych `warranty_claim`
- wykorzystuje juz istniejacy endpoint transferu zalacznikow
- pozwala zachowac dzisiejszy ekran create i jego walidacje

Minusy:
- dochodzi drugi krok po utworzeniu zgloszenia: transfer plikow
- trzeba rozwiazac cleanup osieroconych plikow, jesli uzytkownik porzuci formularz

## UX docelowy

### Create

Na formularzu create sekcja `Zalaczniki`:
- jest aktywna od razu
- pozwala dodawac i usuwac pliki bez pierwszego zapisu formularza
- wyswietla opis, ze pliki tymczasowo zapisuja sie od razu

Po kliknieciu `Utworz zgloszenie`:
1. formularz tworzy rekord zgloszenia
2. jesli istnieja tymczasowe zalaczniki, system transferuje je do nowego `claimId`
3. po sukcesie uzytkownik trafia na standardowy redirect sukcesu

### Edit

Na formularzu edit pozostaje obecne zachowanie:
- sekcja pracuje bezposrednio na `entityId = warranty_claims:claim`
- `recordId = claimId`
- upload i delete wykonuja sie od razu

## Zakres techniczny

## Frontend

### WarrantyClaimForm

Nalezy rozszerzyc formularz o rozroznienie dwoch trybow zalacznikow:

#### Tryb create

- na mount generowany jest stabilny identyfikator tymczasowy, np.:
  - `warranty-claim-create:${crypto.randomUUID()}`
- identyfikator jest trzymany w stanie komponentu i nie zmienia sie podczas edycji pol
- sekcja `AttachmentsSection` dostaje:
  - `entityId="attachments:library"`
  - `recordId=<draftAttachmentRecordId>`

#### Tryb edit

- pozostaje:
  - `entityId=WARRANTY_CLAIM_ENTITY_ID`
  - `recordId=claimId`

### Submit create

Po `createCrud('warranty_claims/claims', payload)` trzeba:
- odczytac `id` utworzonego rekordu z odpowiedzi
- sprawdzic, czy istnieja zalaczniki w tymczasowym koszyku
- jesli tak, wywolac transfer

Transfer:
- `POST /api/attachments/transfer`
- body:
  - `entityId: 'warranty_claims:claim'`
  - `fromRecordId: <draftAttachmentRecordId>`
  - `toRecordId: <newClaimId>`
  - `attachmentIds: [...]`

Uwaga:
- jesli endpoint transferu filtruje po `entityId`, a rekordy tymczasowe zyja w `attachments:library`, nalezy doprecyzowac lub rozszerzyc backend transferu
- rekomendacja: dopuscic transfer z `sourceEntityId` i `targetEntityId`, zamiast jednego `entityId`

## Backend

## Opcja rekomendowana - rozszerzenie transfer endpointu

Istniejacy endpoint transferu jest bliski potrzebie, ale trzeba go dostosowac do scenariusza:
- z `attachments:library`
- do `warranty_claims:claim`

Rekomendowana nowa forma payloadu:
- `sourceEntityId`
- `targetEntityId`
- `attachmentIds`
- `fromRecordId`
- `toRecordId`

Minimalna logika:
1. znajdz zalaczniki po `attachmentIds`, `sourceEntityId`, `fromRecordId`, `tenantId`, `organizationId`
2. ustaw:
   - `record.entityId = targetEntityId`
   - `record.recordId = toRecordId`
3. zaktualizuj `assignments` w metadata
4. zapisz zmiany

## Cleanup osieroconych zalacznikow

Ta specyfikacja nie wymaga od razu automatycznego cleanupu jako warunku MVP.

Na start wystarczy:
- traktowac osierocone zalaczniki `attachments:library` jako akceptowalny koszt techniczny
- dodac do backlogu zadanie cleanupu po czasie lub po anulowaniu formularza

Opcje przyszle:
- cleanup po `beforeunload`
- cleanup po kliknieciu `Anuluj`
- cleanup cronem po `created_at < now - X` dla `attachments:library`

## Model danych

Bez zmian w `warranty_claims_claims`.

Wykorzystujemy istniejaca tabele:
- `attachments`

Nowe rekordy tymczasowe sa zwyklymi wpisami:
- `entity_id = 'attachments:library'`
- `record_id = 'warranty-claim-create:<uuid>'`

Po transferze rekord staje sie:
- `entity_id = 'warranty_claims:claim'`
- `record_id = '<claimId>'`

## Edge Cases

### 1. Uzytkownik doda pliki i zamknie ekran bez zapisu

Na start:
- pliki pozostaja w `attachments:library`
- nie blokuja procesu biznesowego

### 2. Create zgloszenia powiedzie sie, ale transfer plikow nie

Rekomendowane zachowanie:
- zgloszenie zostaje utworzone
- uzytkownik dostaje `warning flash`, ze rekord utworzono, ale nie wszystkie zalaczniki zostaly przypiete
- w logach pojawia sie blad transferu

Nie wolno:
- rollbackowac calego create tylko dlatego, ze transfer plikow sie nie udal po stronie wtorniej

### 3. Uzytkownik usunie tymczasowy plik przed zapisem

Oczekiwane:
- plik znika z listy tymczasowej
- nie bierze udzialu w transferze

### 4. Wielokrotne klikniecie submit

Oczekiwane:
- standardowe zabezpieczenie submitu formularza
- transfer uruchamiany tylko dla finalnie utworzonego rekordu

### 5. Przejscie create -> edit po walidacji serwerowej

Jesli create zwraca blad walidacji:
- formularz zostaje na stronie
- tymczasowe zalaczniki nadal pozostaja dostepne
- `draftAttachmentRecordId` nie powinien sie zresetowac

## Zmiany w UI

## Sekcja zalacznikow

Opis na create:
- `Pliki zapisuja sie tymczasowo od razu po dodaniu lub usunieciu. Po utworzeniu zgloszenia zostana przypiete do rekordu.`

Opis na edit moze pozostac obecny lub byc krotszy:
- `Pliki zapisuja sie od razu po dodaniu lub usunieciu.`

## Wskaznik stanu

Opcjonalnie w MVP:
- licznik tymczasowych plikow przy create
- brak dodatkowego badge nie blokuje wdrozenia

## Implementacja - podzial prac

## Faza 1 - backend transferu

Zadania:
1. Zweryfikowac obecny endpoint `attachments/transfer`
2. Rozszerzyc go o `sourceEntityId` i `targetEntityId`
3. Dodac testy endpointu dla transferu:
   - `attachments:library` -> `warranty_claims:claim`

Done criteria:
- backend potrafi przepisac zalaczniki miedzy roznymi `entityId`

## Faza 2 - frontend create flow

Zadania:
1. Dodac generator `draftAttachmentRecordId` w `WarrantyClaimForm`
2. Przelaczyc `AttachmentsSection` na `attachments:library` w trybie create
3. Po sukcesie create pobrac liste tymczasowych zalacznikow i wywolac transfer
4. Dodac warning handling na wypadek bledu transferu

Done criteria:
- na create mozna dodawac pliki bez istniejacego `claimId`
- po zapisie pliki trafiaja do nowego zgloszenia

## Faza 3 - testy i hardening

Zadania:
1. Dodac testy frontendowe dla create mode
2. Dodac testy integracyjne dla transferu
3. Dodac test reczny scenariusza porzuconego formularza
4. Udokumentowac cleanup jako follow-up

Done criteria:
- glowne flow jest pokryte testami
- znane ograniczenia sa opisane

## Test Strategy

## Testy jednostkowe - frontend

Pokryc:
- create mode ustawia `AttachmentsSection` na `attachments:library`
- `draftAttachmentRecordId` jest stabilny w trakcie zycia formularza
- edit mode nadal pracuje na `warranty_claims:claim`
- po sukcesie create wywolywany jest transfer zalacznikow

Przykladowe testy:
1. `mode=create` renderuje sekcje z `entityId=attachments:library`
2. `mode=edit` renderuje sekcje z `entityId=warranty_claims:claim`
3. blad create nie resetuje tymczasowych zalacznikow
4. sukces create + brak plikow nie wywoluje transferu
5. sukces create + pliki wywoluje transfer

## Testy integracyjne - backend

Pokryc:
- transfer miedzy `sourceEntityId` i `targetEntityId`
- aktualizacje metadata `assignments`
- autoryzacje `attachments.manage`

Przykladowe scenariusze:
1. upload do `attachments:library`
2. transfer do `warranty_claims:claim`
3. GET po docelowym `entityId` i `recordId` widzi przepisane pliki
4. transfer z blednym scope zwraca `404` lub `403`

## Testy integracyjne - e2e

Scenariusz glowny:
1. otworz `/backend/warranty-claims/create`
2. dodaj 2 pliki
3. wypelnij wymagane pola
4. zapisz zgloszenie
5. wejdz na edit utworzonego rekordu
6. potwierdz, ze oba pliki sa przypiete do zgloszenia

Scenariusz bledu:
1. dodaj plik na create
2. zostaw formularz z bledem walidacji
3. kliknij submit
4. potwierdz, ze plik nadal jest widoczny w sekcji create

## Acceptance Criteria

- [ ] Uzytkownik moze dodac i usunac zalaczniki na ekranie create zgloszenia gwarancyjnego.
- [ ] Create formularza nie wymaga wstepnego utworzenia pustego `warranty_claim`.
- [ ] Po udanym utworzeniu zgloszenia wszystkie tymczasowe zalaczniki sa przepiete do `warranty_claims:claim`.
- [ ] Tryb edit nadal dziala na bezposrednio przypietych zalacznikach rekordu.
- [ ] Blad walidacji create nie usuwa tymczasowo dodanych plikow.
- [ ] Blad transferu po create nie cofa utworzenia rekordu, ale jest czytelnie raportowany.
- [ ] Krytyczne scenariusze sa pokryte testami frontendowymi i backendowymi.

## Otwarte pytania

1. Czy cleanup osieroconych plikow ma wejsc od razu do tej samej implementacji, czy zostaje jako follow-up?
2. Czy warning po nieudanym transferze ma tylko flashowac blad, czy rowniez przekierowywac na edit z dodatkowym komunikatem?
3. Czy na create potrzebujemy od razu podgladu miniaturek, czy wystarczy standardowy `AttachmentsSection`?

## Changelog

| Data | Zmiana |
|------|--------|
| 2026-04-22 | Utworzono specyfikacje funkcjonalno-techniczna dla uploadu zalacznikow podczas tworzenia zgloszenia gwarancyjnego |
