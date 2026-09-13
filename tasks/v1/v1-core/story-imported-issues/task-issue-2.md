---
type: task
status: in_progress
id: task-issue-2
title: "issue #2: Import expenses from CSV (bank / Splitwise-style export)"
assignee: Arggon
branch: feat/task-issue-2
parent: story-imported-issues
labels: [enhancement]
created: "2026-09-13"
updated: "2026-09-13"
claimed_at: "2026-09-13T04:37:27.711Z"
depends_on: [task-issue-4]
worktree_path: /home/arggon/Projects/cuentas-claras-task-issue-2
---
CLI flag or endpoint that ingests a CSV of expenses and appends them to the ledger.

- Columns: date, description, amount, paid_by, participants (semicolon-separated).
- Validate: amounts parse to integer cents (accept 12.34 and 12,34), paid_by must be a known member (else reject the row and report it), dates are ISO.
- Idempotent import: same file twice must not duplicate expenses.
- Report: imported / rejected rows with reasons.
> imported from issue #2
