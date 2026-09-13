---
type: bug
status: done
id: bug-vitest-dist-dupes
title: "vitest runs compiled dist/*.test.js after npm run build, doubling the suite"
assignee: Arggon
branch: fix/bug-vitest-dist-dupes
parent: story-imported-issues
labels: []
created: "2026-09-13"
updated: "2026-09-13"
worktree_path: /home/arggon/Projects/cuentas-claras-bug-vitest-dist-dupes
---
<!--
  Placement (v0): tasks/v1/v1-core/story-imported-issues/bug-vitest-dist-dupes.md
  Leaves live only under a story. id is the filename stem: bug-vitest-dist-dupes.
  CLI `arggon create bug vitest-dist-dupes` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# vitest runs compiled dist/*.test.js after npm run build, doubling the suite

## Context

Found independently by two agents while landing PRs #14/#15/#16 (2026-09-13): the default vitest `include` glob matches `**/*.{test,spec}.*`, so after `npm run build` the compiled `dist/*.test.js` files run alongside `src/` and the suite reports every test twice (85 tests -> 170 executions). Wastes CI time and can mask config drift.

Reproduce: `npm run build && npm test` — Test Files doubles.

## Acceptance

- [x] `npm run build && npm test` reports each test exactly once (vitest pinned to `src/**/*.test.ts`).
- [x] Full suite green (85 tests, build first — no dist duplicates).

## Notes

### 2026-09-13 @Arggon
Found independently by two agents during #14/#15/#16 (2026-09-13): default vitest include matches **/*.test.js, so after src/mailer.test.ts(2,24): error TS2307: Cannot find module 'nodemailer' or its corresponding type declarations.
src/mailer.test.ts(3,34): error TS2307: Cannot find module 'nodemailer' or its corresponding type declarations.
src/mailer.ts(1,24): error TS2307: Cannot find module 'nodemailer' or its corresponding type declarations.
src/mailer.ts(2,34): error TS2307: Cannot find module 'nodemailer' or its corresponding type declarations. the compiled dist/*.test.js run alongside src — suite counts double (e.g. 85 tests -> 170 executions). Wastes CI time and can mask config drift. Fix: pin vitest include to src/**/*.test.ts via vitest.config.ts. Acceptance: build + test in sequence reports each test exactly once.
