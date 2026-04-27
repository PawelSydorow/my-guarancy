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

## Feature 002: portal login potrzebuje osobnego extension pointu w core auth, zeby core dostarczal formularz, a portal tylko wstrzykiwal wlasny UI

Status:
- do zgloszenia upstream
- lokalny portalowy login dziala jako adapter, ale nadal wymaga osobnego entrypointu

Obszar:
- `@open-mercato/core`
- `@open-mercato/ui`
- auth login
- portal login
- component replacement / extension points

Opis:
- obecny login staffowy `/<login>` ma juz stabilny extension point (`section:auth.login.form` oraz `auth.login:form`),
- portal klienta ma osobny route `/<orgSlug>/portal/login`,
- portal potrzebuje swojego core'owego entrypointu, ktory zwraca formularz i flow auth, ale pozwala hostowi podmienic chrome, layout i branding,
- bez takiego hooka portalowy login zaczyna zycie jako lokalny adapter, a nie jako warstwa zasilana z core, co zwieksza koszt utrzymania i ryzyko rozjazdu po aktualizacji.

Po co to jest:
- zeby core byl single source of truth dla logiki logowania, walidacji, etapow i przyszlych krokow typu 2FA,
- zeby portal mial wlasny UI shell, ale nie musial reimplementowac formularza ani flow auth,
- zeby aktualizacje `@open-mercato/core` dla loginu automatycznie przenosily sie na portal,
- zeby branding, layout i kosmetyka pozostaly po stronie hosta, a nie w forku formularza.

Jakie daje mozliwosci:
- `/<login>` moze dalej korzystac z core login flow i standardowych override'ow,
- `/<orgSlug>/portal/login` moze dostac osobny portalowy extension point z tym samym core'owym kontraktem formularza,
- host aplikacji moze wstrzyknac wlasny UI shell, ale nie musi kopiowac logiki logowania,
- przyszle zmiany layoutu, stanow bledow, krokow autoryzacji i inputow moga byc wdrazane w core raz i odziedziczone przez portal.

Aktualny przyklad w aplikacji:
- staff login: [login.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/node_modules/@open-mercato/core/src/modules/auth/frontend/login.tsx)
- portal login lokalny adapter: [page.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/portal/frontend/%5BorgSlug%5D/portal/login/page.tsx)
- wspolny BREMER wrapper: [BremerAuthPanel.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/components/login/BremerAuthPanel.tsx)

Aktualne zachowanie:
- staffowy login korzysta z core formularza i istniejacego hooka replacement,
- portalowy login korzysta z lokalnego adaptera i osobnego submitu do `customer_accounts/login`,
- to dziala funkcjonalnie, ale nie daje pelnej odpornosci na zmiany core loginu,
- bez dodatkowego portalowego extension pointu portalowe UI i flow moga dryfowac od core.

Oczekiwane zachowanie:
- core powinien wystawiac osobny, publiczny portalowy extension point dla loginu,
- portal auth powinien moc podpiac core'owy formularz i flow bez lokalnej kopii,
- host powinien moc dostarczyc wlasny UI shell i branding bez kopiowania logiki auth,
- nowy extension point nie powinien psuc istniejacego staffowego loginu.

Rekomendacja do upstream:
- dodac portalowy handle typu `section:auth.portal.login.form` albo rownowazny `portal.login:form`,
- pozwolic na oddzielny wrapper/replacement dla portal loginu, ale z tym samym kontraktem propsow co staff login,
- utrzymac wspolny core'owy kontrakt formularza i flow, a rozdzielic tylko UI shell oraz branding hosta.

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

## Bug 007: po zalogowaniu backend sidebar przez chwile pokazuje stare menu zanim pojawi sie docelowy stan

Status:
- otwarte
- widoczne jako flicker / problem UX
- bez lokalnej poprawki w core

Obszar:
- `@open-mercato/ui`
- backend shell
- `AppShell`
- `BackendChromeProvider`
- client-side bootstrap menu/widget registry

