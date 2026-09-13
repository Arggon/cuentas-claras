---
type: task
status: done
id: task-adopt-arggon
title: Adopt ArggonManager in this repo
assignee: Arggon
branch: feat/task-adopt-arggon
parent: story-arggon-adoption
labels: []
created: "2026-09-13"
updated: "2026-09-13"
---
## Context

This repo is adopting ArggonManager over an existing documentation set: `arggon init` generated the governing docs (marked `<!-- arggon:generated ... -->`, with TODO placeholders), while any pre-existing docs were left untouched on disk. Your job as the executing agent: extract the valuable content from the adopter docs into the generated ones, archive what you replace, and report back on this task.

Current inventory (paths, sizes, managed vs adopter-owned, stack manifests):

```
arggon adopt --dry-run --json
```

## Checklist

- [x] 1. Read the arggon-generated governing docs first: AGENTS.md, docs/convention.md, docs/engineering.md, docs/playbooks/ (if present). Follow them for the rest of this migration.
- [x] 2. Sweep the existing repo docs (list them from the inventory above): extract the project description, conventions, workflows, and stack info. Extract, don't wholesale-copy — rewrite into the target doc's structure and drop duplicated or outdated material.
- [x] 3. Complete the arggon-generated docs with the extracted content — fill the TODO placeholders: project description in AGENTS.md; CONTRIBUTING.md specifics (environment setup, build/test commands); ARCHITECTURE.md problem statement. The SECURITY.md contact is human input — leave it flagged for a human, never invent it.
- [x] 4. Archive replaced originals to backup/<YYYY-MM-DD>/ preserving their relative paths (use today's date). Only docs you REPLACED get archived; never archive README.md — merge into it instead.
- [x] 5. Detect the stack from the manifests (package.json / requirements.txt / go.mod / Cargo.toml / pom.xml); for each technology create a playbook (`arggon playbook new <tech>`), research current versions and best practices with dated sources, then record them with `arggon playbook refresh <tech> --version <v>`.
- [x] 6. Verify: `arggon validate` + `arggon spec validate` (if specs exist) + `arggon playbook status`.
- [ ] 7. Report: comment on this task (`arggon comment task-adopt-arggon`) listing the extracted content, archived files, and created playbooks; flip this task done when the human reviews.

### 2026-09-13 @Arggon
Adoption executed. Extracted: project description + workflow into AGENTS.md; problem statement, code map, layering rules and invariants into ARCHITECTURE.md; env setup + build/test commands into CONTRIBUTING.md; testing expectations into docs/engineering.md; README roadmap now points at tasks/ (tracker) instead of GitHub issues. Decisions: docs/DECISIONS.md extracted into ADRs 0001 (Express 5), 0002 (JSON file storage, atomic write), 0003 (integer cents) — all Accepted; original archived at backup/2026-09-13/docs/DECISIONS.md. docs/data-format.md kept as-is (still authoritative). Playbooks created (researched 2026-09-13, dated sources): node 22.23.2 (maintenance LTS; 24 is Active LTS), typescript 5.8.2 (npm latest 7.0.2 — bump deferred, tracked), express 5.2.1 (v5 is the production-recommended line), vitest 3.1.1 (npm latest 5.0.0 — bump deferred). Verified: arggon validate ok, spec validate ok, playbook status 0 stale. SECURITY.md left flagged for a human contact.
