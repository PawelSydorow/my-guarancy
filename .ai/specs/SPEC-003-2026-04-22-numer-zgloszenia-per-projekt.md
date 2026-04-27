# SPEC-003 - Numer zgloszenia per projekt

**Data**: 2026-04-22
**Status**: Draft

## TLDR

Modul `warranty_claims` powinien dostac nowe pole biznesowe `claim_number`, wyswietlane uzytkownikowi jako numer zgloszenia w formacie `001`, `002`, `003` itd. Numer ma byc nadawany automatycznie przy tworzeniu zgloszenia, liczony osobno dla kazdego projektu i niemozliwy do recznej edycji.

Rekomendowane rozwiazanie:
- przechowywac numer jako liczbe calkowita oraz zwracac/formatowac go do postaci trzycyfrowej
- nadawac numer w backendzie, atomowo, w transakcji
- zapewnic unikalnosc numeru w zakresie `organization_id + tenant_id + project_id + claim_number`
- pokazac numer w liscie i formularzu jako pole tylko do odczytu

## Problem Statement

Obecnie zgłoszenie gwarancyjne ma identyfikator techniczny `id`, ale nie ma prostego numeru operacyjnego, ktory:
- jest czytelny dla uzytkownika
- pozwala szybko odnosic sie do konkretnego zgloszenia w ramach projektu
- daje naturalna numeracje typu `001`, `002`, `003`

W praktyce operacyjnej numer zgloszenia:
- jest uzywany w rozmowach i korespondencji
- musi byc stabilny po utworzeniu
- powinien byc czytelny i krotki
- nie powinien byc globalny dla calego systemu, tylko liczony per projekt

Brak takiego pola powoduje:
- koniecznosc poslugiwaniem sie UUID albo BAS-em, ktory nie jest numerem workflow
- brak jasnej kolejnosci zgloszen w ramach projektu
- ryzyko recznego tworzenia "numeracji obok systemu"

## Cel funkcjonalny

System ma:
- automatycznie nadawac numer zgloszenia przy tworzeniu rekordu
- liczyc numeracje osobno dla kazdego projektu
- wyswietlac numer w formacie `001`, `002`, `003` itd.
- blokowac reczna edycje numeru

System nie ma:
- pozwalac na resetowanie numeracji z poziomu UI
- pozwalac na reczne nadpisywanie numeru na create lub edit
- zmieniac numeru po zmianie innych pol zgloszenia

## Ustalenia domenowe

Przyjmujemy nastepujace zasady:
- numer jest nadawany tylko raz, przy tworzeniu zgloszenia
- numer jest unikalny w ramach projektu
- numer nie zmienia sie po utworzeniu rekordu
- numer nie jest recznie edytowalny
- format wyswietlania to minimum 3 cyfry z zerami wiodacymi

Przyklady:
- pierwsze zgloszenie w projekcie A: `001`
- drugie zgloszenie w projekcie A: `002`
- pierwsze zgloszenie w projekcie B: `001`

Wazne:
- `claim_number` nie zastepuje `id`
- `claim_number` nie zastepuje `bas_number`
- `claim_number` jest numerem workflow, a nie numerem technicznym ani numerem zewnetrznego systemu

## Model danych

## Nowe pole encji `WarrantyClaim`

Do encji `WarrantyClaim` nalezy dodac pole:
- `claim_number: integer`

Rekomendacja:
- przechowywac w bazie liczbe, nie sformatowany string
- formatowanie do `001` realizowac w warstwie API/UI helperem

Powody:
- latwiejsze sortowanie i filtrowanie
- brak problemow z porownywaniem `099` vs `100`
- mniejsza podatnosc na niespojnosc danych

## Indeksy i ograniczenia

Nalezy dodac:
- indeks na `claim_number`
- unikalne ograniczenie:
  - `organization_id`
  - `tenant_id`
  - `project_id`
  - `claim_number`

Rekomendowana nazwa constraintu:
- `warranty_claims_claims_scope_project_claim_number_unique`

To ograniczenie jest wymagane, bo sama logika `MAX + 1` bez constraintu nie zabezpiecza przed wyscigiem rownoleglych zapisow.

## Formatowanie numeru

Nalezy dodac helper typu:
- `formatClaimNumber(value: number): string`

Zasada:
- dla liczb `1..999` wyswietlanie jako `001..999`
- dla `1000+` wyswietlanie bez obcinania, np. `1000`

Czyli:
- `1 -> 001`
- `12 -> 012`
- `123 -> 123`
- `1000 -> 1000`

Nie nalezy:
- trzymac `001` jako wartosci surowej w bazie
- ograniczac systemu sztucznie do 999 zgloszen per projekt

