# SPEC-001 - Modul obslugi zgloszen gwarancyjnych MVP

**Data**: 2026-04-21
**Status**: Draft

## TLDR

Pierwszym modulem domenowym w `my-guarancy` powinien byc modul do obslugi zgloszen gwarancyjnych, a nie modul projektow. Celem MVP/POC jest szybkie uruchomienie jednego dzialajacego procesu: utworzenia, przypisania, obslugi i zakonczenia zgloszenia gwarancyjnego w backoffice.

Rekomendowany kierunek to nowy modul `warranty_claims`, z jedna glowna encja `warranty_claim`, prostymi lookupami seedowanymi z JSON oraz wykorzystaniem `dictionaries` do prostych, adminowalnych list globalnych. Zakres ma byc celowo waski: bez portalu, bez workflow engine i bez pelnego modelu inwestycji budowlanej.

## Problem Statement

System ma obslugiwac gwarancje budowlane, ale dla MVP realnym procesem nie jest zarzadzanie cala inwestycja, tylko obsluga pojedynczego zgloszenia usterki. To zgloszenie musi:
- zebrac najwazniejsze dane biznesowe
- byc przypisane do projektu
- korzystac z prostych kategorii i priorytetow
- umozliwiac wybor podwykonawcy zaleznnego od projektu
- miec obsluge statusu oraz dat operacyjnych
- pozwalac na filtrowanie i szybkie przeszukiwanie listy

Brak tego modulu oznacza, ze zespol nie ma jednego spójnego miejsca do:
- rejestrowania usterek
- sledzenia kto jest odpowiedzialny
- przegladania stanu zgloszen
- filtrowania po projekcie, statusie, BAS, kategorii i dacie

## Cele MVP

### Cele biznesowe

- umozliwic szybkie wprowadzenie zgloszenia gwarancyjnego
- umozliwic przypisanie odpowiedzialnej osoby
- umozliwic wskazanie podwykonawcy dla konkretnego projektu
- umozliwic sledzenie podstawowego statusu obslugi
- miec dzialajaca liste z praktycznymi filtrami

### Cele techniczne

- oprzec MVP na standardowych mechanizmach Open Mercato
- uniknac nadmiarowej architektury
- zachowac prostą sciezke rozbudowy po POC
- trzymac lookupi w bazie, nawet jesli startowo pochodza z JSON

## Poza zakresem MVP

- pelny modul inwestycji budowlanych
- rozbudowany model gwarancji per budynek, element, lokal lub urzadzenie
- workflow engine, SLA, eskalacje, automatyczne przypomnienia
- portal klienta
- obieg dokumentow i zalacznikow jako osobny proces
- osobny model wykonawcow
- zaawansowane dashboardy i raporty

## Ustalenia domenowe

Na potrzeby MVP przyjmujemy:
- pierwszy modul to `warranty_claims`
- projekty beda seedowane z JSON, bez osobnego CRUD w panelu na start
- kategorie beda seedowane z JSON
- podwykonawcy beda seedowani z JSON
- `reported_at` moze byc recznie edytowane
- `resolved_at` moze byc recznie edytowane
- `resolved_at` ma byc aktualizowane przy kazdym wejsciu w status rozwiazany
- `bas_number` jest obowiazkowy przy tworzeniu zgloszenia
- podstawowy seed statusow to:
  - `oczekuje`
  - `w_trakcie`
  - `zakonczone`

## Proponowane rozwiazanie

### Architektura modułu

Nowy modul aplikacyjny:
- `src/modules/warranty_claims`

Glowna encja:
- `warranty_claim`

Encje pomocnicze seedowane z JSON:
- `project`
- `project_subcontractor`

Proste listy globalne przez `dictionaries`:
- `warranty_claim_status`
- `warranty_claim_priority`
- `warranty_claim_category`

### Co wykorzystac z Open Mercato

Warto wykorzystac od razu:
- `auth` i `staff` do przypisania uzytkownika
- `dictionaries` do prostych list globalnych
- standardowy `makeCrudRoute` lub odpowiadajacy wzorzec CRUD z repo
- backend `CrudForm`
- backend `DataTable`
- RBAC i `setup.ts`
- generator `yarn generate`
- migracje przez `yarn db:generate`