Jak odtworzyc:
1. Zaloguj sie do backendu.
2. Obserwuj sidebar w pierwszych sekundach po zalogowaniu.
3. Przez chwile widoczne jest starsze albo domyslne menu.
4. Po doladowaniu chrome, widgetow i stanu klienta sidebar przechodzi w docelowy wyglad.

Aktualny przyklad w aplikacji:
- backend layout: [layout.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/app/(backend)/backend/layout.tsx)
- shell UI: [AppShell.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/node_modules/@open-mercato/ui/src/backend/AppShell.tsx)
- chrome provider: [BackendChromeProvider.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/node_modules/@open-mercato/ui/src/backend/BackendChromeProvider.tsx)
- client bootstrap: [ClientBootstrap.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/components/ClientBootstrap.tsx)

Aktualne zachowanie:
- backend layout przekazuje `adminNavApi="/api/auth/admin/nav"` do `AppShell`,
- `BackendChromeProvider` pobiera chrome po stronie klienta,
- `AppShell` startuje z poczatkowym stanem sidebaru i dopiero potem synchronizuje `navGroups`,
- widgety i override'y sa rejestrowane w clientowym bootstrapie,
- w efekcie widac krotki flash starego lub domyslnego menu po loginie.

Oczekiwane zachowanie:
- po zalogowaniu powinien od razu byc widoczny finalny stan menu,
- nie powinno byc przejsciowego renderu starego sidebaru,
- jesli dane chrome nie sa jeszcze gotowe, shell powinien pokazac loading/skeleton zamiast zmieniac menu po fakcie.

Co dzis zrobiono lokalnie:
- nic w core nie bylo jeszcze poprawiane,
- problem zostal opisany jako bug UX / flicker po hydracji,
- lokalne obejscie nie zostalo wdrozone.

Rekomendacja do upstream:
- rozwazyc SSR lub wczesniejsze podanie chrome dla backend shell,
- albo ukrywac sidebar do czasu `isChromeReady`,
- albo pokazac stan loading zamiast renderowac pierwszy, nietrafiony stan menu.

## Bug 008: `server dev` automatycznie startuje scheduler nawet gdy host wyłącza moduł `scheduler`

Status:
- otwarte
- lokalny workaround wdrozony w `scripts/dev-runtime.mjs`
- bez zmiany w `@open-mercato/cli`

Obszar:
- `@open-mercato/cli`
- `server dev`
- `server start`
- auto-start background services

Jak odtworzyc:
1. Zakomentuj modul `scheduler` w [src/modules.ts](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules.ts).
2. Uruchom `yarn dev`.
3. `server dev` dalej probuje wystartowac workerow i scheduler.
4. Runtime konczy sie bledem `Module not found: "scheduler"`.

Aktualny przyklad w aplikacji:
- standalone dev runtime: [dev-runtime.mjs](/c:/Development/Project/MyGuarancy/my-guarancy/scripts/dev-runtime.mjs)
- host modules: [modules.ts](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules.ts)

Aktualne zachowanie:
- `server dev` i `server start` w `@open-mercato/cli` automatycznie uruchamiaja `queue:worker --all`,
- dodatkowo uruchamiaja `scheduler start` przy lokalnej strategii kolejek,
- host nie ma prostego przełącznika, zeby wylaczyc scheduler tylko dla tego uruchomienia,
- przy wyłączonym module `scheduler` runtime wywala sie mimo ze sam app shell moglby dzialac dalej.

Oczekiwane zachowanie:
- host powinien moc wylaczyc auto-start scheduler i workerow bez patchowania CLI,
- `server dev` nie powinien zakladac, ze modul `scheduler` istnieje,
- wyłączenie pojedynczego modułu nie powinno zabijac calego runtime, jesli nie jest on krytyczny.

