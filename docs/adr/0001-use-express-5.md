# ADR 0001: Use Express 5 for the HTTP API

- **Status:** Accepted (decided 2026-09-13, before the first API story lands)
- **Deciders:** repo owner (Gonzalo Arganaraz)

## Context

The API surface is tiny (health, expenses CRUD, balances, settlement — 5-6 endpoints). Any mainstream framework can serve it. The team knows Express well; Express 4 has long-running promise-handling footguns; Fastify/Fastify-adjacent stacks buy performance we do not need at "a few hundred expenses per trip" scale.

## Decision

Use Express 5 (ADR origin: docs/DECISIONS.md entry "Express 5 over Fastify/others", same date). Express 5 is the Express Technical Committee's production-recommended release in 2026 and auto-forwards rejected promises from async handlers to error middleware.

## Consequences

- Async handlers can `throw` — no per-route try/catch boilerplate.
- v4-era patterns (wildcard routes, `req.param`) are gone; see docs/playbooks/express.md.
- If performance ever matters, this is the easiest layer to swap — the API layer must not leak Express types into the ledger/store modules.
