# SPEC-004 — Portal Klienta: Zgłoszenia Gwarancyjne

**Data:** 2026-04-24  
**Status:** Draft  
**Zależności:** SPEC-001 (warranty_claims MVP)

## Review Readiness (2026-04-24)

### Co jest OK

- Rozdzielenie auth staff/customer i osobnych endpointów portalowych (`requireCustomerAuth`) jest trafne.
- Dobrze wyodrębniony zakres MVP vs. out-of-scope.
- Dobre założenie bezpieczeństwa: dla obcego rekordu zwracamy 404 zamiast 403.
- Plan fazowania i gate’y są czytelne.

### Co było nie OK / poprawione w tym review

1. Routing API był niespójny z frameworkiem (`GET [id]` w jednym `route.ts`).  
   **Poprawka:** rozdzielone endpointy na `/claims` i `/claims/[id]`.
2. Niespójne nazewnictwo pól (`project_id`, `claim_number_formatted`, `reported_at`) mieszało się z camelCase z `WarrantyClaimRecord`.  
   **Poprawka:** kontrakt API i UI oparty o camelCase.
3. Brak whitelisty `sortBy` i limitów paginacji groził błędami/abuse.  
   **Poprawka:** dodane do API constraints.
4. Brak jednoznacznej walidacji autoryzacji przy `projectId`/lookupach.  
   **Poprawka:** wymagane sprawdzenie przynależności projektu do `organizationId`.
5. QA było zbyt ogólne i bez testów negatywnych.  
   **Poprawka:** dopisane scenariusze bezpieczeństwa i walidacji.

---

## Problem

Klienci nie mają dostępu do swoich zgłoszeń gwarancyjnych poza kanałem mailowym. Backoffice jest dostępny tylko dla pracowników. Potrzebujemy portalu klienta, gdzie klient może zalogować się, zobaczyć swoje zgłoszenia, śledzić ich status i dodać nowe.

---

## Zakres

### W zakresie

- Strona logowania portalu klienta z brandingiem BREMER (komponent `BremerLoginSection` / `BremerAuthPanel`)
- Strona resetu hasła z tym samym layoutem auth (komponent `BremerAuthPanel`)
- Lista zgłoszeń gwarancyjnych klienta (read-only)
- Widok szczegółu zgłoszenia (read-only)
- Formularz nowego zgłoszenia (tylko pola klienckie: tytuł, opis, lokalizacja, priorytet, kategoria, projekt)
- Osobne endpointy API dla portalu (`/api/warranty_claims/portal/claims`)
- Filtrowanie i sortowanie listy
- Wygląd spójny z backoffice — sharp corners, DM Sans, `--primary: #0067ff`, status/priority badges z `WARRANTY_STATUS_BADGE_MAP`

### Poza zakresem (fazy przyszłe)

- Edycja zgłoszeń przez klienta
- Załączniki w portalu
- Powiadomienia email z portalu
- Komentarze / wiadomości do zgłoszenia

---

## Architektura

### Uwaga dot. endpointów

Potrzebne są osobne endpointy. Powody:

1. Endpointy backoffice używają `getAuthFromCookies()` (staff JWT) i `requireFeatures: ['warranty_claims.view']` — tokeny klienta tam nie działają.
2. Endpointy portalu używają `getCustomerAuthFromCookies()` (customer JWT) i `requireCustomerAuth: true`.
3. Zakres danych jest inny: klient widzi tylko zgłoszenia przypisane do jego organizacji, nie całą listę tenanta.

### Struktura plików do dodania