## API Contracts

## Create

`POST /api/warranty_claims/claims`

Zasada:
- klient nie przesyla `claim_number`
- backend sam wylicza kolejny numer dla `project_id`

Jesli klient przesle `claim_number` w payloadzie:
- pole powinno zostac zignorowane albo odrzucone walidacyjnie

Rekomendacja:
- odrzucic walidacyjnie jako pole niedozwolone do zapisu z klienta

Powod:
- jawniej komunikuje, ze numer jest kontrolowany przez system

## Update

`PUT /api/warranty_claims/claims/:id`

Zasada:
- `claim_number` nie podlega edycji
- zmiana `project_id` nie moze przeliczac ani modyfikowac `claim_number`

Jesli klient przesle `claim_number`:
- pole powinno zostac zignorowane albo odrzucone

Rekomendacja:
- odrzucic walidacyjnie

## Odpowiedz API

Lista i detail powinny zwracac:
- `claim_number` jako liczbe
- opcjonalnie `claim_number_formatted` jako string, jesli to uproscic UI

Rekomendacja:
- minimalnie zwracac `claim_number`
- formatowanie robic w helperach aplikacyjnych

Jesli zespol chce uniknac duplikacji helpera po stronie frontend/listy:
- mozna dodac tez `claim_number_formatted`

## Generowanie numeru

## Wymagania

Generowanie musi byc:
- per projekt
- atomowe
- odporne na rownolegly create

## Opcja A - `MAX(claim_number) + 1` w transakcji z unikalnym constraintem

To jest wariant najprostszy do wdrozenia.

Przebieg:
1. backend rozpoczyna transakcje
2. odczytuje aktualne `MAX(claim_number)` dla:
   - `organization_id`
   - `tenant_id`
   - `project_id`
3. wylicza `next = max + 1`, a przy braku rekordow `1`
4. probuje zapisac rekord
5. jesli unikalny constraint zwroci konflikt, backend ponawia probe ograniczona liczba razy

Plusy:
- mala zmiana modelu
- nie wymaga dodatkowej tabeli sekwencji

Minusy:
- wymaga retry loop przy wspolbieznosci
- jest mniej eleganckie przy bardzo duzym ruchu

## Opcja B - osobna tabela licznikow per projekt

Przyklad tabeli:
- `warranty_claims_project_counters`

Pola:
- `organization_id`
- `tenant_id`
- `project_id`
- `last_claim_number`

Przebieg:
1. lock/update rekordu licznika dla projektu
2. inkrementacja
3. uzycie wartosci do create zgloszenia

Plusy:
- lepsza kontrola wspolbieznosci
- czystszy model generowania numerow

Minusy:
- dodatkowa encja i migracja
- wiekszy koszt implementacyjny

## Rekomendacja

Dla obecnego etapu projektu rekomendowany jest wariant A:
- `MAX + 1`
- transakcja
- unikalny constraint
- retry przy konflikcie

Powod:
- modul jest na etapie funkcjonalnego rozwoju, nie wysokiego obciazenia
- nie ma jeszcze potrzeby wprowadzania osobnej infrastruktury licznikow

## Zachowanie przy zmianie projektu

Tu trzeba przyjac jasna decyzje domenowa.

Mozliwe warianty:

### Wariant 1 - projekt po utworzeniu mozna nadal zmieniac

Problem:
- `claim_number` byl nadany w ramach starego projektu
- po zmianie projektu numer przestaje odpowiadac numeracji docelowego projektu

To prowadzi do niespojnosci biznesowej.

### Wariant 2 - po utworzeniu rekordu `project_id` jest niemodyfikowalne

To jest wariant rekomendowany.

Powody:
- numer zgloszenia jest liczony per projekt
- projekt staje sie czescia tozsamosci biznesowej rekordu
- upraszcza model i eliminuje niejasnosci

## Rekomendowana decyzja

Wprowadzajac `claim_number` per projekt nalezy jednoczesnie:
- zablokowac edycje `project_id` po utworzeniu rekordu

UI:
- na create projekt jest wybieralny
- na edit projekt jest polem tylko do odczytu albo disabled

Backend:
- `PUT` nie pozwala zmienic `project_id`

Jesli zespol nie chce teraz blokowac edycji projektu, trzeba zaakceptowac jedno z mniej dobrych zachowan:
- numer zostaje historyczny i nie odpowiada nowemu projektowi
- albo system przelicza numer po zmianie projektu, co jest ryzykowne i destabilizuje referencje

Dlatego ta specyfikacja rekomenduje blokade zmiany `project_id` po create.

## UI / UX

## Formularz create

