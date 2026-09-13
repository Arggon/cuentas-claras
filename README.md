# cuentas-claras

Shared-expense tracker for trips and group hangouts: log what everyone paid,
see who owes whom, and settle up with the fewest possible transfers.

## Why

Doing this on a notes app after every trip is a mess. This is a small service to
log expenses as they happen and get the answer at the end: the minimal list of
transfers that clears all debts.

## Stack (decided — see docs/adr/)

- Node.js 22 + TypeScript
- Express 5 for the API
- JSON file storage to start (SQLite later if it earns it)
- Vitest for tests
- Vanilla frontend served by the same API (no framework)

## Run

```bash
npm install
npm run dev        # http://localhost:3000/health
```

## Roadmap

Work is tracked in-tree with ArggonManager — see `tasks/` (run `arggon board` for the kanban). GitHub hosts PRs only. Rough order: ledger engine → settlement → REST API + persistence → CSV import, balances UI, email digest (parallel).
