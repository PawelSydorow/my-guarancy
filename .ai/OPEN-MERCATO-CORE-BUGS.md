# Open Mercato Core Bugs

Lokalny backlog problemow wykrytych w integracji z `@open-mercato/*`.

Cel:
- miec jedno miejsce na wpisy do zgloszenia upstream,
- zapisac kroki odtworzenia, aktualne zachowanie i oczekiwany rezultat,
- odroznic bug core od lokalnego workaroundu w module aplikacji.

## Bug 001: `CrudForm` wymusza autofocus pierwszego pola i powoduje flicker na `combobox`

Status:
- otwarte
- lokalny workaround wdrozony w `warranty_claims`
- bez zmian w core

Obszar:
- `@open-mercato/ui`
- `CrudForm`
- initial focus

Jak odtworzyc:
1. Otworz ekran tworzenia rekordu oparty o `CrudForm`.
2. Ustaw jako pierwsze pole formularza `type: 'custom'` z kontrolka typu `combobox`.
3. Wejdz na strone create bez wczesniejszej interakcji z formularzem.
4. Pierwsze pole dostanie focus automatycznie.
5. Dla `combobox` widac krotkie mrugniecie lub niepozadany focus przy ladowaniu ekranu.

Aktualny przyklad w aplikacji:
- modul `warranty_claims`
- formularz: [WarrantyClaimForm.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/warranty_claims/components/WarrantyClaimForm.tsx)
- przypadek: pierwsze pole `Projekt`

Aktualne zachowanie:
- `CrudForm` po zaladowaniu ustawia focus na pierwszym widocznym polu,
- przy polach interaktywnych, zwlaszcza `combobox`, daje to efekt wizualnego flickera,
- host nie ma prostego sposobu, zeby wylaczyc to zachowanie.

Oczekiwane zachowanie:
- autofocus pierwszego pola powinien byc opcjonalny,
- host formularza powinien moc wylaczyc initial focus,
- `CrudForm` nie powinien wymuszac focusa na polach, ktore maja wlasna logike otwierania,
- kontrolki typu `combobox` nie powinny migac przy wejsciu na ekran.

Co dzis zrobiono lokalnie:
- w `warranty_claims` zastosowano lokalny workaround bez modyfikowania core,
- pierwszy widoczny input nie jest juz bezposrednim celem autofocusa,
- rozwiazanie jest celowo lokalne, zeby update `open-mercato` nie nadpisywal zmian.

Rekomendacja do upstream:
- dodac do `CrudForm` opcje typu `disableInitialFocus`,
- albo ograniczyc autofocus do prostych pol (`text`, `textarea`, `select`),
- albo przeniesc decyzje o autofocusie do hosta formularza.

## Bug 002: kontrakt payloadu CRUD jest niespojny miedzy warstwami `snake_case` i `camelCase`

Status:
- otwarte
- lokalny workaround wdrozony w `warranty_claims`
- wymaga doprecyzowania kontraktu na granicy API/UI

Obszar:
- `@open-mercato/shared`
- `@open-mercato/ui`
- CRUD route payload shape
- mapowanie pol w frontendzie

Jak odtworzyc:
1. Zbuduj modul CRUD, w ktorym backend serializer zwraca rekordy w `snake_case`.
2. Oprzyj frontend formularza i tabeli o te pola, np. `project_id`, `status_key`, `bas_number`.
3. Otworz liste lub edycje rekordu przez standardowe helpery frontendowe (`fetchCrudList`, `CrudForm`, `DataTable`).
4. W czesci sciezek lub warstw posrednich payload moze pojawic sie w `camelCase`, np. `projectId`, `statusKey`, `basNumber`.
5. Jesli frontend oczekuje wylacznie `snake_case`, pola na liscie i w formularzu moga wygladac na puste mimo poprawnych danych w bazie.

Aktualny przyklad w aplikacji:
- modul `warranty_claims`
- tabela: [WarrantyClaimsTable.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/warranty_claims/components/WarrantyClaimsTable.tsx)
- formularz: [WarrantyClaimForm.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/warranty_claims/components/WarrantyClaimForm.tsx)
- normalizacja lokalna: [types.ts](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/warranty_claims/types.ts)

