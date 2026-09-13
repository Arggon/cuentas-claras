# cuentas-claras

Shared-expense tracker for trips and group hangouts: log what everyone paid,
see who owes whom, and settle up with the fewest possible transfers.

## Why

Doing this on a notes app after every trip is a mess. This is a small service to
log expenses as they happen and get the answer at the end: the minimal list of
transfers that clears all debts.

## Stack (WIP — see docs/DECISIONS.md)

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

Tracked as GitHub issues (see the issue list). Rough order:

1. Ledger engine (balances from expenses)
2. CSV import
3. Minimal transfer calculation (settlement)
4. REST API + JSON file persistence
5. Balances UI
