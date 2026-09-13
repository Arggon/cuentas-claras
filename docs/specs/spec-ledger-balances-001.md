---
spec_id: ledger-balances-001
title: Ledger engine: balances from expenses
status: implemented
created: 2026-09-13
---

# Spec: Ledger engine: balances from expenses (ledger-balances-001)

Tracked as `task-issue-1` (GitHub issue #1). Consumed by settlement (issue #3), the REST API (#4), the UI (#5) and the digest (#6).

## Purpose

Given a group's members and its expenses, compute each member's net balance in integer cents: how much the group owes them (positive) or they owe the group (negative). This is the arithmetic heart of cuentas-claras — every other feature reads its output, so it must be a **pure module**: no I/O, no clock, no environment, deterministic for the same input.

Invariants:

- Money is integer cents everywhere (ADR 0003); no floats, no rounding beyond the remainder rule.
- Balances always sum to zero (every cent someone paid is someone else's share).
- Every member appears exactly once in the output, even with a zero balance.

## Synopsis

```ts
// src/ledger.ts
function computeBalances(members: string[], expenses: Expense[]): Balance[]
```

Rules (from the issue + `docs/data-format.md`):

1. Each expense's `amountCents` is split evenly across its `participants`.
2. Empty `participants` means "all `members`".
3. Remainder cents (when the split does not divide evenly) go to the **payer** — the payer's net absorbs `amountCents - share * (n - 1)`; every other participant contributes `share`.
4. Output is a `Balance[]` with one entry per member, sorted by member name (lexicographic).
5. Defensive rule: if `paidBy` is not among the effective participants, the payer is joined to the split — this is what keeps `sum(netCents) === 0` for any integer input.

Inputs are assumed validated at the edge (`paidBy` is a member, participants are members and unique, amounts are non-negative integer cents) — importers and the API own validation.

## Acceptance

- [ ] Even split: an expense of 300 split by 3 members yields +300 payer, −100 per other participant.
- [ ] Remainder: an expense of 100 split by 3 yields shares of 33/33 and the payer absorbing the extra cent (payer net = 100 − 66 = +34).
- [ ] Empty `participants` splits across all members.
- [ ] Output contains every member exactly once (zero balance included), sorted by name.
- [ ] Property: for any input, `sum(netCents) === 0`.
- [ ] A payer omitted from `participants` is joined to the split (sum stays zero).
- [ ] Multiple expenses accumulate additively per member.
- [ ] `npm test` green; module has no imports beyond `./types`.
