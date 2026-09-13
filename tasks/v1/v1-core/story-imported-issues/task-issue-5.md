---
type: task
status: in_progress
id: task-issue-5
title: "issue #5: Balances UI (vanilla)"
assignee: Arggon
branch: feat/task-issue-5
parent: story-imported-issues
labels: [enhancement]
created: "2026-09-13"
updated: "2026-09-13"
claimed_at: "2026-09-13T04:37:23.015Z"
depends_on: [task-issue-4]
worktree_path: /home/arggon/Projects/cuentas-claras-task-issue-5
---
Single static page served by the API:

- Form to add an expense (who paid, how much, who splits).
- Table of balances (owes / is owed).
- Settlement list from the minimal transfer calculation.
- No framework — plain HTML/CSS/JS, dark terminal look is fine. Mobile-friendly enough to use during a trip.
> imported from issue #5

## Acceptance

- [x] The API serves one static page at `/` (vanilla HTML/CSS/JS from `public/`, mounted in `src/app.ts`); covered by the `serves the UI at /` test.
- [x] Members can be added from the page via `POST /members` (the group starts empty) and appear as chips, in the payer select and as participant checkboxes.
- [x] Expense form posts `date`, `description`, `amountCents`, `paidBy`, `participants`; the decimal amount is converted exactly to integer cents at the UI edge ("12.34" → 1234, comma accepted, >2 decimals rejected before any request — ADR 0003).
- [x] Participants are checkboxes; none checked sends `[]`, which the server reads as "split among all members" (docs/data-format.md).
- [x] Balances table shows owes / is owed / even per member from `GET /balances`, formatting cents to currency only in the UI (integer arithmetic).
- [x] Settlement list (who pays whom and how much) is rendered from `GET /settlement`, with an empty state when nothing is due.
- [x] API 400 bodies (`{ error }`) and network failures are surfaced in the page; UI texts are in Spanish.
- [x] Dark terminal look, single-column on phone width, no framework and no new runtime dependency.
- [x] Manual verification steps documented in `docs/runbooks/verify-ui.md` (spec/plan: `spec-balances-ui-004` / `plan-balances-ui-004`, status `implemented`).
- [x] `npm test` (30 tests) + `npm run build` + `arggon validate --json` all green.
