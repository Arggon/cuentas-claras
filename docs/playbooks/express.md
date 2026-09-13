---
playbook_id: express
version: 5.2.1
researched: 2026-09-13
status: current
---

# Express playbook

HTTP framework for the API (`^5.1.0` in package.json; latest 5.x is 5.2.1 as of 2026-09-13).

## Setup

- Express 5 only — it is the Technical Committee's production-recommended line in 2026 and v4 is end-of-support territory (source: HeroDevs 2026 support reference, accessed 2026-09-13).
- Body parsing is built in: `express.json()`; no `body-parser` dependency.
- Export an app factory (`createApp(store)`) from `src/app.ts` so tests can boot it on an ephemeral port; `src/index.ts` only wires env + listen.

## Conventions

- One router per resource, mounted from the app factory; `/health` stays a cheap unauthenticated probe.
- In v5, rejected promises from async handlers are forwarded to the error middleware automatically — write `async` handlers and throw; no `try/catch` boilerplate per route (source: expressjs.com v5 migration guide).
- Status codes: 400 for malformed input, 404 for unknown ids/members, 201 for created resources. Validate against `docs/data-format.md` at the edge, then hand off to the pure ledger modules.
- Central error middleware last; respond `{ error: string }` JSON, never leak stack traces.

## Pitfalls (v5 specifics)

- Route wildcards changed: `*` → `/*splat` (or named wildcards); we don't need them.
- `req.query` is now a getter (no re-parse); `req.param(name)` and `res.send(status)` are gone.

## Testing

Integration tests boot the app factory on port 0 and use `fetch` (Node 22 native). No supertest — keep the dependency tree lean.

## Security

- Same-origin deployment: the UI is served by this process; if CORS ever becomes needed, make it an explicit story.
- Express 5.x still receives patches; re-check the latest 5.x when `arggon playbook status` flags staleness.

## Upgrade policy

Track 5.x minors (5.1 → 5.2+); majors only with an ADR (Express 5 was chosen over Fastify/others — ADR 0001).

Sources (accessed 2026-09-13): https://expressjs.com/en/guide/migrating-5.html ; npm registry (dist-tags); https://www.herodevs.com/blog-posts/express-3-is-eol-express-4-is-next-the-2026-support-reference
