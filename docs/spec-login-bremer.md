# Spec: BREMER Login Page — Split-Screen Redesign

**Type:** UI Override (no core modification)  
**Scope:** `/login` route only  
**Update safety:** Full — zero OM core files touched  

---

## 1. Problem Statement

The OM default login page renders a centered card (`max-w-sm`) with a generic logo and minimal styling. The target design is a full-bleed split-screen:

- **Left 50 %** — industrial warehouse photo + glassmorphism "Innowacja & Solidność" card  
- **Right 50 %** — clean BREMER-branded form panel (no card frame, just white surface)

All business logic (submit, redirect, error handling, tenant resolution, remember-me, SSO injection) stays in OM core untouched.

---

## 2. Extension Points Available in OM

| Handle | Type | What it controls |
|--------|------|-----------------|
| `section:auth.login.form` | Component replacement | Wrapper around the `<form>` element inside `CardContent` |
| `auth.login:form` | InjectionSpot | Slot between email and password fields |
| `data-auth-ready` attribute | CSS anchor | Stable OM attribute on the `<form>` — used to scope CSS selectors |

**Key constraint:** The logo, `<h1>`, and `<CardDescription>` are rendered by OM core **above** the `LoginFormSection`, inside `CardHeader`. They cannot be removed via component override — they must be hidden/replaced with CSS.

---

## 3. Strategy

Two-layer approach:

**Layer A — CSS override in `globals.css`**  
Transforms the page container and Card into the split-screen layout using `:has([data-auth-ready])` as the CSS scope anchor. No HTML changes, fully declarative.

**Layer B — Component override (`section:auth.login.form` replacement)**  
Injects the BREMER header (logo wordmark + POLSKA separator + title/subtitle) and re-skins form controls to match the design. The replacement renders `children` (the OM form) unchanged — it only adds visual wrapping.

---

## 4. Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/app/globals.css` | Modify — append section | Layer A: page layout CSS |
| `src/modules/warranty_claims/widgets/components.ts` | Modify — add override | Layer B: form section replacement |
| `src/components/login/BremerLoginSection.tsx` | **Create** | The replacement component (TSX, client component) |

Do not create a new module — add to the existing `warranty_claims` module (it is already scanned by the generator).

---

## 5. Design Tokens

Map BREMER design values to OM CSS custom properties where possible; use raw values only where no OM token exists.

| BREMER design value | Source | CSS variable / value |
|---------------------|--------|---------------------|
| Primary blue `#4b69f2` | Override `--primary` | `var(--primary)` |
| Text on primary `#ffffff` | `--primary-foreground` | `var(--primary-foreground)` |
| Surface white | `--background` | `var(--background)` |
| Muted label text `#444654` | `--muted-foreground` | `var(--muted-foreground)` |
| Ghost border | `--border` at 20 % opacity | `color-mix(in srgb, var(--border) 20%, transparent)` |
| Separator `#c4c5d7` | `--border` | `var(--border)` |
| Font | Inter (already in scope) | `var(--font-sans)` |
| Input height `48 px` | — | `h-12` (Tailwind) |
| CTA height `56 px` | — | `h-14` (Tailwind) |
| Border radius inputs | `--radius-lg` | `rounded-lg` |

**Required token override** — add to `:root` block in `globals.css`:

```css
/* Login override: shift primary to BREMER indigo */
--login-primary: #4b69f2;
--login-primary-hover: #3a56d4;
```

Use `--login-primary` only within the scoped CSS block (Layer A). This avoids polluting the global `--primary` that affects the rest of the app.

---

## 6. Layer A — CSS Spec (`globals.css`)

Append as a new `@layer` block at the end of the file. All selectors are scoped to `body:has([data-auth-ready])` so they activate only on the login page.

### 6.1 Page container

The OM outer wrapper is `<div class="min-h-svh flex items-center justify-center p-4">`.

