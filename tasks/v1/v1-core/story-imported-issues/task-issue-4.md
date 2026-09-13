---
type: task
status: in_progress
id: task-issue-4
title: "issue #4: REST API + JSON file persistence"
assignee: Arggon
branch: feat/task-issue-4
parent: story-imported-issues
labels: [enhancement]
created: "2026-09-13"
updated: "2026-09-13"
claimed_at: "2026-09-13T04:29:52.896Z"
depends_on: [task-issue-3]
worktree_path: /home/arggon/Projects/cuentas-claras-task-issue-4
---
Expose the ledger over HTTP and persist it.

- POST /expenses (validate against data-format.md), GET /expenses, GET /balances, GET /settlement.
- Persistence: data/ledger.json with atomic write (tmp + rename), per docs/DECISIONS.md.
- Repository interface so the storage can move to SQLite later without touching the API layer.
- Keep the health endpoint.
> imported from issue #4
