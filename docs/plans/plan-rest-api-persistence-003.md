---
plan_id: rest-api-persistence-003
title: Plan for REST API + JSON file persistence
spec: docs/specs/spec-rest-api-persistence-003.md
status: implemented
created: 2026-09-13
---

# Plan: REST API + JSON file persistence (rest-api-persistence-003)

Derived from `docs/specs/spec-rest-api-persistence-003.md`.

## Tasks

### T1: `Ledger` type + `src/store.ts`

- `Ledger { group, members, expenses }` in `src/types.ts`; `LedgerRepository` interface + `FileLedgerRepository` with serialized mutate + atomic save (tmp + rename).
- **Acceptance:** store tests: default ledger on missing file, append/addMember round-trip via a fresh instance, no tmp leftovers.

### T2: `src/validate.ts` (pure validation)

- `parseExpenseInput(body, members)` → `{ ok, expense-fields } | { ok: false, error }` per data-format rules; `parseMemberInput`.
- **Acceptance:** unit tests for each rejection rule and the happy path.

### T3: `src/app.ts` + `src/index.ts`

- `createApp(store)` mounts the six endpoints; central error middleware; index wires env + listen.
- **Acceptance:** integration tests via ephemeral port + fetch for every endpoint and every 400 branch.

### T4: Gates

- **Acceptance:** `npm test` + `npm run build` green; `arggon validate` ok.