Warto odlozyc:
- `notifications`
- `search`
- `scheduler`
- `workflows`
- `attachments`

Powod: MVP ma najpierw udowodnic proces i ergonomie obslugi zgloszen.

## Model danych

## Encja glowna: `warranty_claim`

Tabela:
- `warranty_claims_claims`

Rekomendacja nazewnicza:
- entity type: `warranty_claims:claim`
- klasa: `WarrantyClaim`

### Pola systemowe

- `id: uuid`
- `organization_id: uuid`
- `tenant_id: uuid`
- `is_active: boolean`
- `created_at: timestamptz`
- `updated_at: timestamptz`
- `deleted_at: timestamptz | null`

Uwaga: `tenant_id` i `organization_id` sa polami wymaganymi przez Open Mercato core i musza byc obecne w encjach. Aplikacja nie jest multitenant — `tenant_id` bedzie miec jedna wartosc. Walidacje relacyjne scope'uja dane po `organization_id`.

### Pola biznesowe

- `project_id: uuid`
- `title: varchar(255)`
- `issue_description: text`
- `location_text: varchar(255)`
- `priority_key: varchar(100)` lub referencja logiczna do wpisu slownika
- `category_key: varchar(100)` lub referencja logiczna do wpisu slownika
- `bas_number: varchar(100)`
- `status_key: varchar(100)` lub referencja logiczna do wpisu slownika
- `reported_at: timestamptz`
- `assigned_user_id: uuid | null`
- `resolved_at: timestamptz | null`
- `subcontractor_id: uuid | null`
- `subcontractor_name: varchar(255) | null`
- `subcontractor_address: text | null`
- `subcontractor_email: varchar(320) | null`
- `subcontractor_phone: varchar(50) | null`
- `subcontractor_contact_person: varchar(255) | null`

### Uwagi projektowe

- `title`, `bas_number`, `location_text` powinny byc indeksowane tylko wtedy, gdy zajdzie realna potrzeba. Na start wystarcza indeksy na polach lookupowych.
- `project_id`, `subcontractor_id`, `assigned_user_id`, `organization_id`, `tenant_id` powinny miec indeksy.
- `status_key`, `priority_key`, `category_key` mozna indeksowac, bo beda czesto filtrowane.

## Encja pomocnicza: `project`

Tabela:
- `warranty_claims_projects`

Pola:
- `id: uuid`
- `organization_id: uuid`
- `tenant_id: uuid`
- `name: varchar(255)`
- `code: varchar(100) | null`
- `is_active: boolean`
- `created_at: timestamptz`
- `updated_at: timestamptz`
- `deleted_at: timestamptz | null`

Ta encja ma sluzyc glownie do:
- autocomplete projektu
- filtrowania zgloszen po projekcie
- walidacji, ze projekt istnieje w aktualnym scope

## Encja pomocnicza: `project_subcontractor`

Tabela:
- `warranty_claims_project_subcontractors`

Pola:
- `id: uuid`
- `organization_id: uuid`
- `tenant_id: uuid`
- `project_id: uuid`
- `name: varchar(255)`
- `address: text | null`
- `email: varchar(320) | null`
- `phone: varchar(50) | null`
- `contact_person: varchar(255) | null`
- `is_active: boolean`
- `created_at: timestamptz`
- `updated_at: timestamptz`
- `deleted_at: timestamptz | null`

Ta encja musi spelniac warunek:
- podwykonawca nalezy do konkretnego projektu

## Slowniki przez `dictionaries`

### `warranty_claim_status`

Seed podstawowy:
- `oczekuje`
- `w_trakcie`
- `zakonczone`

Wpisy słownika statusów są **zarezerwowane** — nie mogą być usunięte ani zmieniony ich klucz przez admina. Etykiety wyświetlane mogą być edytowalne. Klucz `zakonczone` jest używany w logice biznesowej (`resolved_at`) i musi zawsze istnieć w systemie.

