---
type: task
status: in_progress
id: task-issue-3
title: "issue #3: Minimal settlement calculation (fewest transfers)"
assignee: Arggon
branch: feat/task-issue-3
parent: story-imported-issues
labels: [enhancement]
created: "2026-09-13"
updated: "2026-09-13"
claimed_at: "2026-09-13T04:23:43.129Z"
depends_on: [task-issue-1]
worktree_path: /home/arggon/Projects/cuentas-claras-task-issue-3
---
Given balances, compute the shortest list of transfers that clears all debts (min cash flow).

- Classic greedy: match largest creditor with largest debtor until exhausted.
- Output Transfer[] { from, to, amountCents }.
- Property to test: sum of transfers equals sum of debts; nobody appears on both sides twice unnecessarily.
- Pure function — same module family as the ledger engine.
> imported from issue #3

## Acceptance

- [x] Greedy min-cash-flow: largest creditor matched with largest debtor until exhausted (`computeSettlement` in `src/settlement.ts`).
- [x] Output `Transfer[] { from, to, amountCents }` in exact integer cents.
- [x] Property tested: sum of transfers equals total debt; nobody appears on both sides; count <= creditors + debtors - 1.
- [x] Pure function, same module family as the ledger engine (no I/O).
- [x] `npm test` green (13 tests incl. ledger suite) + `npm run build` green.

Implemented per docs/specs/spec-settlement-min-transfers-002.md (status: implemented).