- pole `Numer zgloszenia` moze byc widoczne jako read-only placeholder:
  - `Nadany automatycznie po zapisie`
- alternatywnie mozna go nie pokazywac na create

Rekomendacja:
- pokazac pole read-only

Powod:
- komunikuje uzytkownikowi, ze numer istnieje i jest systemowy

## Formularz edit

- pole `Numer zgloszenia` widoczne jako tylko do odczytu
- wyswietlana wartosc sformatowana, np. `004`
- brak mozliwosci edycji przez UI

## Lista zgloszen

Nalezy dodac kolumne:
- `Numer zgloszenia`

Rekomendacja:
- umiescic ja blisko poczatku listy, np. przed `Tytul`

## Filtry i sortowanie

Nalezy dodac:
- sortowanie po `claim_number`

Opcjonalnie:
- filtr exact po `claim_number`

Rekomendacja MVP:
- dodac sortowanie
- filtr odlozyc, chyba ze uzytkownicy pracuja glownie po numerze

## Walidacja

## Backend

- `claim_number` nie moze byc wymagany od klienta
- `claim_number` nie moze byc ustawiany przez klienta
- `project_id` musi byc obecne przed wyliczeniem numeru

Jesli rekomendacja blokady projektu zostanie przyjeta:
- `project_id` nie moze byc zmienione na `PUT`

## Frontend

- brak editable input dla `claim_number`
- brak wysylki `claim_number` w payloadzie submitu
- przy edycji projektu na istniejacym rekordzie UI nie powinno pozwalac na zmiane wartosci

## Edge Cases

### 1. Pierwsze zgloszenie dla projektu

Oczekiwane:
- dostaje `claim_number = 1`
- UI pokazuje `001`

### 2. Soft delete starego zgloszenia

Decyzja:
- numerow nie reuse'ujemy

Czyli:
- jesli istnialy `001`, `002`, `003`, a `003` zostalo usuniete soft-delete, kolejne ma dostac `004`

Powod:
- numer powinien byc stabilnym identyfikatorem historycznym
- ponowne wykorzystanie numeru mogloby wprowadzic chaos w dokumentach i komunikacji

Wniosek implementacyjny:
- przy liczeniu `MAX(claim_number)` uwzgledniamy takze rekordy soft-deleted, jesli pozostaja w tej samej tabeli

### 3. Rownolegle tworzone dwa zgloszenia w tym samym projekcie

Oczekiwane:
- nie powstaja dwa rekordy z tym samym numerem
- jeden zapis dostaje konflikt i retry
- finalnie numery beda np. `005` i `006`

### 4. Dwa zgloszenia w roznych projektach

Oczekiwane:
- oba moga dostac `001`, jesli sa pierwsze w swoich projektach

### 5. Create nie powiedzie sie walidacyjnie

Oczekiwane:
- numer nie jest "rezerwowany" trwale przed udanym create

W wariancie `MAX + 1` jest to naturalne, jesli numer jest wyliczany dopiero przy finalnym zapisie transakcyjnym.

### 6. Import / seed / test data

Jesli rekordy sa tworzone technicznie poza standardowym create:
- musza rowniez respektowac unikalnosc `project_id + claim_number`

Jesli system bedzie mial import:
- import powinien umiec albo przyjmowac numery jawnie dla migracji historycznej
- albo mapowac rekordy przez standardowa auto-numeracje

To nie jest w zakresie tej iteracji, ale trzeba zostawic te mozliwosc.

## Implementacja - podzial prac

## Faza 1 - model i migracja

Zadania:
1. Dodac `claim_number` do encji `WarrantyClaim`
2. Dodac indeks i unique constraint scope'owany po projekcie
3. Wygenerowac migracje

Done criteria:
- tabela ma nowe pole i zabezpieczenia unikalnosci

## Faza 2 - logika backendu

Zadania:
1. Dodac helper generowania kolejnego numeru per projekt
2. Wpiac go w `POST /claims`
3. Zablokowac mozliwosc ustawiania `claim_number` przez klienta
4. Jesli decyzja zostaje przyjeta, zablokowac zmiane `project_id` na update
5. Dodac retry przy konflikcie unique constraint

Done criteria:
- create nadaje numer automatycznie
- update nie pozwala zmieniac numeru

## Faza 3 - UI

Zadania:
1. Dodac pole `Numer zgloszenia` do formularza
2. Pokazac je jako read-only
3. Dodac kolumne do listy
4. Dodac sortowanie po numerze
5. Zablokowac edycje projektu na edit, jesli ta decyzja zostanie wdrozona

Done criteria:
- uzytkownik widzi numer, ale nie moze go edytowac