### `warranty_claim_priority`

Do ustalenia przy seedzie, ale MVP powinno miec prosty zestaw, np.:
- `niski`
- `sredni`
- `wysoki`
- `krytyczny`

### `warranty_claim_category`

Kategorie domenowe seedowane z JSON. Ich lista nie powinna byc zakodowana na sztywno w module.

## Zasady walidacji

### Create / Update

- `project_id` jest wymagane
- `title` jest wymagane, trim, max 255
- `issue_description` jest wymagane
- `location_text` jest wymagane
- `priority_key` jest wymagane
- `category_key` jest wymagane
- `bas_number` jest wymagane
- `status_key` jest wymagane
- `reported_at` jest wymagane
- `assigned_user_id` jest opcjonalne
- `resolved_at` jest opcjonalne
- `subcontractor_id` jest opcjonalne

### Walidacje relacyjne

- `project_id` musi wskazywac istniejacy, aktywny projekt (aplikacja jest jednoorganizacyjna)
- `subcontractor_id`, jesli ustawiony, musi nalezec do wybranego `project_id`
- `assigned_user_id`, jesli ustawiony, musi wskazywac istniejacego usera w systemie (aplikacja jest jednoorganizacyjna — walidacja istnienia wystarczy)
- `status_key`, `priority_key`, `category_key` musza istniec w odpowiednich slownikach

### Walidacje dat

- `reported_at` moze byc ustawione recznie
- `resolved_at` moze byc ustawione recznie
- UI serializuje daty z timezone przegladarki uzytkownika; API przyjmuje i przechowuje wartosci jako `timestamptz` (UTC)
- jesli `status_key = zakonczone` i `resolved_at` jest puste, system ustawia je automatycznie na biezacy czas
- jesli `status_key = zakonczone` i `resolved_at` jest juz wypelnione (recznie lub poprzednio), system nie nadpisuje go
- przy ponownym wejsciu w `zakonczone` obowiazuje ta sama zasada: `resolved_at` jest uzupelniane tylko jesli jest puste

## API Contracts

## CRUD zgloszen

Endpoint:
- `GET /api/warranty_claims/claims`
- `GET /api/warranty_claims/claims/:id`
- `POST /api/warranty_claims/claims`
- `PUT /api/warranty_claims/claims/:id`
- `DELETE /api/warranty_claims/claims/:id`

### Parametry listy

Paginacja:
- `page` (domyslnie: `1`)
- `pageSize` (domyslnie: `50`, maksymalnie: `100`)

Filtry MVP:
- `status_key`
- `priority_key`
- `category_key`
- `project_id`
- `assigned_user_id`
- `subcontractor_id`
- `bas_number`
- `title`
- `reported_from`
- `reported_to`

Sortowanie MVP:
- `created_at`
- `reported_at`
- `updated_at`
- `title`
- `bas_number`

### Odpowiedz listy

Minimalnie:
- `items`
- `total`
- `page`
- `pageSize`
- `totalPages`

Kazdy rekord powinien zwracac:
- wszystkie pola biznesowe
- pola systemowe potrzebne do listy i edycji

## Endpointy lookup

MVP moze pojsc jedna z dwoch drog:

### Wariant A - standardowy CRUD dla lekkich encji

Plusy:
- najmniej kodu specjalnego
- zgodne z kierunkiem OM

Minusy:
- trzeba dopilnowac mapowania query do autocomplete

### Wariant B - lekkie endpointy lookup

Przyklady:
- `GET /api/warranty_claims/projects`
- `GET /api/warranty_claims/subcontractors?project_id=...`
- `GET /api/warranty_claims/users`

Rekomendacja MVP:
- projekty i podwykonawcy moga miec lekkie endpointy lookup, jesli to uprości UI
- kategorie, priorytety i statusy powinny byc pobierane przez slowniki

## UI / UX Backoffice

UI powinno byc budowane zgodnie z wzorcem widocznym lokalnie w module `example`:
- strona listy jako `Page` + `PageBody` + komponent tabeli
- formularze create/edit przez `CrudForm`
- tabela listy przez `DataTable`
- akcje rzędowe przez `RowActions`
- flash messages po sukcesie i bledach