```
src/modules/warranty_claims/
├── api/
│   └── portal/
│       └── claims/
│           ├── route.ts              ← GET lista + POST nowe
│           └── [id]/
│               └── route.ts          ← GET szczegół
├── frontend/                         ← NOWY katalog (analogia do backend/)
│   └── [orgSlug]/
│       └── portal/
│           └── warranty-claims/
│               ├── page.tsx          ← lista zgłoszeń
│               ├── page.meta.ts      ← requireCustomerAuth: true
│               ├── create/
│               │   ├── page.tsx      ← formularz nowego zgłoszenia
│               │   └── page.meta.ts
│               └── [id]/
│                   ├── page.tsx      ← szczegół zgłoszenia
│                   └── page.meta.ts
└── components/
    ├── WarrantyClaimsTable.tsx           ← istniejący (backoffice, bez zmian)
    ├── WarrantyClaimForm.tsx             ← istniejący (backoffice, bez zmian)
    └── portal/                           ← NOWE komponenty portalowe
        ├── PortalClaimsTable.tsx
        ├── PortalClaimDetail.tsx
        └── PortalClaimCreateForm.tsx
```

### Routing URL

```
/<orgSlug>/portal/login                         ← auth z core (już istnieje)
/<orgSlug>/portal/password-reset                ← reset hasła z core (weryfikować)
/<orgSlug>/portal/warranty-claims               ← NOWE — lista
/<orgSlug>/portal/warranty-claims/create        ← NOWE — nowe zgłoszenie
/<orgSlug>/portal/warranty-claims/[id]          ← NOWE — szczegół
```

### Auth flow (portal)

```
Klient wchodzi na /<orgSlug>/portal/warranty-claims
  → (frontend)/[...slug]/page.tsx sprawdza requireCustomerAuth: true
  → brak customer JWT cookie → redirect do /<orgSlug>/portal/login
  → po zalogowaniu → redirect z powrotem
```

Logowanie i reset hasła obsługuje `@open-mercato/core` moduł `portal`. Moduły `customer_accounts` i `portal` są już włączone w `modules.ts`.

---

## Branding i wzorzec layoutu auth

Projekt ma gotowe komponenty auth budujące wygląd logowania:

```
src/components/login/
├── BremerAuthPanel.tsx    ← wrapper layoutu: hero + logo BREMER + tytuł + stopka
├── BremerLoginSection.tsx ← instancja dla logowania (tytuł, opis, info o koncie)
└── BremerLoginHero.tsx    ← panel glassmorphism po lewej stronie (tylko desktop)
```

**`BremerAuthPanel`** przyjmuje `title`, `description`, `children` (form), `footer`. Renderuje:
- `BremerLoginHero` (fixed left panel, desktop only)
- Logo BREMER z separatorem i napisem POLSKA
- Tytuł + opis strony
- `children` (slot na formularz)
- Stopkę z linkami WSPARCIE / PRYWATNOSC

**Strona resetu hasła w portalu** powinna używać tego samego `BremerAuthPanel` z innym `title` i `description`. Jeśli core dostarcza stronę resetu przez catch-all, sprawdzić czy można nadpisać przez component override lub czy core akceptuje slot na custom chrome.

`AuthPageChrome` (w `src/components/`) dodaje `BremerLoginHero` dla tras `/reset` i `/reset/[token]` (backoffice reset). Analogiczny mechanizm może być potrzebny dla portal reset jeśli core renderuje tam własny layout.

---

## Dane i typy

### Istniejące typy (reuse bez zmian)

- `WarrantyClaimRecord` — znormalizowany rekord (snake_case) z `types.ts`
- `WarrantyClaimApiRecord` — surowa odpowiedź API (mixed case) z `types.ts`
- `normalizeWarrantyClaimRecord()` — normalizuje odpowiedź do `WarrantyClaimRecord`
- `LookupOption`, `LookupBundle` — opcje słowników (projekty, statusy, priorytety, kategorie)

### Istniejące stałe (reuse bez zmian)

Z `lib/constants.ts`:
- `WARRANTY_STATUS_KEYS` — klucze statusów (`oczekuje`, `w_trakcie`, `zakonczone`)
- `WARRANTY_PRIORITY_ORDER` — kolejność priorytetów
- `WARRANTY_DEFAULT_CREATE_STATUS_KEY` — domyślny status dla nowych zgłoszeń
- `WARRANTY_DEFAULT_CREATE_PRIORITY_KEY` — domyślny priorytet

