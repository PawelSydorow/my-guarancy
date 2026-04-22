# Open Mercato Core Bugs

Lokalny backlog problemow wykrytych w integracji z `@open-mercato/*`.

Cel:
- miec jedno miejsce na bugi do zgloszenia upstream,
- zapisac reprodukcje i oczekiwane zachowanie,
- odroznic bug core od lokalnego workaroundu w module aplikacji.

## Bug 001: `CrudForm` autofocus powoduje widoczny flicker pierwszego `combobox`

Status:
- otwarte
- lokalny workaround wdrozony w `warranty_claims`
- bez zmian w core

Obszar:
- `@open-mercato/ui`
- `CrudForm`
- auto focus pierwszego pola formularza

Jak odtworzyc:
1. Otworz ekran tworzenia nowego rekordu oparty o `CrudForm`.
2. Ustaw jako pierwsze pole formularza `type: 'custom'` z inputem typu `combobox`, albo pole, ktore renderuje input tekstowy z wlasnym stanem dropdownu.
3. Wejdz na strone create bez wczesniejszej interakcji z formularzem.
4. Zobaczysz, ze pierwsze pole dostaje focus automatycznie.
5. Dla `combobox` wyglada to jak krotkie mrugniecie lub wejscie focusa w input zaraz po zaladowaniu ekranu.

Aktualny przyklad w aplikacji:
- modul `warranty_claims`
- formularz: [WarrantyClaimForm.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/warranty_claims/components/WarrantyClaimForm.tsx)
- przypadek: pierwsze pole `Projekt`

Aktualne zachowanie:
- `CrudForm` po zaladowaniu ustawia focus na pierwszym polu formularza,
- przy polach typu `combobox` daje to niepozadany efekt wizualny,
- uzytkownik widzi flicker nawet wtedy, gdy ekran nie powinien wymuszac focusa.

Oczekiwane zachowanie:
- autofocus pierwszego pola powinien byc opcjonalny,
- host formularza powinien moc wylaczyc initial focus,
- `CrudForm` nie powinien wymuszac focusa na polach interaktywnych, jesli ekran nie potrzebuje takiego zachowania,
- szczegolnie dla `combobox` i podobnych kontrolek nie powinno byc widocznego flickera przy wejsciu na ekran.

Co dzis zrobiono lokalnie:
- w `warranty_claims` zastosowano lokalny workaround bez modyfikowania core,
- pierwszy widoczny input nie jest juz bezposrednim celem autofocusa,
- rozwiazanie jest celowo lokalne, zeby update `open-mercato` nie nadpisywal zmian.

Rekomendacja do upstream:
- dodac do `CrudForm` opcje w stylu `disableInitialFocus`,
- albo ograniczyc autofocus do prostych pol (`text`, `textarea`, `select`) i nie wymuszac go dla `custom` / `combobox`,
- albo przeniesc decyzje o autofocusie do hosta formularza.

## Bug 002: niespojny kontrakt payloadu listy/rekordu miedzy warstwami CRUD i frontendem

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
5. Jesli frontend oczekuje wylacznie `snake_case`, pola na liscie i w edycji wygladaja na puste mimo poprawnych danych w bazie i poprawnej odpowiedzi API.

Aktualny przyklad w aplikacji:
- modul `warranty_claims`
- tabela: [WarrantyClaimsTable.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/warranty_claims/components/WarrantyClaimsTable.tsx)
- formularz: [WarrantyClaimForm.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/warranty_claims/components/WarrantyClaimForm.tsx)
- normalizacja lokalna: [types.ts](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/warranty_claims/types.ts)

Aktualne zachowanie:
- zapis do bazy dziala poprawnie,
- API potrafi zwrocic pelne dane rekordu,
- ale frontend moze dostac shape z innym nazewnictwem niz zaklada kod komponentu,
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
- jesli framework dopuszcza oba formaty, powinien robic to jawnie i konsekwentnie, a nie zaleznie od sciezki wykonania.

## Bug 003: `DataTable` nie wspiera recznego resize kolumn ani persystencji ich szerokosci

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
- nie ma tez persystencji szerokosci kolumn w perspectives/snapshot,
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
- to poprawia czytelnosc jednej kolumny, ale nie rozwiazuje ogolnie resize i persystencji.

Rekomendacja do upstream:
- dodac wsparcie dla `columnSizing` / `onColumnSizingChange`,
- dodac UI do resize kolumn,
- zapisywac szerokosci kolumn w perspective settings lub snapshot storage.

## Bug 004: ekran create/edit user nie wystawia pola `name`, mimo ze encja `User` je posiada

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
- w efekcie na UI admin nie da sie ustawic pelnej nazwy uzytkownika,
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
- upewnic sie, ze API listy/detalu usera zwraca je konsekwentnie,
- rozwazyc pokazanie `name` takze na liscie uzytkownikow i w standardowych lookupach auth.