## Widoki MVP

### 1. Lista zgloszen

Sciezka:
- `/backend/warranty-claims` albo `/backend/warranty_claims`

Kolumny MVP:
- tytul
- numer BAS
- projekt
- status
- pilnosc
- kategoria
- podwykonawca
- przypisany uzytkownik
- data zgloszenia
- data rozwiazania
- updated_at

Filtry MVP:
- status
- pilnosc
- kategoria
- projekt
- assigned_user
- subcontractor
- bas_number
- title
- reported_at od-do

Akcje:
- utworz zgloszenie
- edytuj
- usun

### 2. Formularz tworzenia zgloszenia

Wzorzec:
- `CrudForm`

Rekomendowane grupy pol:

#### Grupa: Dane podstawowe

- projekt
- tytul
- numer BAS
- status
- pilnosc
- kategoria

#### Grupa: Opis

- opis usterki
- lokalizacja

#### Grupa: Odpowiedzialnosc i realizacja

- przypisana osoba
- podwykonawca
- data zgloszenia
- data rozwiazania

#### Grupa: Dane podwykonawcy

Sekcja tylko do odczytu po wyborze podwykonawcy — wyswietla dane z migawki zapisanej w rekordzie:
- adres
- email
- telefon
- osoba kontaktowa

Dane kontaktowe sa kopiowane z encji `project_subcontractor` do pol `subcontractor_*` na `warranty_claim` w momencie zapisu (create i update). Jesli podwykonawca zmieni dane po zamknieciu zgloszenia, historia zgloszenia pozostaje niezmieniona.

### 3. Formularz edycji zgloszenia

Ten sam uklad co create, ale:
- dane laduja sie z API
- zmiana statusu moze wywolywac automatyke `resolved_at`
- wszystkie pola sa edytowalne

## Zachowanie formularza

### Projekt

- pole autocomplete lub select
- lista oparta na seedowanych rekordach z bazy

### Podwykonawca

- disabled, dopoki nie wybrano projektu
- po wyborze projektu pobierana lub filtrowana jest lista podwykonawcow tylko dla tego projektu
- jesli uzytkownik zmieni projekt po wybraniu podwykonawcy:
  - obecny podwykonawca musi zostac wyczyszczony
  - dane pomocnicze podwykonawcy musza zostac odswiezone

### Status i `resolved_at`

- przy zmianie statusu na `zakonczone` system proponuje lub ustawia `resolved_at`
- jesli uzytkownik chce wpisac inna date, moze to zrobic
- przy zmianie z `zakonczone` na inny status nie czyścimy automatycznie `resolved_at` w MVP, chyba ze biznes pozniej zdecyduje inaczej

## Edge Cases

### Dane seedowane

- brak projektow po seedzie: formularz nie powinien sie wysypac, ale tworzenie zgloszenia powinno byc praktycznie zablokowane przez brak danych lookup
- brak kategorii, statusow lub priorytetow: formularz musi pokazywac czytelny blad konfiguracji
- projekt istnieje, ale nie ma podwykonawcow: formularz musi pozwolic zapisac zgloszenie bez podwykonawcy

### Zaleznosci formularza

- uzytkownik wybiera projekt A i podwykonawce A1, potem zmienia projekt na B
  - system musi wyczyscic `subcontractor_id`
- uzytkownik otwiera edycje rekordu, a podwykonawca juz nie istnieje lub jest nieaktywny
  - rekord musi sie dac otworzyc
  - UI musi pokazac stan nieprawidlowy lub historyczny
  - zapis nie moze przypadkiem kasowac danych bez decyzji uzytkownika

### Daty i statusy

- status ustawiony na `zakonczone`, ale `resolved_at` puste
  - system ustawia automatycznie
- status nie jest `zakonczone`, ale `resolved_at` jest wypelnione
  - w MVP dopuszczamy, bo data jest recznie edytowalna
