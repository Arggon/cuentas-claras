---
type: task
status: todo
id: task-issue-3
title: "issue #3: Minimal settlement calculation (fewest transfers)"
parent: story-imported-issues
labels: [enhancement]
created: "2026-09-13"
updated: "2026-09-13"
depends_on: [task-issue-1]
---
Given balances, compute the shortest list of transfers that clears all debts (min cash flow).

- Classic greedy: match largest creditor with largest debtor until exhausted.
- Output Transfer[] { from, to, amountCents }.
- Property to test: sum of transfers equals sum of debts; nobody appears on both sides twice unnecessarily.
- Pure function — same module family as the ledger engine.
> imported from issue #3
