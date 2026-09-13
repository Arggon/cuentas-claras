---
type: task
status: done
id: task-issue-2
title: "issue #2: Import expenses from CSV (bank / Splitwise-style export)"
assignee: Arggon
branch: feat/task-issue-2
parent: story-imported-issues
labels: [enhancement]
created: "2026-09-13"
updated: "2026-09-13"
depends_on: [task-issue-4]
---
CLI flag or endpoint that ingests a CSV of expenses and appends them to the ledger.

- Columns: date, description, amount, paid_by, participants (semicolon-separated).
- Validate: amounts parse to integer cents (accept 12.34 and 12,34), paid_by must be a known member (else reject the row and report it), dates are ISO.
- Idempotent import: same file twice must not duplicate expenses.
- Report: imported / rejected rows with reasons.
> imported from issue #2

## Acceptance

- [x] Endpoint `POST /expenses/import` ingests a raw CSV (`Content-Type: text/csv`, 1 MiB limit) via `importRouter(store)` mounted in `src/app.ts`.
- [x] Columns `date,description,amount,paid_by,participants` (header row, order/case insensitive); `participants` is `;`-separated; empty cell = all members.
- [x] Amounts parse to integer cents exactly (ADR 0003): `12.34` and `12,34` → `1234`; 3+ decimals, two separators, negatives, zero and garbage reject the row.
- [x] Dates must be ISO `YYYY-MM-DD`; empty descriptions reject the row.
- [x] Unknown `paid_by` (and unknown/duplicate participants) reject only that row and are reported with the 1-based file line; the rest of the file imports.
- [x] Idempotent: deterministic ids (`exp_` + 16 hex chars of sha256 over the normalized row); re-POSTing the same file reports `imported: 0` and the repeats as `duplicates` — no duplicated expenses in the ledger.
- [x] Report shape `{ imported, duplicates, rejected: [{ line, reason }] }`, always 200 for a CSV body; non-CSV bodies get 400.
- [x] Docs: "CSV import format" section added to `docs/data-format.md`; spec/plan `docs/specs/spec-csv-import-004.md` / `docs/plans/plan-csv-import-004.md` marked implemented.
- [x] Unit tests (`src/csv.test.ts`) cover the parser rules; integration tests (`src/app.test.ts`) cover import, per-row rejection, re-import idempotency, in-file duplicates and empty/non-CSV bodies.
- [x] `npm test`, `npm run build` and `arggon validate --json` all green.