- uzytkownik wielokrotnie przechodzi przez `zakonczone`
  - `resolved_at` jest ustawiane tylko przy pierwszym wejsciu (kiedy jest puste); kolejne przejscia nie nadpisuja wartosci

### Spójnosc danych

- `project_id` nie istnieje lub jest soft-deleted
  - odrzucic zapis
- `subcontractor_id` nie nalezy do `project_id`
  - odrzucic zapis
- `assigned_user_id` nie istnieje
  - odrzucic zapis
- `status_key`, `priority_key`, `category_key` nie istnieja
  - odrzucic zapis

### Usuwanie i soft delete

- rekord usuniety soft-delete nie powinien pokazywac sie standardowo na liscie
- lookup projektow i podwykonawcow (dla nowych zgloszen i zmiany projektu) zwraca tylko aktywne rekordy (`deleted_at IS NULL`)
- edycja istniejacego zgloszenia, ktore referencuje soft-deleted projekt lub podwykonawce, dziala normalnie — nie blokujemy edycji, nie wyrozniamy wizualnie stanu historycznego

## Implementacja - podzial prac

## Faza 1 - fundament modulu

Cel:
- stworzyc strukture modulu i podstawowe encje

Zadania:
1. Dodac modul `warranty_claims` do `src/modules.ts`.
2. Stworzyc:
   - `index.ts`
   - `acl.ts`
   - `setup.ts`
   - `data/entities.ts`
   - `data/validators.ts`
3. Zdefiniowac encje:
   - `WarrantyClaim`
   - `Project`
   - `ProjectSubcontractor`
4. Uruchomic `yarn generate`.
5. Wygenerowac migracje przez `yarn db:generate`.

Done criteria:
- modul jest zarejestrowany
- encje kompiluja sie
- migracja tworzy oczekiwane tabele i indeksy

## Faza 2 - seed i lookupi

Cel:
- dostarczyc dane startowe potrzebne do dzialania formularza

Zadania:
1. Przygotowac format JSON dla:
   - projektow
   - kategorii
   - podwykonawcow
   - priorytetow
   - statusow
2. Zaimplementowac seed w `setup.ts` lub osobnym helperze seedujacym.
3. Zdecydowac, czy lookupi projektow i podwykonawcow ida przez standardowe CRUD czy lekkie endpointy.
4. Zapewnic filtrowanie podwykonawcow po projekcie.

Done criteria:
- po inicjalizacji tenant ma dane startowe
- formularz ma z czego ladowac lookupi

## Faza 3 - CRUD backend

Cel:
- uruchomic API dla zgloszen

Zadania:
1. Dodac route dla `claims`.
2. Skonfigurowac list schema, sortFieldMap i filtry.
3. Dodac walidacje relacyjne.
4. Dodac logike automatycznego ustawiania `resolved_at`.
5. Dodac RBAC do operacji GET/POST/PUT/DELETE.

Done criteria:
- CRUD dziala end-to-end
- bledne relacje sa blokowane

## Faza 4 - UI backoffice

Cel:
- zbudowac uzywalna liste i formularze

Zadania:
1. Stworzyc strone listy z tabela.
2. Dodac filtry MVP.
3. Stworzyc strone create.
4. Stworzyc strone edit.
5. Dodac zalezne pole podwykonawcy.
6. Dodac sekcje danych kontaktowych podwykonawcy.

Done criteria:
- uzytkownik moze dodac i edytowac zgloszenie z UI
- filtry dzialaja
- zalezne lookupi dzialaja

## Faza 5 - hardening i testy

Cel:
- zabezpieczyc edge case i stabilnosc

Zadania:
1. Dodac testy jednostkowe walidacji i logiki statusu.
2. Dodac testy integracyjne API.
3. Dodac testy UI / Playwright dla glownego flow.
4. Zweryfikowac scenariusze seed/brak danych.

Done criteria:
- krytyczne scenariusze sa pokryte testami
- MVP jest gotowe do demonstracji

## RBAC

Rekomendowane features:
- `warranty_claims.view`
- `warranty_claims.create`
- `warranty_claims.edit`
- `warranty_claims.delete`
- opcjonalnie `warranty_claims.manage`

