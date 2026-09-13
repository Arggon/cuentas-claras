---
spec_id: rest-api-persistence-003
title: REST API + JSON file persistence
status: implemented
created: 2026-09-13
---

# Spec: REST API + JSON file persistence (rest-api-persistence-003)

Tracked as `task-issue-4` (GitHub issue #4). Sits on the ledger (ledger-balances-001) and settlement (settlement-min-transfers-002) specs; consumed by the UI (#5), CSV import (#2) and digest (#6).

## Purpose

Expose the ledger over HTTP and persist it in `data/ledger.json` exactly as `docs/data-format.md` defines. Storage sits behind a repository interface so it can move to SQLite later without touching routes (ADR 0002). The ledger file is never corrupted: every write goes through an atomic tmp-file + rename, and read-modify-write cycles are serialized within the process.

## Synopsis

Endpoints (all JSON; `Content-Type: application/json` on writes):

- `GET /health` → `{ ok: true }` (kept as-is).
- `GET /members` → `string[]`; `POST /members { name }` → 201. Members are needed before expenses exist (the UI form depends on them); part of the ledger, not scope creep.
- `POST /expenses` — body `{ date, description, amountCents, paidBy, participants }`, validated against `docs/data-format.md`: ISO `YYYY-MM-DD` date, non-empty description, positive integer cents, `paidBy` a known member, `participants` ⊆ members (empty = all), no duplicate participants. 201 → created expense with server-assigned `id`. 400 `{ error }` on any violation.
- `GET /expenses` → `Expense[]`.
- `GET /balances` → `Balance[]` (pure ledger module output).
- `GET /settlement` → `Transfer[]` (pure settlement module output).

Layering: `src/app.ts` exports `createApp(store)` (Express stays here); `src/store.ts` defines `LedgerRepository` + `FileLedgerRepository` (the only module touching `fs`); `src/index.ts` wires env (`PORT`, `LEDGER_PATH` → default `data/ledger.json`) and listens. Validation lives in `src/validate.ts` (pure, reusable by importers).

## Acceptance

- [ ] All six endpoints behave as specified; health kept.
- [ ] Invalid expense bodies are rejected 400 with a reason; valid ones are appended and returned 201.
- [ ] Persistence: expenses/members survive process restart (file reload round-trip in tests); no `.tmp-*` files left behind; `data/ledger.json` stays valid JSON after concurrent-ish sequential writes.
- [ ] Storage is behind `LedgerRepository`; `app.ts` never imports `node:fs`.
- [ ] `npm test` + `npm run build` green (integration tests boot the app on an ephemeral port and use native `fetch`).