```css
/* ═══ Login Page: BREMER Split-Screen Layout ═══ */
@layer bremer-login {
  body:has([data-auth-ready]) {
    /* Reset body gradient that bleeds through */
    background-image: none;
    background-color: var(--background);
  }

  /* Outer OM wrapper — become the split container */
  body:has([data-auth-ready]) .min-h-svh.flex.items-center.justify-center {
    padding: 0;
    align-items: stretch;
    justify-content: stretch;
  }
```

### 6.2 Left panel (image)

The Card becomes the right panel. The left panel is injected as a `::before` pseudo-element on the OM outer div.

```css
  /* Left panel — warehouse image */
  body:has([data-auth-ready]) .min-h-svh.flex.items-center.justify-center::before {
    content: "";
    display: block;
    flex: 0 0 50%;
    min-height: 100svh;
    background-image: url("/login-bg.jpg");
    background-size: cover;
    background-position: center;
    position: relative;
  }

  @media (max-width: 1023px) {
    body:has([data-auth-ready]) .min-h-svh.flex.items-center.justify-center::before {
      display: none;
    }
  }
```

> **Asset required:** Place the warehouse photo at `public/login-bg.jpg`.  
> The image from `code.html` (`lh3.googleusercontent.com/…`) must be downloaded and saved locally — do not reference external CDN URLs in production.

### 6.3 Right panel (Card → form panel)

OM renders `<div class="w-full card ...">` inside the outer wrapper. Override it to become a scrollable right-side panel.

```css
  /* Card → right panel */
  body:has([data-auth-ready]) .min-h-svh.flex.items-center.justify-center > div {
    flex: 0 0 50%;
    min-height: 100svh;
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: var(--background);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    overflow-y: auto;
  }

  @media (max-width: 1023px) {
    body:has([data-auth-ready]) .min-h-svh.flex.items-center.justify-center > div {
      flex: 1 1 100%;
      padding-inline: 1.5rem;
    }
  }
```

### 6.4 Hide OM CardHeader (logo + default title)

The BREMER wordmark and page title are provided by `BremerLoginSection` (Layer B). The default OM header must be hidden.

```css
  /* Hide default OM logo + title */
  body:has([data-auth-ready]) [class*="CardHeader"],
  body:has([data-auth-ready]) [class*="card-header"] {
    display: none;
  }
```

### 6.5 CardContent padding reset

```css
  body:has([data-auth-ready]) [class*="CardContent"],
  body:has([data-auth-ready]) [class*="card-content"] {
    padding: 0;
    width: 100%;
    max-width: 28rem;
  }
}
```

---

## 7. Layer B — Component Override Spec

### 7.1 `BremerLoginSection.tsx`

**Path:** `src/components/login/BremerLoginSection.tsx`  
**Directive:** `"use client"`

#### Props interface

```ts
interface Props {
  children: React.ReactNode  // OM form (email, password, submit, etc.)
}
```

#### Render structure

```
<div class="w-full max-w-md flex flex-col gap-10 px-6 lg:px-0">
  ├── <header>                          ← BREMER wordmark + page title
  │   ├── <div>                         ← Logo row
  │   │   ├── <span>BREMER</span>       ← text-[--login-primary] font-black text-3xl uppercase tracking-tighter
  │   │   ├── <div> (separator)         ← h-6 w-px bg-border/30 mx-2
  │   │   └── <span>POLSKA</span>       ← text-muted-foreground font-medium tracking-widest text-xs uppercase
  │   └── <div>                         ← Title block
  │       ├── <h1>Logowanie</h1>        ← text-3xl font-bold tracking-tight
  │       └── <p>Portal Klienta…</p>    ← text-muted-foreground font-medium
  └── {children}                        ← OM form (unmodified)
```

#### Input/label re-skin (CSS in globals.css Layer A)

