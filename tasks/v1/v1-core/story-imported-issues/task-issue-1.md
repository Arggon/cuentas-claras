---
type: task
status: in_progress
id: task-issue-1
title: "issue #1: Ledger engine: balances from expenses"
assignee: Arggon
branch: feat/task-issue-1
parent: story-imported-issues
labels: []
created: "2026-09-13"
updated: "2026-09-13"
claimed_at: "2026-09-13T04:15:20.714Z"
worktree_path: /home/arggon/Projects/cuentas-claras-task-issue-1
---
Core module (pure, no I/O): given members + expenses, compute each member's net balance in cents.

- Split an expense evenly across `participants` (empty participants = all members).
- Remainder cents (when the split doesn't divide evenly) go to the payer.
- Output: `Balance[]` sorted by member name.

This blocks everything else — API, UI and settlement all consume it.
> imported from issue #1

## Acceptance

- [x] Split an expense evenly across `participants` (empty = all members) — `computeBalances` in `src/ledger.ts`, covered by ledger tests.
- [x] Remainder cents go to the payer — payer credit is `share * (n-1)`; sum stays zero.
- [x] Output `Balance[]` sorted by member name, every member exactly once.
- [x] Pure module (no I/O), deterministic; consumed later by settlement/API/UI.
- [x] `npm test` green (7 tests) + `npm run build` (strict tsc) green.

Implemented per docs/specs/spec-ledger-balances-001.md (status: implemented).
