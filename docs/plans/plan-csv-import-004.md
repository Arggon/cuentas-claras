---
plan_id: csv-import-004
title: Plan for Import expenses from CSV
spec: docs/specs/spec-csv-import-004.md
status: implemented
created: 2026-09-13
---

# Plan: Import expenses from CSV (csv-import-004)

Derived from `docs/specs/spec-csv-import-004.md`. Each task carries a
verifiable acceptance criterion and links back to the spec.

## Tasks

### T1: Pure parser in `src/csv.ts`

- `parseCsvExpenses(text, members)`: basic RFC 4180 reader (quotes, `""`, commas and
  newlines inside quoted fields, `\n`/`\r\n`), header row matched by name, per-row
  validation (ISO date, amount → integer cents per ADR 0003, `paid_by` known member,
  non-empty description, `;`-separated known unique participants), deterministic
  `exp_` + truncated sha256 ids.
- **Acceptance:** `npx tsc -p tsconfig.json` compiles; module imports only
  `node:crypto`, `./types` and `./validate`.

### T2: Unit tests in `src/csv.test.ts`

- Table-driven: both decimal separators, 1/2/0 decimal digits, rejections (3 decimals,
  two separators, negative, zero, garbage), bad dates, empty description, unknown
  `paid_by`, unknown/duplicate participants, empty participants, quoting, CRLF,
  empty file, deterministic ids.
- **Acceptance:** `npm test` green; every parser acceptance bullet in the spec maps to an `it()`.

### T3: Router in `src/routes-import.ts` + mount in `src/app.ts`

- `importRouter(store)`: `POST /expenses/import` with `express.text({ type: 'text/csv', limit: '1mb' })`;
  loads the ledger, skips ids already present or seen in-batch, appends the rest,
  answers 200 with `{ imported, duplicates, rejected }`. Mounted in `src/app.ts`
  with a single `app.use(importRouter(store))` line before the error middleware to
  minimize conflicts with parallel branches.
- **Acceptance:** integration tests POST a CSV, see the rows via GET /expenses,
  re-POST the same file → `imported: 0, duplicates: n`; unknown `paid_by` row lands
  in `rejected` while the rest imports.

### T4: Docs + work item

- "CSV import format" section in `docs/data-format.md`; `## Acceptance` checklist in
  `tasks/v1/v1-core/story-imported-issues/task-issue-2.md`; spec/plan flipped to
  `implemented` in the same PR.
- **Acceptance:** `arggon validate --json` → `ok:true`; docs match the shipped behavior.
