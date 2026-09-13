---
type: bug
status: in_progress
id: bug-upgrade-vitest5
title: Upgrade vitest 3.x to 5 (fixes @vitest/mocker path traversal GHSA-82fw-gwwq-j7x9)
assignee: Arggon
branch: fix/bug-upgrade-vitest5
parent: story-imported-issues
labels: []
created: "2026-09-13"
updated: "2026-09-13"
claimed_at: "2026-09-13T04:34:50.687Z"
worktree_path: /home/arggon/Projects/cuentas-claras-bug-upgrade-vitest5
---
<!--
  Placement (v0): tasks/v1/v1-core/story-imported-issues/bug-upgrade-vitest5.md
  Leaves live only under a story. id is the filename stem: bug-upgrade-vitest5.
  CLI `arggon create bug upgrade-vitest5` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Upgrade vitest 3.x to 5 (fixes @vitest/mocker path traversal GHSA-82fw-gwwq-j7x9)

## Context

<!-- What went wrong / how to reproduce. -->

## Acceptance

- [ ] 

## Notes

### 2026-09-13 @Arggon
Found via GitHub Dependabot alert on default branch (2026-09-13, 2 moderate): @vitest/mocker 2.1.0-4.1.1x path traversal / arbitrary file read via redirect mock (GHSA-82fw-gwwq-j7x9). Affects dev/test toolchain only, not runtime. Fix: npm install vitest@5 (breaking major), run suite, update any changed APIs, then docs/playbooks/vitest.md via arggon playbook refresh vitest --version 5.0.0. Scheduled right after the sequential chain (ledger/settlement/API) merges and before parallel stories branch, so the toolchain is fixed for all remaining work.

## Acceptance

- [x] vitest ^5.0.0 installed; `@vitest/mocker` advisory GHSA-82fw-gwwq-j7x9 cleared (`npm audit` clean).
- [x] Full suite green on v5 without test changes (29 tests).
- [x] docs/playbooks/vitest.md refreshed (version 5.0.0, researched today).
