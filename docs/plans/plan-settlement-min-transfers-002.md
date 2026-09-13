---
plan_id: settlement-min-transfers-002
title: Plan for Minimal settlement calculation (fewest transfers)
spec: docs/specs/spec-settlement-min-transfers-002.md
status: implemented
created: 2026-09-13
---

# Plan: Minimal settlement calculation (fewest transfers) (settlement-min-transfers-002)

Derived from `docs/specs/spec-settlement-min-transfers-002.md`.

## Tasks

### T1: Implement `computeSettlement` in `src/settlement.ts`

- Greedy largest-creditor/largest-debtor matching over integer cents; zero balances excluded.
- **Acceptance:** `npx tsc -p tsconfig.json` compiles; pure function (no I/O imports).

### T2: Unit + property tests in `src/settlement.test.ts`

- Exact-amount cases, cross-matching cases, empty cases; property assertions (sum equality, disjoint sides, transfer-count bound) over ledger-produced balances.
- **Acceptance:** `npm test` green; each spec acceptance bullet maps to at least one `it()`.
