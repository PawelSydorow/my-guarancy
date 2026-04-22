# Open Mercato Core Bugs

Lokalny backlog problemów wykrytych w integracji z `@open-mercato/*`.

Cel:
- mieć jedno miejsce na bugi do zgłoszenia upstream,
- zapisać reprodukcję i oczekiwane zachowanie,
- odróżnić bug core od lokalnego workaroundu w module aplikacji.

## Bug 001: `CrudForm` autofocus powoduje widoczny flicker pierwszego `combobox`

Status:
- otwarte
- lokalny workaround wdrożony w `warranty_claims`
- bez zmian w core

Obszar:
- `@open-mercato/ui`
- `CrudForm`
- auto focus pierwszego pola formularza

Jak odtworzyć:
1. Otwórz ekran tworzenia nowego rekordu oparty o `CrudForm`.
2. Ustaw jako pierwsze pole formularza `type: 'custom'` z inputem typu `combobox`, albo pole, które renderuje input tekstowy z własnym stanem dropdownu.
3. Wejdź na stronę create bez wcześniejszej interakcji z formularzem.
4. Zobaczysz, że pierwsze pole dostaje focus automatycznie.
5. Dla `combobox` wygląda to jak krótkie mrugnięcie lub wejście focusa w input zaraz po załadowaniu ekranu.

Aktualny przykład w aplikacji:
- moduł `warranty_claims`
- formularz: [WarrantyClaimForm.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/warranty_claims/components/WarrantyClaimForm.tsx)
- przypadek: pierwsze pole `Projekt`

Aktualne zachowanie:
- `CrudForm` po załadowaniu ustawia focus na pierwszym polu formularza,
- przy polach typu `combobox` daje to niepożądany efekt wizualny,
- użytkownik widzi flicker nawet wtedy, gdy ekran nie powinien wymuszać focusa.

Oczekiwane zachowanie:
- autofocus pierwszego pola powinien być opcjonalny,
- host formularza powinien móc wyłączyć initial focus,
- `CrudForm` nie powinien wymuszać focusa na polach interaktywnych, jeśli ekran nie potrzebuje takiego zachowania,
- szczególnie dla `combobox` i podobnych kontrolek nie powinno być widocznego flickera przy wejściu na ekran.

Co dziś zrobiono lokalnie:
- w `warranty_claims` zastosowano lokalny workaround bez modyfikowania core,
- pierwszy widoczny input nie jest już bezpośrednim celem autofocusa,
- rozwiązanie jest celowo lokalne, żeby update `open-mercato` nie nadpisywał zmian.

Rekomendacja do upstream:
- dodać do `CrudForm` opcję w stylu `disableInitialFocus`,
- albo ograniczyć autofocus do prostych pól (`text`, `textarea`, `select`) i nie wymuszać go dla `custom` / `combobox`,
- albo przenieść decyzję o autofocusie do hosta formularza.

## Bug 002: niespójny kontrakt payloadu listy/rekordu między warstwami CRUD i frontendem

Status:
- otwarte
- lokalny workaround wdrożony w `warranty_claims`
- wymaga doprecyzowania kontraktu na granicy API/UI

Obszar:
- `@open-mercato/shared`
- `@open-mercato/ui`
- CRUD route payload shape
- mapowanie pól w frontendzie

Jak odtworzyć:
1. Zbuduj moduł CRUD, w którym backend serializer zwraca rekordy w `snake_case`.
2. Oprzyj frontend formularza i tabeli o te pola, np. `project_id`, `status_key`, `bas_number`.
3. Otwórz listę lub edycję rekordu przez standardowe helpery frontendowe (`fetchCrudList`, `CrudForm`, `DataTable`).
4. W części ścieżek lub warstw pośrednich payload może pojawić się w `camelCase`, np. `projectId`, `statusKey`, `basNumber`.
5. Jeśli frontend oczekuje wyłącznie `snake_case`, pola na liście i w edycji wyglądają na puste mimo poprawnych danych w bazie i poprawnej odpowiedzi API.

Aktualny przykład w aplikacji:
- moduł `warranty_claims`
- tabela: [WarrantyClaimsTable.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/warranty_claims/components/WarrantyClaimsTable.tsx)
- formularz: [WarrantyClaimForm.tsx](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/warranty_claims/components/WarrantyClaimForm.tsx)
- normalizacja lokalna: [types.ts](/c:/Development/Project/MyGuarancy/my-guarancy/src/modules/warranty_claims/types.ts)

Aktualne zachowanie:
- zapis do bazy działa poprawnie,
- API potrafi zwrócić pełne dane rekordu,
- ale frontend może dostać shape z innym nazewnictwem niż zakłada kod komponentu,
- skutkiem są puste wartości na liście i w formularzu edycji.

Oczekiwane zachowanie:
- payload CRUD powinien mieć jeden stabilny kontrakt nazewniczy na granicy API/UI,
- frontend nie powinien zgadywać, czy przyjdzie `snake_case`, czy `camelCase`,
- helpery CRUD i komponenty UI powinny konsumować spójny format odpowiedzi.

Co dziś zrobiono lokalnie:
- w `warranty_claims` dodano lokalną normalizację rekordów, która toleruje oba formaty,
- frontend mapuje teraz zarówno `snake_case`, jak i `camelCase`,
- rozwiązanie jest odporne na obecny stan runtime, ale to obejście, nie naprawa źródła.

Rekomendacja do upstream:
- zdefiniować jeden obowiązujący format payloadu dla CRUD response,
- upewnić się, że wszystkie ścieżki `makeCrudRoute`, serializacja i helpery frontendowe zwracają ten sam shape,
- jeśli framework dopuszcza oba formaty, powinien robić to jawnie i konsekwentnie, a nie zależnie od ścieżki wykonania.