Rekomendacja:
- `superadmin`: wszystko
- `admin`: wszystko
- `employee`: brak domyslnych uprawnien — admin konfiguruje samodzielnie przez panel RBAC

## Seed i import

## Format seed JSON

Powinny powstac pliki lub struktury dla:
- `projects.json`
- `subcontractors.json`
- `categories.json`
- `priorities.json`
- `statuses.json`

### Minimalne wymagania projektu

- unikalny identyfikator lub stabilny klucz
- nazwa

### Minimalne wymagania podwykonawcy

- unikalny identyfikator lub stabilny klucz
- identyfikator projektu
- nazwa
- opcjonalne dane kontaktowe

### Idempotencja seedow

Seed nie powinien:
- duplikowac rekordow przy kolejnym uruchomieniu
- kasowac recznie poprawionych rekordow bez jasnej polityki

Rekomendacja MVP:
- seed typu upsert po stabilnym kluczu

## Test Strategy

## Testy jednostkowe - backend

Pokryc:
- walidacje `create` i `update`
- logike automatycznego ustawiania `resolved_at`
- logike walidacji `subcontractor_id` vs `project_id`
- mapowanie statusu `zakonczone` do stanu rozwiazanego
- helpery seedujace JSON

Przykladowe testy:
- tworzenie zgloszenia bez `bas_number` zwraca blad
- zapis z nieistniejacym `project_id` zwraca blad
- zapis z `subcontractor_id` z innego projektu zwraca blad
- status `zakonczone` i brak `resolved_at` powoduje auto-uzupelnienie
- status `w_trakcie` nie wymusza `resolved_at`

## Testy jednostkowe - frontend

Pokryc:
- zalezne czyszczenie pola podwykonawcy po zmianie projektu
- wyswietlanie danych kontaktowych po wyborze podwykonawcy
- serializacje filtrow listy
- zachowanie formularza przy recznej edycji `reported_at` i `resolved_at`

Przykladowe testy:
- zmiana projektu resetuje `subcontractor_id`
- brak podwykonawcow dla projektu nie wysypuje pola
- ustawienie statusu `zakonczone` nie blokuje recznej edycji `resolved_at`

## Testy integracyjne - backend

Pokryc:
- pelny CRUD zgloszen
- filtrowanie listy
- autoryzacje i brak uprawnien
- seed danych lookup

Przykladowe scenariusze:
1. `POST /api/warranty_claims/claims` tworzy rekord z poprawnymi danymi.
2. `POST` bez `bas_number` zwraca `400`.
3. `POST` z `subcontractor_id` spoza projektu zwraca `400`.
4. `PUT` zmieniajacy status na `zakonczone` uzupelnia `resolved_at`.
5. `GET` filtruje po `status_key`.
6. `GET` filtruje po `project_id`.
7. `GET` filtruje po zakresie `reported_at`.
8. `DELETE` wykonuje soft delete lub usuwa zgodnie z przyjetym wzorcem CRUD.
9. Uzytkownik bez `warranty_claims.view` dostaje `403`.

## Testy integracyjne - frontend / e2e

Pokryc:
- wejscie na liste
- filtrowanie
- tworzenie zgloszenia
- edycje zgloszenia
- zalezny lookup podwykonawcy

Przykladowe scenariusze:
1. Uzytkownik otwiera liste i widzi seedowane rekordy.
2. Uzytkownik filtruje po statusie `oczekuje`.
3. Uzytkownik tworzy zgloszenie:
   - wybiera projekt
   - wybiera kategorie
   - wybiera priorytet
   - wpisuje BAS
   - wpisuje lokalizacje
   - zapisuje rekord
4. Uzytkownik zmienia projekt po wybraniu podwykonawcy i widzi reset pola podwykonawcy.
5. Uzytkownik ustawia status `zakonczone` i zapisuje rekord.
6. Uzytkownik edytuje recznie `resolved_at`.
7. Uzytkownik filtruje liste po projekcie i BAS.

## Scenariusze testowe do recznej weryfikacji

### Scenariusz 1 - Minimalne utworzenie

