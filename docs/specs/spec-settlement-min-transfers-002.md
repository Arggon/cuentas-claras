---
spec_id: settlement-min-transfers-002
title: Minimal settlement calculation (fewest transfers)
status: implemented
created: 2026-09-13
---

# Spec: Minimal settlement calculation (fewest transfers) (settlement-min-transfers-002)

Tracked as `task-issue-3` (GitHub issue #3). Consumes the ledger output (`computeBalances`, spec ledger-balances-001); consumed by the REST API (#4) and UI (#5).

## Purpose

Given balances, compute the shortest list of transfers that clears all debts (classic min-cash-flow). Like the ledger, this is a **pure module**: no I/O, deterministic, integer cents only (ADR 0003).

Invariants:

- `sum(transfers.amountCents) === sum(positive balances)` === `|sum(negative balances)|` — every cent of debt is cleared, none invented.
- No member appears on both sides of the settlement (a net position has one sign).
- Number of transfers is at most `creditors + debtors - 1`; greedy matching of largest creditor ↔ largest debtor achieves the minimum for the pairwise-clearing algorithm family the issue specifies.

## Synopsis

```ts
// src/settlement.ts
function computeSettlement(balances: Balance[]): Transfer[]
```

Algorithm: sort creditors (net > 0) and debtors (net < 0) by amount descending; repeatedly match the largest creditor with the largest debtor for `min(due, owed)` until both lists are exhausted. Zero balances participate in no transfer. Output order: match order (largest first).

## Acceptance

- [ ] Balances summing to zero produce transfers that also sum to zero-side debt exactly (sum of transfers = total owed to creditors).
- [ ] Nobody appears on both `from` and `to` sides of the settlement.
- [ ] A creditor matched against several smaller debtors (and vice versa) settles fully; partial amounts are exact integer cents.
- [ ] Empty / all-zero balances produce an empty transfer list.
- [ ] Integration with the ledger: `computeSettlement(computeBalances(...))` over mixed remainder-bearing expenses satisfies the properties above.
- [ ] `npm test` green; module imports nothing beyond `./types.js` and `./ledger.js` (tests only).
