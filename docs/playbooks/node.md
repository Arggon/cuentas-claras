---
playbook_id: node
version: 22.23.2
researched: 2026-09-13
status: current
---

# Node.js playbook

Runtime for the API, CLI entry points and tests. Project floor: Node 22.x LTS.

## Setup

- Install Node 22 (any 22.x; we run the latest 22.x patch — 22.23.2 as of 2026-09-13) via mise/fnm/nvm; `node --version` must be `v22.*`. The repo has no `engines` field yet — add one only if we start enforcing it in CI.
- No `--experimental` flags needed: ESM is native here (`"type": "module"` in package.json, `NodeNext` module resolution).
- Dev run: `npm run dev` (tsx watch). Build: `npm run build` (tsc). Test: `npm test` (vitest).

## Conventions

- ESM only: `import`/`export`, `.js` specifier extensions on relative imports (NodeNext). No CommonJS, no `require`.
- Node core APIs over extra deps: `node:crypto.randomUUID()` for ids, `node:fs/promises` for the ledger file, `node:http` semantics via Express (see express playbook).
- Config via env (`PORT`, SMTP vars later). No dotenv dependency unless env handling grows: `node --env-file=.env` is built in since 20.6.
- Top-level await is fine in entry points; library modules stay side-effect free.

## Testing

Tests run under vitest (see vitest playbook); nothing Node-specific beyond `node:fs` temp dirs for storage tests.

## Security

- Node 22 is in **maintenance** LTS: active support ended 2025-10-21; EOL 2027-04-30 (source: endoflife.date/nodejs, accessed 2026-09-13). Stay on the latest 22.x patch for security backports.
- Node 24 is the current Active LTS (until 2026-10-20) and Node 26 enters LTS 2026-10-28 (same source). Plan the 24.x bump as a tracked story, not a drive-by.
- Run `npm audit` before releases; this service binds localhost by default and reads one JSON file — keep it that way until auth exists.

## Upgrade policy

Re-research when `arggon playbook status` flags this file stale (90d), when a security advisory touches the pinned line, or when we approach 22 EOL. Next stop: Node 24 LTS. Record the bump with `arggon playbook refresh node --version <v>` and an ADR only if it changes conventions.

Sources (accessed 2026-09-13): https://endoflife.date/api/nodejs.json ; npm registry (`node` release feed).
