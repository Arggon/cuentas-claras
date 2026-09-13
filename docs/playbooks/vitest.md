---
playbook_id: vitest
version: 3.1.1
researched: 2026-09-13
status: current
---

# Vitest playbook

Test runner for unit and integration tests (`vitest run` in CI, `vitest` watch locally).

## Setup

- `vitest@^3.1.1`; zero config needed for `src/**/*.test.ts` — defaults already match ESM + NodeNext here.
- CI gate: `npm test` must run the whole suite in run mode (no watch), plus `npm run build` for the type check.

## Conventions

- Pure modules (ledger balances, settlement, CSV parsing) get table-driven unit tests: one `it` per rule, including the remainder-cents rule and idempotency cases.
- Integration tests: boot the app on an ephemeral port (`server.listen(0)`) and call it with native `fetch`; storage tests use `node:fs` temp dirs, never the real `data/`.
- Keep fixtures inline in the test file; extract a `fixtures/` dir only when a file grows past ~100 lines.
- Property-style assertions where the domain has invariants (transfers sum to total debt; balances sum to zero).

## Testing

What must be green before merge: full `npm test` + `npm run build`. New behavior without a new/updated test is not done (see docs/engineering.md).

## Security

Nothing runner-specific.

## Upgrade policy

npm latest is 5.0.0 (checked 2026-09-13); we are on 3.x. Major bumps are tracked stories — run the suite, update any changed APIs, then `arggon playbook refresh vitest --version <v>`.

Sources (accessed 2026-09-13): npm registry (dist-tags), https://vitest.dev/guide/