Aktualne zachowanie:
- zapis do bazy dziala poprawnie,
- API zwraca pelne dane rekordu,
- frontend moze dostac shape z innym nazewnictwem niz zaklada komponent,
- skutkiem sa puste wartosci na liscie i w formularzu edycji.

Oczekiwane zachowanie:
- payload CRUD powinien miec jeden stabilny kontrakt nazewniczy na granicy API/UI,
- frontend nie powinien zgadywac, czy przyjdzie `snake_case`, czy `camelCase`,
- helpery CRUD i komponenty UI powinny konsumowac spojny format odpowiedzi.

Co dzis zrobiono lokalnie:
- w `warranty_claims` dodano lokalna normalizacje rekordow, ktora toleruje oba formaty,
- frontend mapuje teraz zarowno `snake_case`, jak i `camelCase`,
- rozwiazanie jest odporne na obecny stan runtime, ale to obejscie, nie naprawa zrodla.

Rekomendacja do upstream:
- zdefiniowac jeden obowiazujacy format payloadu dla CRUD response,
- upewnic sie, ze wszystkie sciezki `makeCrudRoute`, serializacja i helpery frontendowe zwracaja ten sam shape,
- jesli framework dopuszcza oba formaty, powinien robic to jawnie i konsekwentnie.

## Bug 003: `DataTable` nie wspiera recznego resize kolumn ani persystencji szerokosci

Status:
- otwarte
- lokalny workaround wdrozony w `warranty_claims` przez `meta.maxWidth`
- brak wsparcia dla user-driven column sizing

Obszar:
- `@open-mercato/ui`
- `DataTable`
- column sizing
- persystencja ustawien uzytkownika

Jak odtworzyc:
1. Otworz tabele oparta o `DataTable`.
2. Sprobuj rozszerzyc kolumne recznie mysza.
3. Sprawdz, czy szerokosc kolumny da sie zmienic interaktywnie.
4. Odswiez ekran i sprawdz, czy szerokosc kolumny jest zapamietana.

Aktualne zachowanie:
- `DataTable` wspiera persystencje kolejnosci kolumn, widocznosci, sortowania i filtrow,
- nie ma widocznego wsparcia dla recznego resize kolumn przez uzytkownika,
- nie ma tez persystencji szerokosci kolumn w perspectives lub snapshot,
- dla dlugich pol host musi ratowac sie lokalnie przez `meta.maxWidth` i truncation config.

Aktualny przyklad w aplikacji:
- modul `warranty_claims`
- tabela: [WarrantyClaimsTable.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/warranty_claims/components/WarrantyClaimsTable.tsx)
- przypadek: kolumna `Projekt` wymaga lokalnego poszerzenia przez `meta.maxWidth`

Oczekiwane zachowanie:
- uzytkownik powinien moc recznie zmieniac szerokosc kolumn,
- szerokosci powinny dac sie zapisac razem z perspektywa tabeli albo lokalnym snapshotem,
- host nadal powinien moc podawac sensowne domyslne wartosci z kodu.

Co dzis zrobiono lokalnie:
- w `warranty_claims` zwiekszono szerokosc obciecia kolumny `Projekt` przez `meta.maxWidth`,
- poprawia to czytelnosc jednej kolumny, ale nie rozwiazuje ogolnie resize i persystencji.

Rekomendacja do upstream:
- dodac wsparcie dla `columnSizing` / `onColumnSizingChange`,
- dodac UI do resize kolumn,
- zapisywac szerokosci kolumn w perspective settings lub snapshot storage.

## Bug 004: formularz create/edit user nie wystawia pola `name`, mimo ze encja `User` je posiada

Status:
- otwarte
- brak lokalnej poprawki
- ograniczenie core auth UI

Obszar:
- `@open-mercato/core`
- auth
- backend users create/edit

Jak odtworzyc:
1. Wejdz na liste uzytkownikow w backendzie: `/backend/users`.
2. Otworz tworzenie nowego uzytkownika albo edycje istniejacego rekordu.
3. Sprawdz pola formularza.
4. Zobaczysz pola typu `email`, `password`, `tenant`, `organization`, `roles`.
5. Nie ma pola `name`, mimo ze lookupi i encja `User` potrafia z niego korzystac.