## Faza 4 - testy

Zadania:
1. Dodac testy jednostkowe helpera numeracji
2. Dodac testy integracyjne create
3. Dodac testy UI formularza i listy
4. Dodac test wspolbieznosci lub przynajmniej test retry logic

Done criteria:
- numeracja per projekt jest pokryta testami krytycznych scenariuszy

## Test Strategy

## Testy jednostkowe - backend

Pokryc:
- formatowanie `claim_number`
- wyliczanie kolejnego numeru
- brak mozliwosci nadpisania numeru z klienta
- blokade zmiany projektu po create, jesli zostanie przyjeta

Przykladowe testy:
1. brak rekordow dla projektu daje `1`
2. rekordy `1,2,3` daja kolejny `4`
3. rekordy z innych projektow nie wplywaja na numer
4. `formatClaimNumber(1)` zwraca `001`
5. `formatClaimNumber(1000)` zwraca `1000`

## Testy integracyjne - backend

Pokryc:
- `POST` tworzy rekord z `claim_number = 1` dla pierwszego projektu
- dwa kolejne `POST` w tym samym projekcie daja `1`, `2`
- `POST` w innym projekcie zaczyna od `1`
- `PUT` z probą zmiany `claim_number` zwraca blad lub ignoruje pole zgodnie z finalna decyzja
- `PUT` z probą zmiany `project_id` zwraca blad, jesli ta decyzja zostanie wdrozona
- soft-deleted rekord nie powoduje reuse numeru

## Testy frontendowe

Pokryc:
- create pokazuje placeholder "nadany automatycznie po zapisie"
- edit pokazuje sformatowany numer
- submit nie wysyla `claim_number`
- projekt na edit jest nieedytowalny, jesli wdrazamy blokade

## Testy e2e / manualne

Scenariusz 1:
1. utworz zgloszenie w projekcie A
2. zapisz
3. sprawdz, ze ma numer `001`

Scenariusz 2:
1. utworz drugie zgloszenie w projekcie A
2. sprawdz, ze ma numer `002`

Scenariusz 3:
1. utworz zgloszenie w projekcie B
2. sprawdz, ze ma numer `001`

Scenariusz 4:
1. otworz edycje istniejacego zgloszenia
2. sprawdz, ze pole numeru jest tylko do odczytu
3. sprawdz, ze projektu nie da sie zmienic, jesli ta decyzja zostala wdrozona

## Ryzyka i decyzje architektoniczne

### Ryzyko 1 - wspolbieznosc

Najwazniejsze ryzyko to nadanie tego samego numeru dwu rownoleglym create w tym samym projekcie.

Mitigacja:
- unique constraint
- transakcja
- retry

### Ryzyko 2 - zmiana projektu po utworzeniu

Jesli rekord moze zmieniac projekt, numer per projekt staje sie semantycznie niejednoznaczny.

Rekomendacja:
- zablokowac zmiane `project_id` po create

### Ryzyko 3 - mylenie z `bas_number`

Uzytkownicy moga traktowac `bas_number` i `claim_number` jako to samo.

Mitigacja:
- w UI nazwac pole jednoznacznie `Numer zgloszenia`
- pozostawic `Numer BAS` jako osobne pole

## Acceptance Criteria

- [ ] Encja `WarrantyClaim` ma pole `claim_number`.
- [ ] `claim_number` jest nadawany automatycznie tylko przy tworzeniu rekordu.
- [ ] Numeracja jest liczona osobno dla kazdego projektu.
- [ ] Numer jest unikalny w zakresie `organization_id + tenant_id + project_id + claim_number`.
- [ ] UI pokazuje numer w formacie `001`, `002`, `003` itd.
- [ ] Uzytkownik nie moze edytowac `claim_number`.
- [ ] Soft delete nie powoduje ponownego wykorzystania starego numeru.
- [ ] Krytyczne scenariusze wspolbieznosci sa zabezpieczone.
- [ ] Jesli wdrazamy rekomendacje domenowa, `project_id` nie moze byc zmienione po utworzeniu rekordu.

## Otwarte pytania

1. Czy odpowiedz API ma zwracac tylko `claim_number`, czy tez gotowe `claim_number_formatted`?
2. Czy projekt po utworzeniu rekordu ma byc formalnie zablokowany do edycji od razu w tej samej iteracji?
3. Czy filtr po `Numerze zgloszenia` jest potrzebny od razu, czy wystarczy kolumna i sortowanie?

## Changelog

| Data | Zmiana |
|------|--------|
| 2026-04-22 | Utworzono specyfikacje dla pola `Numer zgloszenia` numerowanego automatycznie per projekt |
