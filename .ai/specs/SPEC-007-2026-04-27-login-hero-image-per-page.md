# SPEC-007 — Login Hero: osobny obrazek dla portalu i backoffice

**Data:** 2026-04-27  
**Status:** Analiza / gotowa do implementacji  
**Autor:** Paweł Sydorow

---

## 1. Cel

Obie strony logowania (portal klienta i backoffice) mają teraz identyczny obrazek po lewej stronie, hardcodowany w CSS przez `url("/login-bg-magnice.jpg")`. Celem rewryteu jest:

1. Przygotować architekturę, w której każda strona może mieć **inny** obrazek tła po lewej.
2. Nie zmieniać obrazków — oba mają używać tego samego pliku co teraz (`login-bg-magnice.jpg`).
3. Nie zmieniać wyglądu — efekt wizualny musi być identyczny jak przed zmianą.

---

## 2. Stan obecny — analiza

### 2.1 Drzewo komponentów logowania

```
Portal login page.tsx
  └── BremerLoginSection
        └── BremerAuthPanel          ← hardkoduje BremerLoginHero
              └── BremerLoginHero    ← ikony: Warehouse + Sparkles

Backend (via widget override): BremerLoginSectionWrapper
  └── BremerBackofficeLoginSection
        └── BremerBackofficeAuthPanel    ← hardkoduje BremerBackofficeLoginHero
              └── BremerBackofficeLoginHero  ← ikony: Building2 + ShieldCheck
```

### 2.2 Kluczowe pliki

| Plik | Rola |
|------|------|
| `src/components/login/BremerLoginHero.tsx` | Hero portalu (ikony Warehouse+Sparkles, tekst "Innowacja & Solidnosc") |
| `src/components/login/BremerBackofficeLoginHero.tsx` | Hero backoffice (ikony Building2+ShieldCheck, tekst "Backoffice BREMER") |
| `src/components/login/BremerAuthPanel.tsx` | Layout panelu portalu — importuje `BremerLoginHero` na stałe |
| `src/components/login/BremerBackofficeAuthPanel.tsx` | Layout panelu backoffice — importuje `BremerBackofficeLoginHero` na stałe |
| `src/components/login/BremerLoginSection.tsx` | Wrapper portalu — przekazuje title/description do `BremerAuthPanel` |
| `src/components/login/BremerBackofficeLoginSection.tsx` | Wrapper backoffice — przekazuje title/description do `BremerBackofficeAuthPanel` |
| `src/components/login/BremerLoginSectionWrapper.tsx` | Adapter widgetu — deleguje do `BremerBackofficeLoginSection` |
| `src/app/globals.css` linia 1047–1067 | CSS który wstawia obrazek tła przez `::before` pseudo-element |

### 2.3 Jak obecnie działa tło

Tło po lewej stronie **nie jest ustawione w JSX**. Robi to CSS selector:

```css
/* backoffice — wykrywa form z data-auth-ready */
body:has(form[data-auth-ready]) .min-h-svh.flex.items-center.justify-center::before {
  background-image: url("/login-bg-magnice.jpg");
  ...
}

/* backoffice — reset password page */
body[data-bremer-auth-page^="reset"] .min-h-svh.flex.items-center.justify-center.p-4::before {
  background-image: url("/login-bg-magnice.jpg");
  ...
}
```

Portal login renderuje identyczną strukturę HTML (`min-h-svh flex items-center justify-center`) z `form[data-auth-ready]`, więc **oba tła trafiają na ten sam selektor CSS** — stąd identyczny obrazek.

### 2.4 Problem architektoniczny

- Obrazek jest hardkodowany w CSS globalnym przez selector na `body + .min-h-svh`.
- Oba widoki (portal i backoffice) mają identyczną strukturę DOM, więc CSS nie może ich rozróżnić.
- Żeby zmienić obrazek na jednej stronie, trzeba modyfikować CSS i rozróżnić kontekst przez `data-*` atrybut na `body` lub na kontenerze.

---

## 3. Proponowane rozwiązanie

### 3.1 Mechanizm: CSS custom property + data-atrybut na body

Zamiast hardkodować URL w CSS, używamy **CSS custom property** `--login-bg-image`, której wartość jest ustawiana przez `data-login-bg` atrybut na `<body>`.

```css
/* globals.css — nowa warstwa */
body[data-login-bg="portal"]::before { /* lub na kontenerze */
  --login-bg-image: url("/login-bg-magnice.jpg");
}
body[data-login-bg="backoffice"]::before {
  --login-bg-image: url("/login-bg-magnice.jpg");
}

body:has(form[data-auth-ready]) .min-h-svh.flex.items-center.justify-center::before {
  background-image: var(--login-bg-image, url("/login-bg-magnice.jpg"));
}
```

**Alternatywa prostsza (zalecana):** CSS custom property ustawiana inline przez `style` prop na kontenerze `<div>`, a selektor CSS ją czyta.

### 3.2 Wybrany pattern: `--login-bg-image` inline na kontenerze

**BremerAuthPanel** i **BremerBackofficeAuthPanel** zostaną **zastąpione jednym wspólnym** `BremerLoginLayout` z opcjonalnym propem `bgImage`.

```tsx
// src/components/login/BremerLoginLayout.tsx
type Props = {
  hero: ReactNode         // lewa kolumna (hero komponent)
  badge?: string          // np. "POLSKA" | "BACKOFFICE"
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}
```

Hero pozostaje osobnym komponentem przekazywanym z zewnątrz — co umożliwia inne ikony/tekst.

### 3.3 Nowe drzewo po rewrycie

