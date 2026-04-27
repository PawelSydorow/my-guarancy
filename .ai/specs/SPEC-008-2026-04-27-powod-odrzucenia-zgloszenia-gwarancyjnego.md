# SPEC-008: Powód odrzucenia zgłoszenia gwarancyjnego

**Data:** 2026-04-27  
**Status:** Draft

---

## Problem

Gdy administrator zmienia status zgłoszenia na `odrzucona`, nie ma możliwości zapisania powodu odrzucenia. Klient w portalu widzi tylko status bez wyjaśnienia.

---

## Zakres

- Modal z formularzem pojawia się gdy użytkownik wybierze status `odrzucona` w formularzu edycji
- Powód jest wymagany — nie można zatwierdzić bez jego podania
- Powód zapisywany w bazie w kolumnie `rejection_reason` na encji `WarrantyClaim`
- Powód widoczny w widoku edycji (backoffice) i podglądzie dla klienta (portal)
- Nie dotyczy tworzenia nowego zgłoszenia (domyślny status to `oczekuje`)

Poza zakresem:
- Historia zmian statusów
- Powód przy innych statusach
- Możliwość edycji powodu po zapisaniu (jest w formularzu edycji jako pole tekstowe)

---

## Zmiany danych

### Migracja bazy danych

Nowa kolumna w tabeli `warranty_claims_claims`:

```sql
ALTER TABLE warranty_claims_claims
  ADD COLUMN rejection_reason TEXT NULL;
```

### Encja `WarrantyClaim`

Nowe pole:

```typescript
@Property({ name: 'rejection_reason', type: 'text', nullable: true })
rejectionReason?: string | null
```

Dodać `'rejectionReason'` do `[OptionalProps]`.

### Validator (`data/validators.ts`)

Dodać do `warrantyClaimBaseSchema`:

```typescript
rejection_reason: z.string().nullable().optional(),
```

Dodać custom refinement na `warrantyClaimUpdateSchema`:

```typescript
.superRefine((data, ctx) => {
  if (data.status_key === WARRANTY_STATUS_KEYS.rejected && !data.rejection_reason?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rejection_reason'],
      message: 'Podaj powód odrzucenia',
    })
  }
})
```

### Logika (`lib/claim-logic.ts`)

Analogicznie do `resolveResolvedAt()` — dodać `resolveRejectionReason()`:

```typescript
function resolveRejectionReason(statusKey: string, rejectionReason: string | null | undefined): string | null {
  if (statusKey !== WARRANTY_STATUS_KEYS.rejected) return null
  return rejectionReason ?? null
}
```

Wywołać w `prepareClaimInput()` i zmapować na encję.

### Serializacja (`serializeClaimRecord`)

Dodać pole `rejection_reason: string | null` do zwracanego obiektu i do typu `WarrantyClaimRecord`.

---

## Zachowanie UI — backoffice

### Formularz edycji (`WarrantyClaimForm.tsx`)

**Trigger modalu:**  
`SegmentedSelectField` (status) — przy zmianie wartości na `odrzucona` zamiast od razu ustawić wartość w react-hook-form, otwieramy modal.

Implementacja: handler `onChange` na polu status sprawdza nową wartość. Jeśli `=== WARRANTY_STATUS_KEYS.rejected`, otwiera modal; w przeciwnym razie normalnie ustawia pole.

**Modal:**
- Tytuł: *"Odrzucenie zgłoszenia"*
- Treść: pole textarea `rejection_reason`, label *"Powód odrzucenia"*, wymagane
- Przyciski: *"Anuluj"* (zamknij modal, nie zmieniaj statusu) | *"Odrzuć zgłoszenie"* (variant destructive)
- Po potwierdzeniu: ustaw `status_key = 'odrzucona'` i `rejection_reason` w react-hook-form, zamknij modal
- Po anulowaniu: status wraca do poprzedniej wartości

**Pole `rejection_reason` w formularzu:**  
W sekcji formularza dodać pole `TextareaField` `rejection_reason` (widoczne zawsze gdy `status_key === 'odrzucona'`), edytowalne — umożliwia późniejszą korektę powodu bez otwierania modalu ponownie.

**Pattern modalu:**  
Użyć istniejącego `useConfirmDialog` z `@open-mercato/ui/backend/confirm-dialog` z rozszerzeniem o pole tekstowe, **LUB** jeśli hook nie wspiera treści formularza — użyć zwykłego `Dialog`/`DialogContent` z `@open-mercato/ui`.

---

## Zachowanie UI — portal klienta

### `PortalClaimDetail.tsx`

Gdy `status_key === 'odrzucona'` i `rejection_reason` jest niepuste — wyświetlić sekcję/alert z powodem odrzucenia. Przykład:

```
[ikona XCircle] Zgłoszenie odrzucone
Powód: <treść powodu>
```

Użyć semantic tokenów statusu błędu (`status-error-*`) dla spójności z `WARRANTY_STATUS_BADGE_MAP`.

### API portalu (`/api/warranty_claims/portal/claims/[id]`)

Upewnić się, że `rejection_reason` jest zwracane w odpowiedzi (przez `serializeClaimRecord`).

---

## Plan implementacji

### Faza 1 — Backend

1. Migracja DB: dodać kolumnę `rejection_reason TEXT NULL`
2. Encja: dodać pole `rejectionReason`
3. `yarn db:generate` + `yarn db:migrate`
4. Validator: dodać pole + refinement dla `update`
5. Logika: `resolveRejectionReason()` + mapowanie w `prepareClaimInput()`
6. Serializacja: dodać `rejection_reason` do `WarrantyClaimRecord` i `serializeClaimRecord`

### Faza 2 — Backoffice UI

1. Modal odrzucenia: komponent lub hook z polem textarea
2. Handler onChange na `SegmentedSelectField` w `WarrantyClaimForm`
3. Pole `rejection_reason` (textarea) w formularzu edycji — warunkowe wyświetlanie
4. `yarn generate`

### Faza 3 — Portal UI

1. Sekcja powodu odrzucenia w `PortalClaimDetail`
2. Weryfikacja że API portalu zwraca `rejection_reason`

---

## Ryzyka i edge case'y

| Ryzyko | Uwaga |
|--------|-------|
| Istniejące rekordy z `status_key = 'odrzucona'` | Kolumna nullable — brak migracji danych, `rejection_reason` będzie `null`; UI nie pokaże sekcji gdy `null` |
| `useConfirmDialog` nie wspiera treści formularza | Fallback: dialog z `@open-mercato/ui` z własnym stanem |
| Zmiana statusu z `odrzucona` na inny | `resolveRejectionReason()` czyści pole (zwraca `null`) |
| Validator na `create` | Refinement tylko na `warrantyClaimUpdateSchema` — tworzenie nie wymaga powodu |

---

## Plan testów

- [ ] Zmiana statusu na `odrzucona` bez powodu → błąd walidacji z backendu
- [ ] Zmiana statusu na `odrzucona` z powodem → zapis OK, `rejection_reason` w odpowiedzi
- [ ] Zmiana statusu z `odrzucona` na inny → `rejection_reason` wyczyszczone w DB
- [ ] Modal: anulowanie → status nie zmienia się
- [ ] Modal: potwierdzenie → status i powód zapisane w formularzu
- [ ] Portal: `rejection_reason` widoczny gdy `status = odrzucona` i niepuste
- [ ] Portal: sekcja ukryta gdy `rejection_reason = null`
