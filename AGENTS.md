# Standalone App Guidelines

This repository is a standalone `my-guarancy` application built on Open Mercato packages. Keep guidance focused on the app itself, not the parent monorepo.

## Project Layout

- App code lives in `src/`
- Local modules live in `src/modules/<module>/`
- App bootstrapping happens in `src/bootstrap.ts`
- Module enablement lives in `src/modules.ts`
- App-level DI lives in `src/di.ts`
- Generated artifacts live in `.mercato/generated/`
- Integration QA assets live in `.ai/qa/`
- Working specs live in `.ai/specs/`

## What Matters Here

- Use `@app` for local modules and `@open-mercato/*` for framework packages
- Keep modules self-contained and avoid cross-module shortcuts
- Run `yarn generate` after changing modules, pages, navigation, or module enablement
- Treat `.mercato/generated/` as generated output only
- Keep specs and tests close to the feature when practical

## Commands

```bash
yarn dev
yarn dev:verbose
yarn build
yarn lint
yarn test
yarn test:integration
yarn generate
yarn db:generate
yarn db:migrate
yarn initialize
```

## When To Use Skills

- `backend-ui-design` for backend/admin UI, forms, tables, and detail pages
- `check-and-commit` for verification-first cleanup before a commit
- `code-review` for code and architecture reviews
- `create-agents-md` when rewriting or creating agent guidance files
- `ds-guardian` for design-system audits and UI token cleanup
- `fix-specs` when normalizing legacy spec filenames and references
- `implement-spec` for phased spec execution
- `integration-tests` for Playwright coverage and QA runs
- `migrate-mikro-orm` for MikroORM upgrade work
- `pre-implement-spec` before complex spec execution
- `skill-creator` for creating or updating skills
- `smart-test` for targeted test selection and test impact analysis
- `spec-writing` for new specs and architecture notes

## Simple Rules

- Prefer the smallest change that solves the problem
- Do not add workflow files or AI automation unless they are actually used here
- Keep documentation aligned with the current standalone app, not the source project it came from
