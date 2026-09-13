---
type: bug
status: done
id: bug-json-expense-endpoint-accepts-rollover-dates-like-2027-02-30
title: JSON expense endpoint accepts rollover dates like 2027-02-30
assignee: Arggon
branch: fix/bug-json-expense-endpoint-accepts-rollover-dates-like-2027-02-30
parent: story-imported-issues
labels: []
created: "2026-09-13"
updated: "2026-09-13"
---
<!--
  Placement (v0): tasks/v1/v1-core/story-imported-issues/bug-json-expense-endpoint-accepts-rollover-dates-like-2027-02-30.md
  Leaves live only under a story. id is the filename stem: bug-json-expense-endpoint-accepts-rollover-dates-like-2027-02-30.
  CLI `arggon create bug json-expense-endpoint-accepts-rollover-dates-like-2027-02-30` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# JSON expense endpoint accepts rollover dates like 2027-02-30

## Context

Found while implementing task-issue-2 (CSV import). `src/validate.ts` validates dates
with `ISO_DATE` regex + `Number.isNaN(Date.parse(date))`, but `Date.parse("2027-02-30")`
does **not** return `NaN` in V8 — it rolls over to March 2 — so `POST /expenses` accepts
calendar-invalid dates. The CSV parser (`src/csv.ts`, `isIsoDate`) already handles this
correctly by rebuilding the date with `Date.UTC` and checking the components round-trip.

Fix: reuse the same strict check in `parseExpenseInput` (extract to a shared helper or
duplicate the 6-line function), add `2027-02-30` to the rejection cases in
`src/validate.test.ts`.

## Acceptance

- [ ] `POST /expenses` with `date: "2027-02-30"` returns 400; `src/validate.test.ts` covers rollover dates.

## Notes

## Acceptance

- [x] POST /expenses rejects rollover dates (2027-02-30, 2027-02-29, 2027-04-31) with 400; 2028-02-29 accepted.
- [x] Shared strict `isValidIsoDate` in src/validate.ts; csv.ts reuses it (no duplicated helper).
- [x] `npm test` + `npm run build` green.
