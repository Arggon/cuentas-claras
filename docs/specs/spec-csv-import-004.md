---
spec_id: csv-import-004
title: Import expenses from CSV
status: implemented
created: 2026-09-13
---

# Spec: Import expenses from CSV (csv-import-004)

Tracked as `task-issue-2` (GitHub issue #2). Extends the write side of the REST API
(spec-rest-api-persistence-003) with a bulk, idempotent entry point for bank /
Splitwise-style exports. Amount handling follows ADR 0003 (integer cents, exact parse
or rejection); `paid_by` validation follows `docs/data-format.md`.

## Purpose

Let a group seed the ledger from a CSV export instead of typing expenses one by one.
The import must be **safe to re-run**: importing the same file twice must never
duplicate expenses. Per-row validation failures reject only the offending row — one
bad line never poisons the whole file.

Invariants:

- Money is integer cents everywhere (ADR 0003). A decimal amount that does not parse
  exactly (e.g. more than 2 decimal places) is rejected, never rounded.
- `paid_by` must be a known member; unknown participants are rejected the same way.
- Deterministic ids: the same logical row always maps to the same expense id, so
  re-importing is a no-op for already-imported rows.
- The parser is a **pure module**: text + member list in, rows + errors out; no I/O,
  no clock, no store access.

## CSV format

- First non-empty record is a **header row** naming the columns (required; order
  independent, matched case-insensitively after trimming). Required columns:
  `date`, `description`, `amount`, `paid_by`, `participants`. Extra columns are ignored.
- Each data row is one expense: ISO date (`YYYY-MM-DD`), non-empty description,
  decimal amount, `paid_by` member name, `participants` as member names separated
  by `;` (an empty cell = everyone, matching the ledger's "empty participants" rule;
  empty names *inside* a non-empty cell, e.g. `sol;;martin`, reject the row).
- Both `\n` and `\r\n` line endings are accepted; a leading UTF-8 BOM is stripped
  (Excel-produced exports carry one).
- Quoting: **basic RFC 4180** is supported — a field may be wrapped in double quotes
  to contain commas (and newlines); `""` inside a quoted field is a literal quote.
  This is a deliberate choice: descriptions like `"Dinner, drinks, tip"` are common
  in real exports.
- Amount: accepts `12.34` (dot) and `12,34` (comma) as the decimal separator, plus
  plain integers (`12` → 1200 cents) and one decimal digit (`12.5` → 1250). At most
  one separator; at most 2 decimal places; digits only otherwise. Anything else —
  `12.345`, `1,234.56` (two separators), negative, zero, non-numeric — rejects the row.

## Idempotency

Each parsed row gets the deterministic id `exp_` + first 16 hex chars of
`sha256("date|description|amountCents|paidBy|participants.join(';')")` over the
normalized (trimmed) field values with cents as an integer. The import endpoint
skips any row whose id already exists in the ledger **or was already seen earlier in
the same file**; skipped rows count as `duplicates`, never as new expenses.

## Synopsis

```ts
// src/csv.ts (pure)
function parseCsvExpenses(text: string, members: string[]): {
  rows: Array<ParsedExpense & { id: string }>; // validated rows with deterministic ids
  errors: Array<{ line: number; reason: string }>; // 1-based file line of the row
}

// src/routes-import.ts
function importRouter(store: LedgerRepository): express.Router;
// POST /expenses/import — body: raw CSV (Content-Type: text/csv, limit 1 MiB)
// → 200 always: { imported: number, duplicates: number, rejected: [{ line, reason }] }
```

- Row errors (`line` is the 1-based file line where the record starts) are reported,
  not fatal: valid rows import, invalid rows land in `rejected`.
- A request body that is not CSV text (wrong/missing `Content-Type: text/csv`) is a
  plain 400 client error; anything that *is* CSV text gets the 200 report.

## Acceptance

- [x] `12.34` and `12,34` both parse to exactly 1234 cents; `12` → 1200; `12.5` → 1250.
- [x] `12.345`, `1,234.56`, `-1.00`, `0`, `abc` and empty amounts reject the row with a reason.
- [x] Non-ISO dates (`10/01/2027`, `2027-13-01`) reject the row.
- [x] Empty or whitespace-only description rejects the row.
- [x] Unknown `paid_by` rejects that row only; the other rows still import.
- [x] Unknown or duplicated participants reject the row; empty `participants` imports.
- [x] Quoted fields with commas, CRLF line endings and a trailing newline parse correctly.
- [x] An empty file reports a missing-header error; a header-only file imports
      nothing and yields an all-zero report.
- [x] Two identical rows in one file (or one row twice across two POSTs) yield one
      expense and `duplicates: 1` on the second occurrence.
- [x] POST /expenses/import answers 200 with `{ imported, duplicates, rejected }` and
      GET /expenses reflects exactly the imported rows; re-POST of the same file
      gives `imported: 0`.
- [x] Parser imports only `node:crypto` and `./validate`/`./types`; no I/O.
- [x] `npm test`, `npm run build` and `arggon validate --json` all green.
