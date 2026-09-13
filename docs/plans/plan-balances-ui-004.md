---
plan_id: balances-ui-004
title: Plan for Balances UI (vanilla)
spec: docs/specs/spec-balances-ui-004.md
status: implemented
created: 2026-09-13
---

# Plan: Balances UI (vanilla) (balances-ui-004)

Derived from `docs/specs/spec-balances-ui-004.md`. Each task carries a
verifiable acceptance criterion and links back to the spec.

## Tasks

### T1: Serve the static page from the API

- Mount `express.static` once in `src/app.ts`, after the API routes and before
  the error middleware, resolving `public/` relative to `import.meta.dirname`
  (`../public` works both from `src/` under tsx/vitest and from `dist/` under node).
- **Acceptance:** `GET /` returns 200 with `text/html` (new integration test in
  `src/app.test.ts`); the full suite stays green.

### T2: Page skeleton + styles

- `public/index.html` (Spanish UI, sections: Miembros, Nuevo gasto, Balances,
  Settlement) + `public/styles.css` (dark terminal look, monospace, mobile-friendly
  single column).
- **Acceptance:** the page loads with no framework, no new runtime dependency,
  and is usable at phone width (viewport meta, fluid layout).

### T3: Client logic — members

- `public/app.js`: fetch/render members; add member via `POST /members`;
  rebuild the payer select and participant checkboxes on every refresh.
- **Acceptance:** a member added from the page appears in the members list,
  the payer select and the checkboxes; API 400 errors are displayed.

### T4: Client logic — expense form

- Amount typed as a decimal string, converted exactly to integer cents with
  integer/string arithmetic only (`parseAmountToCents`: `12.34` → 1234, comma
  accepted, >2 decimals or non-numeric rejected before any request); date defaults
  to today (local); participants as checkboxes, none checked → `[]`.
- **Acceptance:** posting from the form creates the expense (visible in
  balances/settlement refresh); `"12.345"` and `""` are rejected client-side.

### T5: Client logic — balances + settlement rendering

- Render `GET /balances` as a table (debe / le deben / en paz) and
  `GET /settlement` as a list of transfers; cents are formatted to currency
  (`formatCents`, integer arithmetic, comma decimal) only at render time;
  re-fetch everything after each mutation.
- **Acceptance:** after adding members + an expense through the UI, the
  balances table and settlement list match `GET /balances` and `GET /settlement`.

### T6: Docs + item hygiene

- Runbook `docs/runbooks/verify-ui.md` (manual verification steps) + index
  bullet in `docs/runbooks/README.md`; `## Acceptance` section ticked in
  `tasks/v1/v1-core/story-imported-issues/task-issue-5.md`; spec/plan flipped
  to `implemented`.
- **Acceptance:** `npm test`, `npm run build` and `arggon validate --json` all
  green; a stranger can verify the UI by following the runbook.
