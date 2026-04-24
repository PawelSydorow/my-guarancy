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