1. Otworz create.
2. Wybierz projekt.
3. Wypelnij wymagane pola.
4. Nie wybieraj podwykonawcy.
5. Zapisz.

Oczekiwane:
- rekord tworzy sie poprawnie
- brak podwykonawcy jest akceptowalny

### Scenariusz 2 - Podwykonawca zależny od projektu

1. Wybierz projekt A.
2. Wybierz podwykonawce A1.
3. Zmien projekt na B.

Oczekiwane:
- podwykonawca zostaje wyczyszczony
- widoczni sa tylko podwykonawcy projektu B

### Scenariusz 3 - Automatyczne `resolved_at`

1. Otworz istniejace zgloszenie.
2. Ustaw status `zakonczone`.
3. Zapisz.

Oczekiwane:
- `resolved_at` zostaje uzupelnione, jesli bylo puste

### Scenariusz 4 - Ręczna edycja daty rozwiazania

1. Otworz istniejace zgloszenie.
2. Ustaw status `zakonczone`.
3. Wpisz recznie `resolved_at`.
4. Zapisz.

Oczekiwane:
- reczna wartosc pozostaje zapisana

### Scenariusz 5 - Brak danych seed

1. Uruchom aplikacje bez projektow lub bez slownikow.
2. Otworz create.

Oczekiwane:
- UI pokazuje czytelny blad konfiguracji lub brak dostepnych opcji
- nie ma silent failure

## Ryzyka i decyzje architektoniczne

### Ryzyko 1 - lookupi tylko w JSON

Jesli lookupi pozostana tylko w plikach JSON bez zapisania do bazy:
- walidacja bedzie krucha
- filtrowanie bedzie trudniejsze
- autocomplete bedzie bardziej prowizoryczne

Dlatego JSON ma byc tylko zrodlem seed.

### Ryzyko 2 - zbyt szeroki MVP

Jesli dołożymy od razu CRUD projektow, zalaczniki, harmonogram, SLA i automaty, POC stanie sie zbyt wolne do dowiezienia.

### Ryzyko 3 - status jako slownik

Status jako `dictionary` jest wygodny dla POC, ale jesli logika przejsc zacznie rosnac, warto pozniej przeniesc go do enumu lub bardziej kontrolowanego modelu domenowego.

Wszystkie wpisy slownikow (`warranty_claim_status`, `warranty_claim_priority`, `warranty_claim_category`) sa traktowane jako zarezerwowane — admin moze edytowac etykiety wyswietlane, ale nie moze usuwac wpisow. Zapobiega to osieroceniu kluczy w istniejacych rekordach.

## Acceptance Criteria

- [ ] Istnieje nowy modul `warranty_claims` z encja glowna zgloszenia.
- [ ] Lookupi projektow i podwykonawcow sa zapisane w bazie na podstawie seed JSON.
- [ ] Kategorie, pilnosc i statusy sa dostepne przez `dictionaries`.
- [ ] Uzytkownik moze utworzyc, edytowac i usunac zgloszenie z backoffice.
- [ ] Lista zgloszen obsluguje podstawowe filtry MVP.
- [ ] Podwykonawca jest filtrowany po wybranym projekcie.
- [ ] Status `zakonczone` obsluguje automatyczne `resolved_at`.
- [ ] Kluczowe edge case sa pokryte testami jednostkowymi i integracyjnymi.

## Changelog

| Data | Zmiana |
|------|--------|
| 2026-04-21 | Utworzono skeleton specyfikacji MVP dla pierwszego modulu obslugi zgloszen gwarancyjnych |
| 2026-04-21 | Doprecyzowano podzial na `dictionaries` oraz wlasne encje; usunieto wykonawcow z modelu MVP i pozostawiono tylko podwykonawcow |
| 2026-04-21 | Dodano ustalenia MVP: seed danych, obowiazkowy numer BAS oraz recznie edytowalne daty zgloszenia i rozwiazania |
| 2026-04-21 | Rozszerzono spec do wersji implementacyjnej: architektura, UI flow, edge case, plan prac oraz strategia testow |
