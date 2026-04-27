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