Z `lib/statusStyles.ts`:
- `WARRANTY_STATUS_BADGE_MAP` — mapowanie statusów na `EnumBadge` klasy (warning/info/success)
- `WARRANTY_STATUS_SEGMENT_CLASSES` — klasy CSS dla filtrów statusu
- `WARRANTY_PRIORITY_SEGMENT_CLASSES` — klasy CSS dla filtrów priorytetu

Portal używa tych samych stałych i mapowań — spójność wizualna z backoffice.

### Model zakresu dla klienta

CustomerUser ma `organizationId`. Klient widzi tylko zgłoszenia gdzie `organizationId` pasuje do jego konta.

**Otwarte pytanie:** Zweryfikować przed Fazą 2 czy `CustomerUser` z `@open-mercato/core` faktycznie niesie `organizationId` w JWT. Jeśli nie — potrzeba dodatkowego wiązania klient→org.

### Pola widoczne dla klienta

| Pole | Etykieta | W liście | W szczególe | W formularzu tworzenia |
|---|---|:---:|:---:|:---:|
| `claimNumber` (formatted) | Nr zgłoszenia | ✓ | ✓ | — |
| `title` | Tytuł | ✓ | ✓ | ✓ (wymagane) |
| `issueDescription` | Opis | — | ✓ | ✓ (wymagane) |
| `locationText` | Lokalizacja | — | ✓ | ✓ |
| `priorityKey` | Priorytet | ✓ | ✓ | ✓ |
| `categoryKey` | Kategoria | — | ✓ | ✓ |
| `statusKey` | Status | ✓ | ✓ | — (auto: `oczekuje`) |
| `reportedAt` | Data zgłoszenia | ✓ | ✓ | — (auto: now) |
| `resolvedAt` | Data rozwiązania | ✓ | ✓ | — |
| `projectId` | Projekt | — | ✓ | ✓ |

Pola wewnętrzne (`assignedUserId`, `subcontractorId`, `basNumber`, `tenantId`) — nie pokazywać w portalu.

---

## API

### `GET /api/warranty_claims/portal/claims`

```ts
// src/modules/warranty_claims/api/portal/claims/route.ts

export const metadata = {
  GET: { requireCustomerAuth: true },
  POST: { requireCustomerAuth: true },
}
```

Query params: `statusKey`, `priorityKey`, `search`, `page`, `limit`, `sortBy`, `sortDir`

Walidacja query params (obowiązkowo):
- `page`: int >= 1 (default: 1)
- `limit`: int 1..100 (default: 20)
- `sortDir`: `asc | desc` (default: `desc`)
- `sortBy` whitelist: `reportedAt | resolvedAt | statusKey | priorityKey | claimNumber`
- `search`: max 200 znaków, trim
- `statusKey` i `priorityKey`: tylko wartości ze słowników

Response:
```json
{ "items": [...], "total": 42, "page": 1, "limit": 20 }
```

### `POST /api/warranty_claims/portal/claims`

Body (podzbiór `warrantyClaimCreateSchema`):

```ts
{
  title: string           // wymagane
  issueDescription: string // wymagane
  locationText?: string
  priorityKey?: string    // default: WARRANTY_DEFAULT_CREATE_PRIORITY_KEY
  categoryKey?: string
  projectId?: string
  // statusKey: auto = WARRANTY_DEFAULT_CREATE_STATUS_KEY ('oczekuje')
  // reportedAt: auto = now
  // organizationId: z customerAuth
}
```

Walidacja POST (obowiązkowo):
- `title`: 3..200 znaków
- `issueDescription`: 10..5000 znaków
- `locationText`: max 300 znaków
- `projectId` musi należeć do tej samej `organizationId` co customer (w przeciwnym razie 400/404)
- ignorować/odrzucać pola niedozwolone z payloadu (`statusKey`, `tenantId`, `assignedUserId`, itp.)

### `GET /api/warranty_claims/portal/claims/[id]`

Zwraca szczegół — tylko jeśli `organizationId` zgłoszenia pasuje do klienta. 404 jeśli nie (nie 403 — nie ujawniamy istnienia).

Walidacja:
- `id` format UUID (lub zgodny z aktualnym ID w module)
- brak rekordu lub obca organizacja => 404

---

## UI

