# Decisions (informal log)

Not formal ADRs — just writing down why things are the way they are, while it's fresh.

## 2026-09-13: Express 5 over Fastify/others

Sticking with what I know well; the API surface here is tiny (5-6 endpoints).
Express 5 is current and its promise handling is fixed vs v4. If perf ever
matters, this is the easiest layer to swap.

## 2026-09-13: JSON file storage first, SQLite later

Single user, a few hundred expenses per trip. A single JSON file with atomic
write (tmp + rename) is plenty and keeps the code obvious. If queries or
concurrency ever hurt, migrate to better-sqlite3 behind the same repository
interface. Decision made so the ledger engine stays storage-agnostic.

## 2026-09-13: Money as integer cents

Floating point money is how projects like this die. All amounts are integer
cents (`amountCents`); formatting happens at the edges (UI/export).
