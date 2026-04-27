# SPEC-006 - Portal klienta: logowanie spójne z `/login` i core

**Data:** 2026-04-27  
**Status:** Ready  
**Zaleznosci:**  
- core auth login (`@open-mercato/core/modules/auth/frontend/login`)
- portal shell (`src/components/portal/PortalLayoutShell.tsx`)
- wspolne komponenty BREMER auth (`src/components/login/*`)

## Problem

Portal klienta ma osobny login pod `/<orgSlug>/portal/login`, ale nie korzysta z tego samego chrome co `/login`. W praktyce daje to inny wyglad, inny layout strony i osobny przyklad implementacji auth. To utrudnia utrzymanie i zwieksza ryzyko rozjazdu po aktualizacji core.

## Cel

- Portal login ma wygladac jak `/login`
- Portal login ma korzystac z tego samego BREMER chrome i tych samych komponentow wrappera
- Aktualizacje core auth maja nadal dochodzic przez standardowy mechanizm core, bez forkowania calej architektury loginu
- Zmiana ma dotyczyc tylko warstwy prezentacji i lokalnego entrypointu portalu

## Zakres zmian

### 1. Lokalny portalowy entrypoint loginu

- Dodac lokalna strone `src/modules/portal/frontend/[orgSlug]/portal/login/page.tsx`
- Strona ma korzystac z tych samych komponentow BREMER auth co `/login`
- Formularz ma zostac portalowy: `customer_accounts/login`, `tenantId` z `PortalContext`, redirect do `/<orgSlug>/portal/dashboard`
- Strona ma pozostac publiczna i nie moze wymagac customer auth

### 2. Portal shell bez standardowego chrome dla loginu

- `PortalLayoutShell` ma rozpoznawac trase `*/portal/login`
- Dla tej trasy nie wolno renderowac standardowego portal header/sidebar/footer
- Layout ma oddac pelna kontrole stronie loginu, aby mogla pokazac ten sam split-screen auth chrome co `/login`

### 3. Ujednolicenie wizualne

- Portal login ma uzywac wspolnego wrappera `BremerLoginSection` / `BremerAuthPanel`
- Nie wolno tworzyc osobnego, portal-only wygladu auth
- Link do signup moze pozostac, ale chroma strony nie wolno rozszczepiac na inny wzorzec UI

## Publiczne API i kontrakty

- Brak zmian w API auth
- Brak zmian w core login route
- Brak zmian w customer login endpoint poza istniejacym flow `POST /api/customer_accounts/login`
- Nowy portalowy page route staje sie lokalnym, shadowujacym entrypointem dla `/<orgSlug>/portal/login`

## Test plan

- Otworzyc `/<orgSlug>/portal/login` i potwierdzic, ze nie renderuje sie portalowy header/sidebar/footer
- Otworzyc `/login` i `/<orgSlug>/portal/login` i potwierdzic ten sam BREMER chrome
- Sprawdzic sukces logowania i redirect do `/<orgSlug>/portal/dashboard`
- Sprawdzic stan bledny dla `401`, `423` i braku tenant context
- Sprawdzic mobile i desktop, czy portal login zachowuje ten sam split-screen layout co `/login`

## Assumptions

- Lokalny route `src/modules/portal/frontend/[orgSlug]/portal/login/page.tsx` moze shadowowac core route po wygenerowaniu manifestu
- `BremerLoginSection` pozostaje wspolnym wrapperem dla obu ekranow auth
- Portal signup pozostaje osobna trasa i nie jest czescia tego zmienionego login flow