Co dzis zrobiono lokalnie:
- w [dev-runtime.mjs](/c:/Development/Project/MyGuarancy/my-guarancy/scripts/dev-runtime.mjs) dodano `AUTO_SPAWN_WORKERS=false` i `AUTO_SPAWN_SCHEDULER=false` dla `server dev/start`,
- dzieki temu standalone app moze wystartowac bez modulu `scheduler`,
- workaround jest lokalny i nie zmienia zachowania upstream CLI.

Rekomendacja do upstream:
- dodac oficjalny flag/env do wylaczania auto-spawnowania workerow i schedulera dla `server dev/start`,
- albo nie uruchamiac schedulera, jesli odpowiadajacy modul nie jest aktywny w `src/modules.ts`,
- albo traktowac brak `scheduler` jako niekrytyczny warunek w dev runtime zamiast twardego faila.


# Core Bug: Warranty claim combobox cannot be cleared

**Status:** open  
**Area:** `@open-mercato/ui` / warranty claims form  
**Priority:** medium  

## Problem
In the warranty claim form, the comboboxes for:
- assigned user
- subcontractor

do not behave as clearable fields.

When a user removes the selected value, the control restores the previous value instead of staying empty. In practice this makes reassignment impossible without reloading or working around the UI.

## Expected behavior
- The selected value can be cleared.
- Clearing the field should leave the form value empty/null.
- The combobox should expose a visible clear action when a value is present.

## Impact
- Blocks reassignment of responsible user and subcontractor on warranty claims.
- Causes confusing UI behavior because the value appears removed and then reappears.

## Scope
- Core shared combobox behavior in `@open-mercato/ui` should support clearing selected values.
- Warranty claim form should use the shared clearable behavior instead of a custom workaround when the shared component is fixed.

## Notes
- The current workaround is implemented locally in the warranty claims module.
- This ticket should be used to move the behavior into the shared core UI package and remove the module-specific copy later.

---

# Core Feature: Portal password reset for customers

**Status:** open  
**Area:** `@open-mercato/core` / customer portal authentication  
**Priority:** high  
**Related spec:** SPEC-004 — Portal Klienta: Zgłoszenia Gwarancyjne

## Problem
The customer portal currently provides login but lacks a password reset flow. When a customer forgets their password, there is no way to recover access to the portal. The backend APIs exist (`POST /api/customer_accounts/password/reset-request` and `POST /api/customer_accounts/password/reset-confirm`), but the frontend UI and routing are not implemented.

## Expected behavior
- Customer can click "Forgot password?" link on the portal login page: `/<orgSlug>/portal/login`
- Portal provides password reset pages:
  - `/<orgSlug>/portal/password-reset` — request password reset email
  - `/<orgSlug>/portal/password-reset/[token]` — confirm reset with new password
- Reset pages use the same `BremerAuthPanel` branding as the login page
- Reset emails are sent to the customer's registered email address
- Token validation and password update flow completes successfully

## Expected UI flow
1. Customer on `/<orgSlug>/portal/login` clicks "Forgot your password?" link
2. Redirected to `/<orgSlug>/portal/password-reset`
3. Enters email address, receives reset link via email
4. Clicks link in email (with token) → `/<orgSlug>/portal/password-reset/[token]`
5. Enters new password, confirms reset
6. Redirected to login with success message
7. Can now log in with new password

## Impact
- Blocks customer self-service password recovery
- Forces support team to manually reset passwords or provide workarounds
- Reduces portal usability and increases support burden

## Scope
- Frontend pages: `src/modules/portal/frontend/[orgSlug]/portal/password-reset/` (request + confirm)
- Link integration: Update `src/modules/portal/frontend/[orgSlug]/portal/login/page.tsx`
- Use existing backend APIs from `@open-mercato/core` (no backend work needed)
- Follow `BremerAuthPanel` branding pattern for consistency with backoffice auth

## Notes
- Backend password reset APIs are already implemented and tested
- Reference backoffice password reset for implementation patterns
- Should integrate with existing email template system in core
- Token expiry handling should follow core defaults
