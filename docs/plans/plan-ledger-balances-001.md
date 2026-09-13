---
plan_id: ledger-balances-001
title: Plan for Ledger engine: balances from expenses
spec: docs/specs/spec-ledger-balances-001.md
status: implemented
created: 2026-09-13
---

# Plan: Ledger engine: balances from expenses (ledger-balances-001)

Derived from `docs/specs/spec-ledger-balances-001.md`. Each task carries a
verifiable acceptance criterion and links back to the spec.

## Tasks

### T1: Implement `computeBalances` in `src/ledger.ts`

- Pure function per the spec synopsis; table accumulated with integer cents; remainder to payer; output sorted by member name.
- **Acceptance:** `npx tsc -p tsconfig.json` compiles; function has no I/O imports (only `../types`-relative domain types).

### T2: Unit tests in `src/ledger.test.ts`

- Table-driven cases for the spec acceptance bullets, plus the sum-zero property over randomized-ish fixed inputs (deterministic, no randomness needed).
- **Acceptance:** `npm test` green; each spec acceptance bullet maps to at least one `it()`.
