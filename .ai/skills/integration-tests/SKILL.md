---
name: integration-tests
description: Run and create Playwright QA tests for the standalone my-guarancy app, including existing `.ai/qa/tests` coverage and module-local `__integration__` tests.
---

# Integration Tests

Use this skill when the task is to run QA tests, create a regression test, or convert a feature into Playwright coverage.

## Commands

```bash
yarn test:integration
npx playwright test --config .ai/qa/tests/playwright.config.ts <path-to-test-file>
npx playwright test --config .ai/qa/tests/playwright.config.ts <path-to-test-file> --retries=0
```

## Test Locations

- Preferred: `src/modules/<module>/__integration__/TC-*.spec.ts`
- Legacy or repo-wide: `.ai/qa/tests/**/*.spec.ts`

## Workflow

1. Read the spec or feature request.
2. Explore the running app before writing selectors.
3. Create the smallest deterministic Playwright test that covers the happy path first.
4. Clean up any test data created during the run.
5. Run the test and fix failures before finishing.

## Rules

- Do not guess selectors
- Do not hardcode IDs that can be discovered at runtime
- Keep tests isolated and deterministic
- Use `.ai/qa/tests/playwright.config.ts` for local runs