Aktualny przyklad w aplikacji:
- route manifest: [.mercato/generated/backend-routes.generated.ts](/c:/Development/Project/MyGuarancy/my-guarancy/.mercato/generated/backend-routes.generated.ts)
- edit page: [page.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/node_modules/@open-mercato/core/src/modules/auth/backend/users/[id]/edit/page.tsx)
- create page: [page.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/node_modules/@open-mercato/core/src/modules/auth/backend/users/create/page.tsx)
- encja `User`: [entities.ts](/c:/Development/Project/MyGuarancy/my-guarancy/node_modules/@open-mercato/core/src/modules/auth/data/entities.ts)

Aktualne zachowanie:
- core ma ekran listy, create i edit dla uzytkownikow,
- encja `User` ma pole `name`,
- formularz create/edit nie pozwala ustawic ani edytowac `name`,
- admin nie moze ustawic pelnej nazwy uzytkownika,
- moduly korzystajace z lookupow userow wpadaja wtedy na `email` jako fallback.

Oczekiwane zachowanie:
- formularz create/edit user powinien wystawiac pole `name`,
- admin powinien moc ustawic nazwe wyswietlana uzytkownika bez zmian w bazie z zewnatrz,
- lookupi userow powinny miec sensowne dane do wyswietlania juz z poziomu standardowego core UI.

Co dzis zrobiono lokalnie:
- nic w core nie bylo zmieniane,
- w `warranty_claims` lookup uzytkownika nadal korzysta z `name ?? email`,
- brak `name` na UI pozostaje problemem upstream.

Rekomendacja do upstream:
- dodac pole `name` do formularza create/edit user,
- upewnic sie, ze API listy i detalu usera zwraca je konsekwentnie,
- rozwazyc pokazanie `name` takze na liscie uzytkownikow i w standardowych lookupach auth.

## Bug 005: `ComboboxInput` mruga przy otwieraniu listy sugestii w formularzach z dynamicznym lookupiem

Status:
- otwarte
- lokalny workaround wdrozony w `warranty_claims` bez zmiany kontrolki
- bez zmian w core/UI

Obszar:
- `@open-mercato/ui`
- `ComboboxInput`
- zachowanie `focus` / `blur` przy asynchronicznych sugestiach

Jak odtworzyc:
1. Otworz ekran edycji rekordu oparty o `CrudForm`.
2. Ustaw pole jako `ComboboxInput` z `loadSuggestions`.
3. Wejdz w pole i poczekaj na sugestie.
4. Lista pojawia sie, znika i pojawia ponownie albo mruga przy pierwszym otwarciu.

Aktualny przyklad w aplikacji:
- modul `warranty_claims`
- pole: `Przypisana osoba`
- ekran: formularz [WarrantyClaimForm.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/warranty_claims/components/WarrantyClaimForm.tsx)

Aktualne zachowanie:
- `ComboboxInput` opiera sie na wlasnym stanie `focus` / `blur` i debounce dla `loadSuggestions`,
- przy niektorych hostach formularza daje to efekt migniecia listy,
- uzytkownik widzi stabilny dropdown dopiero po chwili albo po drugim podejsciu.

Oczekiwane zachowanie:
- dropdown powinien otwierac sie stabilnie za pierwszym razem,
- lista nie powinna migac przy inicjalnym focusie,
- klikniecie opcji nie powinno powodowac dodatkowego zamkniecia i ponownego otwarcia.

Co dzis zrobiono lokalnie:
- w `warranty_claims` pole `Przypisana osoba` nadal korzysta z `ComboboxInput`,
- dla tego pola podawane sa preloaded sugestie z lookupow, bez async `loadSuggestions`,
- to omija problem bez potrzeby modyfikowania core/UI i bez zmiany kontrolki,
- inne pola pozostaly bez zmian.

Rekomendacja do upstream:
- poprawic model otwierania i zamykania w `ComboboxInput`,
- nie zamykac listy tylko dlatego, ze input traci focus podczas wyboru z listy,
- pokazac loading stan natychmiast po aktywacji pola, jesli `loadSuggestions` jest asynchroniczne.