### Strona logowania i reset hasła

Logowanie: core `portal` dostarcza stronę. Sprawdzić czy akceptuje component override pozwalający wstrzyknąć `BremerLoginSection` jako wrapper — jeśli tak, portal logowania automatycznie dostaje branding BREMER.

Reset hasła: analogicznie — `BremerAuthPanel` z `title="Reset hasła"` i stosownym `description`.

Jeśli core nie pozwala na override layoutu auth, strony trzeba napisać lokalnie w `frontend/[orgSlug]/portal/` korzystając z gotowych komponentów.

### Lista zgłoszeń (`PortalClaimsTable`)

Osobny komponent — nie reuse backoffice `WarrantyClaimsTable` (zakłada staff layout i staff auth).

Użyć komponentów `@open-mercato/ui/portal/*` lub prymitywów + Tailwind.

Kolumny:

| Kolumna | Wartość | Sortowalna |
|---|---|:---:|
| Nr zgłoszenia | `claimNumber` (formatted) | tak |
| Tytuł | `title` | nie |
| Status | `EnumBadge` z `WARRANTY_STATUS_BADGE_MAP` | tak |
| Priorytet | `EnumBadge` wg mapowania priorytetu (spójnego ze słownikiem) | tak |
| Data zgłoszenia | `reportedAt` | tak |
| Data rozwiązania | `resolvedAt` | tak |

Filtry: segmentowane przyciski statusu (`WARRANTY_STATUS_SEGMENT_CLASSES`), priorytet (`WARRANTY_PRIORITY_SEGMENT_CLASSES`), wyszukiwanie tekstowe (title + issueDescription).

Przycisk CTA: "Nowe zgłoszenie" → `/<orgSlug>/portal/warranty-claims/create`.

### Widok szczegółu (`PortalClaimDetail`)

Layout: dwukolumnowy (info główne + metadane). Card-based. Brak przycisków edycji.

### Formularz nowego zgłoszenia (`PortalClaimCreateForm`)

Pola: title (text), issueDescription (textarea), locationText (text), priorityKey (select/radio), categoryKey (select), projectId (select z lookups).

Lookups (projekty, kategorie, priorytety) pobierane z osobnego endpointu lub z istniejącego `/api/warranty_claims/lookups` — sprawdzić czy ten endpoint akceptuje customer auth, jeśli nie — dodać `/api/warranty_claims/portal/lookups`.

Wymaganie bezpieczeństwa dla lookupów:
- endpoint lookupów musi zwracać wyłącznie dane z organizacji klienta
- brak dostępu bez `requireCustomerAuth`

Po submit: redirect do `/<orgSlug>/portal/warranty-claims/[id]` nowego zgłoszenia.

### Widget nawigacji portalu

Analogicznie do `widgets/injection/sidebar-menu/widget.ts` w backoffice — dodać wpis w menu portalu prowadzący do `/<orgSlug>/portal/warranty-claims`. Sprawdzić jaki injection point używa portal sidebar (może być inny niż `menu:sidebar:main`).

---

## Plan implementacji

### Faza 1 — Weryfikacja auth portalu (0.5 dnia)

1. Sprawdzić czy `/<orgSlug>/portal/login` działa end-to-end (zalogowanie, cookie, redirect).
2. Zweryfikować `CustomerUser` JWT — czy niesie `organizationId`.
3. Sprawdzić czy portal akceptuje component override dla layoutu logowania (branding `BremerAuthPanel`).
4. Sprawdzić czy `password-reset` jest włączony w core.

**Gate:** klient może się zalogować i wylogować przez portal.

### Faza 2 — Endpointy portalowe (0.5 dnia)

1. Dodać `src/modules/warranty_claims/api/portal/claims/route.ts` (GET lista + POST).
2. Dodać `src/modules/warranty_claims/api/portal/claims/[id]/route.ts` (GET szczegół).
3. Filtrowanie po `organizationId` klienta.
4. Walidacja query/body + whitelist `sortBy`.
5. Jeśli `/api/warranty_claims/lookups` nie akceptuje customer auth — dodać `/api/warranty_claims/portal/lookups`.
6. `yarn generate`.

