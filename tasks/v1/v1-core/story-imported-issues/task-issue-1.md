---
type: task
status: todo
id: task-issue-1
title: "issue #1: Ledger engine: balances from expenses"
parent: story-imported-issues
labels: []
created: "2026-09-13"
updated: "2026-09-13"
---
Core module (pure, no I/O): given members + expenses, compute each member's net balance in cents.

- Split an expense evenly across `participants` (empty participants = all members).
- Remainder cents (when the split doesn't divide evenly) go to the payer.
- Output: `Balance[]` sorted by member name.

This blocks everything else — API, UI and settlement all consume it.
> imported from issue #1