## Feature 001: portal klienta jako osobny obszar potrzebuje odpowiednika backendowego `DataTable`

Status:
- do zgloszenia upstream
- brak lokalnej implementacji w core

Obszar:
- `@open-mercato/core`
- `@open-mercato/ui`
- portal klienta
- tabele list
- filtrowanie, sortowanie, paginacja, akcje wierszy

Opis:
- portal klienta jest osobnym obszarem od backoffice i ma inny model uprawnien oraz UX,
- obecnie backendowy `DataTable` daje gotowe kontrolki dla backoffice,
- w portalu brakuje analogicznych, gotowych komponentow albo neutralnego wariantu tabeli,
- przez to kazdy modul portalowy musi budowac liste recznie albo kopiowac logike z backendu.

Aktualny przyklad w aplikacji:
- modul `warranty_claims`
- portal: [PortalClaimsTable.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/warranty_claims/components/portal/PortalClaimsTable.tsx)
- backoffice: [WarrantyClaimsTable.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/warranty_claims/components/WarrantyClaimsTable.tsx)

Aktualne zachowanie:
- backend ma gotowy `DataTable` z filtrami, sortowaniem, perspektywami, eksportem i akcjami,
- portal korzysta z recznie zlozonej tabeli HTML + lokalnych filtrow,
- brak wspolnego, portalowego odpowiednika dla gotowych kontrolek listy,
- brak osobnego, wspieranego przez core UI obszaru dla customer portal lists.

Oczekiwane zachowanie:
- portal klienta powinien miec osobny, wspierany zestaw kontrolek do tabel list,
- powinny byc dostepne co najmniej: filtrowanie, sortowanie, paginacja, stany pusty/ladowanie, podstawowe akcje wiersza,
- komponenty powinny byc dopasowane do portalu, a nie przenosic wprost backendowego chrome,
- najlepiej jako osobny `portal DataTable` albo neutralny `TableList` z wariantami backend/portal.

Rekomendacja do upstream:
- wydzielic wspolny, neutralny komponent listy, ktory mozna stylowac dla backoffice i portalu,
- albo dodac portalowy odpowiednik `DataTable` bez backendowych zaleznosci typu perspectives, exports i injection handles,
- udokumentowac portal jako osobny obszar UI, a nie tylko lzejszy backoffice.

## Bug 006: brak gotowych kontrolek listy w portalu zmusza do recznej implementacji filtrowania i tabel

Status:
- do zgloszenia upstream
- obecnie obejscie lokalne w module `warranty_claims`

Obszar:
- `@open-mercato/ui`
- `@open-mercato/core`
- portal klienta
- filtrowanie list
- tabela wynikow

Jak odtworzyc:
1. Otworz dowolny ekran listy w portalu klienta.
2. Porownaj go z odpowiednikiem w backoffice opartym o `DataTable`.
3. Sprawdz, czy portal ma gotowe komponenty dla filtrow, sortowania i akcji wiersza.
4. Zauwazysz, ze portalowy ekran trzeba skladac recznie z prymitywow HTML albo osobnych komponentow.

Aktualne zachowanie:
- backoffice ma gotowy zestaw kontrolek listy w `DataTable`,
- portal nie ma rownowaznego, gotowego zestawu komponentow,
- modul musi reimplementowac paging, filtry, sortowanie i stany pusty/ladowanie,
- to prowadzi do duplikacji logiki i rozjazdu UX miedzy portalem a backoffice.

Oczekiwane zachowanie:
- portal powinien miec gotowy, wspierany zestaw kontrolek listy,
- komponenty powinny byc dostepne jako portal-first albo neutralne, ale bez zaleznosci od backendowego chrome,
- filtry i tabela powinny byc budowane z tego samego standardu co reszta UI, zamiast byc pisane od zera.

Rekomendacja do upstream:
- dodac portalowy odpowiednik listy z podstawowym zestawem kontroli,
- wyciagnac wspolne mechanizmy filtrowania i paginacji do warstwy wspolnej,
- traktowac portal jako osobny target UI, a nie jako wariant backoffice.