**Gate:** curl z customer cookie zwraca dane, bez cookie zwraca 401.

### Faza 3 — Strony portalowe (1 dzień)

1. `frontend/[orgSlug]/portal/warranty-claims/page.tsx` + `page.meta.ts` (lista).
2. `frontend/[orgSlug]/portal/warranty-claims/[id]/page.tsx` (szczegół).
3. `frontend/[orgSlug]/portal/warranty-claims/create/page.tsx` (formularz).
4. Komponenty: `PortalClaimsTable`, `PortalClaimDetail`, `PortalClaimCreateForm`.
5. Widget nawigacji portalu.
6. `yarn generate`.

**Gate:** zalogowany klient widzi listę, może przejść do szczegółu i dodać zgłoszenie.

### Faza 4 — Branding auth (0.5 dnia)

1. Wpiąć `BremerAuthPanel` / `BremerLoginSection` w strony logowania portalu.
2. Zweryfikować reset hasła.

**Gate:** strona logowania portalu wygląda identycznie jak logowanie backoffice.

### Faza 5 — QA (0.5 dnia)

1. Test: brak dostępu bez auth.
2. Test: klient A nie widzi zgłoszeń klienta B (izolacja org).
3. Test: filtrowanie i sortowanie działa.
4. Test: nowe zgłoszenie pojawia się na liście.
5. Test: szczegół wyświetla poprawne dane.
6. Test negatywny: POST z `projectId` spoza organizacji kończy się 400/404.
7. Test negatywny: POST z niedozwolonym polem (`tenantId`, `statusKey`) nie nadpisuje danych systemowych.
8. Test kontraktu: `sortBy` spoza whitelisty daje 400.
9. Test paginacji: `limit > 100` daje 400.

---

## Ryzyka i pytania otwarte

| # | Ryzyko | Mitygacja |
|---|---|---|
| 1 | `CustomerUser` JWT nie niesie `organizationId` | Sprawdzić w Fazie 1; może wymagać dodatkowego mapowania klient→org |
| 2 | Core `portal` nie pozwala na override layoutu logowania | Napisać strony lokalnie w `frontend/` używając `BremerAuthPanel` |
| 3 | `portal_enabled` feature toggle nie jest włączony per tenant | Sprawdzić seed/admin; włączyć przed testem |
| 4 | `/api/warranty_claims/lookups` odrzuca customer auth | Dodać `/api/warranty_claims/portal/lookups` (subset: projekty, kategorie, priorytety) |
| 5 | Portal sidebar używa innego injection point niż `menu:sidebar:main` | Zbadać injection table portalu przed Fazą 3 |
| 6 | `@open-mercato/ui/portal/*` może nie mieć gotowej tabeli | Fallback: prymitywy HTML + Tailwind + design tokens projektu |
| 7 | Brak whitelisty sortowania i limitów paginacji | Wymusić walidację query i limity API |
| 8 | `projectId` może wskazać projekt innej organizacji | Walidować powiązanie projektu z `organizationId` z JWT |

---

## Definicja ukończenia

- [ ] Klient może zalogować się przez `/<orgSlug>/portal/login` (wygląd BREMER)
- [ ] Klient może zresetować hasło
- [ ] Klient widzi listę swoich zgłoszeń z filtrami i sortowaniem
- [ ] Klient może wejść w szczegół zgłoszenia
- [ ] Klient może dodać nowe zgłoszenie (tytuł, opis, lokalizacja, priorytet, kategoria, projekt)
- [ ] Nowe zgłoszenie ma status `oczekuje` i datę `now`
- [ ] Klient nie widzi zgłoszeń innych organizacji
- [ ] `projectId` i lookups są ograniczone do organizacji klienta
- [ ] Niezalogowany użytkownik jest przekierowany do logowania
- [ ] Status badges używają `WARRANTY_STATUS_BADGE_MAP` (spójność z backoffice)
- [ ] API waliduje `sortBy/sortDir/page/limit` zgodnie ze spec
- [ ] `yarn build` przechodzi bez błędów