```
BremerLoginLayout            ← jeden wspólny layout (hero slot + badge slot)
  ├── hero prop              ← np. BremerPortalHero lub BremerBackofficeHero
  └── badge prop             ← "POLSKA" | "BACKOFFICE"

BremerPortalHero             ← rename: BremerLoginHero → BremerPortalHero
BremerBackofficeHero         ← rename: BremerBackofficeLoginHero → BremerBackofficeHero

BremerLoginSection           ← używa BremerLoginLayout + BremerPortalHero
BremerBackofficeLoginSection ← używa BremerLoginLayout + BremerBackofficeHero
```

### 3.4 Tło obrazek — inline CSS variable

W CSS zmieniamy selector tak, żeby czytał custom property:

```css
/* globals.css */
body:has(form[data-auth-ready]) .min-h-svh.flex.items-center.justify-center::before {
  background-image: var(--bremer-login-bg, url("/login-bg-magnice.jpg"));
  /* fallback = obecny obrazek */
}
```

`BremerLoginLayout` przyjmuje prop `bgImage?: string` i ustawia go inline:

```tsx
<div
  className="min-h-svh flex items-center justify-center bg-background p-4"
  style={{ '--bremer-login-bg': bgImage ? `url("${bgImage}")` : undefined } as React.CSSProperties}
>
```

W ten sposób:
- Brak `bgImage` prop → CSS fallback = `login-bg-magnice.jpg` (jak teraz).
- `bgImage="/login-bg-portal.jpg"` → osobny obrazek dla portalu.
- `bgImage="/login-bg-backoffice.jpg"` → osobny obrazek dla backoffice.

**Dziś obie sekcje nie przekazują `bgImage`** → oba używają fallbacku → wygląd identyczny jak teraz. ✓

---

## 4. Zmiany — lista plików

### Pliki do zmodyfikowania

| Plik | Zmiana |
|------|--------|
| `src/components/login/BremerAuthPanel.tsx` | Dodaj prop `hero?: ReactNode` zamiast hardkodowanego `<BremerLoginHero />` |
| `src/components/login/BremerBackofficeAuthPanel.tsx` | Dodaj prop `hero?: ReactNode` zamiast hardkodowanego `<BremerBackofficeLoginHero />`, dodaj prop `badge?` |
| `src/components/login/BremerLoginSection.tsx` | Przekaż `hero={<BremerLoginHero />}` do `BremerAuthPanel` |
| `src/components/login/BremerBackofficeLoginSection.tsx` | Przekaż `hero={<BremerBackofficeLoginHero />}` do `BremerBackofficeAuthPanel` |
| `src/app/globals.css` | Zmień hardkodowany `url(...)` na `var(--bremer-login-bg, url("/login-bg-magnice.jpg"))` |

### Pliki bez zmian (wygląd)

| Plik | Powód |
|------|-------|
| `src/components/login/BremerLoginHero.tsx` | Bez zmian |
| `src/components/login/BremerBackofficeLoginHero.tsx` | Bez zmian |
| `src/components/login/BremerLoginSectionWrapper.tsx` | Bez zmian |
| `src/modules/portal/frontend/[orgSlug]/portal/login/page.tsx` | Bez zmian |
| `src/modules/warranty_claims/widgets/components.ts` | Bez zmian |

---

## 5. Kontrakt API komponentów po zmianie

### `BremerAuthPanel` (rozszerzony)

```tsx
type Props = {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
  hero?: ReactNode        // NOWE — domyślnie <BremerLoginHero />
}
```

### `BremerBackofficeAuthPanel` (rozszerzony)

```tsx
type Props = {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
  hero?: ReactNode        // NOWE — domyślnie <BremerBackofficeLoginHero />
  badge?: string          // NOWE — domyślnie "BACKOFFICE"
}
```

### Jak zmienić obrazek w przyszłości

Obrazek tła sterowany jest przez CSS custom property `--bremer-login-bg` na kontenerze strony logowania.

**Opcja A (zalecana):** Dodaj prop `bgImage` do `BremerLoginSection` lub `BremerBackofficeLoginSection`, który jest przekazywany przez `BremerAuthPanel`/`BremerBackofficeAuthPanel` jako inline `style`. Nie wymaga żadnych zmian CSS.

**Opcja B:** Plik publiczny — wgraj nowy plik do `/public/`, zmień wartość domyślną fallbacku w CSS.

---

## 6. Gwarancja zgodności wizualnej

Po rewrycie:
- Oba warianty bez `bgImage` prop → CSS fallback = `url("/login-bg-magnice.jpg")` → **identyczny wygląd jak teraz**.
- Hero komponenty bez zmian → ikony i teksty identyczne.
- Badge "POLSKA" / "BACKOFFICE" bez zmian.
- Selektory CSS bez zmian strukturalnych — tylko podmiana wartości `background-image` na `var()`.

---

## 7. Zakres NIE objęty tą specyfikacją

- Zmiana rzeczywistych obrazków (to będzie osobna decyzja produktowa).
- Zmiany tekstów w hero lub sekcjach.
- Dodawanie nowych stron logowania.
- Zmiany w API auth ani flow logowania.

---

## 8. Kolejność implementacji

1. Zaktualizuj `BremerAuthPanel.tsx` — dodaj `hero?: ReactNode`, domyślnie `<BremerLoginHero />`.
2. Zaktualizuj `BremerBackofficeAuthPanel.tsx` — dodaj `hero?: ReactNode` + `badge?: string`.
3. Zaktualizuj `BremerLoginSection.tsx` — przekaż `hero`.
4. Zaktualizuj `BremerBackofficeLoginSection.tsx` — przekaż `hero`.
5. Zaktualizuj `globals.css` — zamień `url(...)` na `var(--bremer-login-bg, url(...))`.
6. Weryfikacja: oba widoki wyglądają identycznie jak przed zmianą.
