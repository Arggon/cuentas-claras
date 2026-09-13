---
type: task
status: todo
id: task-issue-4
title: "issue #4: REST API + JSON file persistence"
parent: story-imported-issues
labels: [enhancement]
created: "2026-09-13"
updated: "2026-09-13"
depends_on: [task-issue-3]
---
Expose the ledger over HTTP and persist it.

- POST /expenses (validate against data-format.md), GET /expenses, GET /balances, GET /settlement.
- Persistence: data/ledger.json with atomic write (tmp + rename), per docs/DECISIONS.md.
- Repository interface so the storage can move to SQLite later without touching the API layer.
- Keep the health endpoint.
> imported from issue #4