Rather than re-rendering inputs (which would break OM's controlled state), re-skin the OM-rendered inputs via CSS within the login scope:

```css
@layer bremer-login {
  /* Input ghost border */
  body:has([data-auth-ready]) input[type="email"],
  body:has([data-auth-ready]) input[type="password"],
  body:has([data-auth-ready]) input[type="text"] {
    height: 3rem;            /* 48 px */
    border-color: color-mix(in srgb, var(--border) 50%, transparent);
    border-radius: var(--radius-lg);
    background: var(--background);
    padding-left: 2.75rem;   /* room for icon — see 7.2 */
    transition: border-color 150ms, box-shadow 150ms;
  }

  body:has([data-auth-ready]) input[type="email"]:focus,
  body:has([data-auth-ready]) input[type="password"]:focus {
    border-color: var(--login-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--login-primary) 20%, transparent);
    outline: none;
  }

  /* Label typography */
  body:has([data-auth-ready]) label {
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted-foreground);
  }

  /* Submit button */
  body:has([data-auth-ready]) button[type="submit"] {
    height: 3.5rem;           /* 56 px */
    background: var(--login-primary);
    border-radius: var(--radius-lg);
    font-weight: 700;
    box-shadow: 0 4px 24px color-mix(in srgb, var(--login-primary) 25%, transparent);
    transition: background 150ms, transform 100ms;
  }

  body:has([data-auth-ready]) button[type="submit"]:hover {
    background: var(--login-primary-hover);
  }

  body:has([data-auth-ready]) button[type="submit"]:active {
    transform: scale(0.99);
  }

  body:has([data-auth-ready]) button[type="submit"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  /* "Forgot password" link */
  body:has([data-auth-ready]) a[href="/reset"] {
    color: var(--login-primary);
    font-size: 0.75rem;
    font-weight: 600;
    text-decoration: none;
  }

  body:has([data-auth-ready]) a[href="/reset"]:hover {
    text-decoration: underline;
  }
}
```

### 7.2 Input icons

OM renders plain `<input>` elements — there are no icon slots in the markup. To add the `@` and lock icons from the design without modifying OM, use CSS `::before` on the wrapping `<div>` with a background-image SVG data URI.

```css
  /* Icon wrapper — target the grid gap div around each label+input pair */
  body:has([data-auth-ready]) input[type="email"],
  body:has([data-auth-ready]) input[type="password"] {
    /* Space already reserved by padding-left: 2.75rem above */
  }

  /* Email icon */
  body:has([data-auth-ready]) input[type="email"]::placeholder {
    padding-left: 0; /* icon is via wrapper, not input itself */
  }

  /* Wrap each input in a positioned container to place the icon */
  body:has([data-auth-ready]) .grid.gap-1 {
    position: relative;
  }

  body:has([data-auth-ready]) input[type="email"] {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23a0a3b1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3Cpath d='M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: 0.875rem center;
    background-size: 1.125rem;
  }

  body:has([data-auth-ready]) input[type="password"] {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23a0a3b1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='11' x='3' y='11' rx='2' ry='2'/%3E%3Cpath d='M7 11V7a5 5 0 0 1 10 0v4'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: 0.875rem center;
    background-size: 1.125rem;
  }
```

### 7.3 Register the override in `components.ts`

Add to `src/modules/warranty_claims/widgets/components.ts`:

```ts
import { ComponentReplacementHandles, type ComponentOverride } from '@open-mercato/shared/modules/widgets/component-registry'
import * as React from 'react'
import dynamic from 'next/dynamic'

const BremerLoginSection = dynamic(
  () => import('@/components/login/BremerLoginSection'),
  { ssr: false }
)

const loginOverride: ComponentOverride = {
  target: { componentId: 'section:auth.login.form' },
  priority: 100,
  metadata: { module: 'warranty_claims' },
  replacement: BremerLoginSection,
  propsSchema: {
    safeParse: (props: unknown) => ({ success: true, data: props }),
  },
}
```

Append `loginOverride` to the exported `componentOverrides` array.

**Note on `propsSchema`:** OM requires a Zod-compatible `propsSchema` on replacements in dev mode. Since `BremerLoginSection` accepts any `{ children }`, a pass-through schema is sufficient. If the project already uses Zod, replace with `z.object({ children: z.any() })`.

---

## 8. Glassmorphism Card (Left Panel)

The "Innowacja & Solidność" card at the bottom-left of the image is a pure CSS addition on the left panel `::before` pseudo-element. Since `::before` cannot contain child elements, use `::after` on the same element for the card, OR add a real DOM element.

**Recommended approach:** Add a portal-rendered React component that positions absolutely over the left panel:

Create `src/components/login/BremerLoginHero.tsx`:
- Rendered from within `BremerLoginSection` using a React Portal targeting `document.body`
- Absolutely positioned: `fixed left-0 bottom-12 w-[calc(50%-3rem)]` (visible only `lg:`)
- Contains the icon box, title, subtitle text from the design
- Uses `backdrop-blur-md bg-black/20 border border-white/10 rounded-xl p-8`

This avoids any OM structure dependency — it's an overlay appended to `body`.

**Media query:** wrap portal render in `useMediaQuery('(min-width: 1024px)')` — do not render on mobile.

---

## 9. Typography Adjustments

The `CardHeader` is hidden (§6.4), so OM's `<h1>` inside it is hidden. The replacement `<h1>` in `BremerLoginSection` is the only heading — no duplication.

Replace OM's `"DM Sans"` on the login page:

```css
body:has([data-auth-ready]) {
  font-family: "Inter", var(--font-sans);
}
```

Inter is already loaded via the design spec `code.html` (CDN link). For production, add to `layout.tsx` font imports alongside `DM_Sans`:

```ts
import { DM_Sans, JetBrains_Mono, Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})
```

Use `--font-inter` in the scoped CSS instead of the CDN fallback.

---

## 10. Footer (Wsparcie / Prywatność)

These links are part of `BremerLoginSection` — rendered below `{children}` inside the max-width wrapper:

```
<footer class="pt-8 border-t border-border/20">
  <p class="text-xs text-muted-foreground/70 mb-6">
    Nie masz jeszcze konta? Skontaktuj się ze swoim kierownikiem projektu BREMER.
  </p>
  <div class="flex gap-6">
    <a href="/support">WSPARCIE</a>
    <a href="/privacy">PRYWATNOŚĆ</a>
  </div>
</footer>
```

Do not link to OM's `/reset` in the footer — that is already rendered by OM inside `{children}` (the "Forgot password?" link).

---

## 11. What Is NOT Changed

- `node_modules/@open-mercato/**` — zero modifications
- `src/bootstrap.ts` — not modified (component-overrides.generated.ts is regenerated by `yarn generate`)
- `src/app/layout.tsx` — not modified (Inter font import is additive to the existing font list)
- Login API route `/api/auth/login` — untouched
- Any other page — CSS scoped to `body:has([data-auth-ready])` activates only on `/login`

---

## 12. Regeneration Step

After adding `loginOverride` to `components.ts`, run:

```bash
yarn generate
```

This re-scans `src/modules/**/widgets/components.ts` and regenerates `.mercato/generated/component-overrides.generated.ts`, which then includes the `BremerLoginSection` override in the bootstrap registry.

---

## 13. Acceptance Criteria

| # | Criterion | How to verify |
|---|-----------|--------------|
| 1 | Left panel shows warehouse image on `lg:` and above | Visual check at 1280 px width |
| 2 | Glassmorphism hero card appears bottom-left on desktop | Visual check |
| 3 | BREMER wordmark + POLSKA separator visible on right panel | Visual check |
| 4 | Login form submits and redirects correctly | Submit with valid credentials |
| 5 | Invalid credentials show OM error banner inside form | Submit with wrong password |
| 6 | "Nie pamiętasz hasła?" link navigates to `/reset` | Click the link |
| 7 | "Zapamiętaj mnie" checkbox state is sent with form POST | Check network POST body |
| 8 | Mobile view (<1024 px): single-column, no image, form fills viewport | DevTools mobile view |
| 9 | `yarn generate` completes without errors after code change | CI / local terminal |
| 10 | No OM core files modified (`git diff node_modules` is empty) | `git status` |
