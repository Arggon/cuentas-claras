# ADR 0002: JSON file storage first, SQLite later

- **Status:** Accepted (decided 2026-09-13)
- **Deciders:** repo owner (Gonzalo Arganaraz)

## Context

Single group per deployment, a few hundred expenses per trip. A database would add setup and failure modes before there is any query or concurrency pressure.

## Decision

Persist the ledger in a single JSON file (`data/ledger.json`, format: `docs/data-format.md`), written **atomically** (write tmp file, then rename). All storage access goes through a repository interface so the storage can move to better-sqlite3 later without touching the API or ledger layers. (Origin: docs/DECISIONS.md entry "JSON file storage first, SQLite later".)

## Consequences

- The ledger engine stays storage-agnostic: pure functions in, pure values out.
- Writes must never truncate/corrupt an existing ledger — the atomic write is guarded by tests.
- Migrating to SQLite is a tracked story behind the same repository interface, not a rewrite.
