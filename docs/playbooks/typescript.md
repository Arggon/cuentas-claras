---
playbook_id: typescript
version: 5.8.2
researched: 2026-09-13
status: current
---

# TypeScript playbook

All source and tests are TypeScript, compiled with tsc and run in dev via tsx.

## Setup

- `typescript@^5.8.2` (devDependency) — `npm run build` = `tsc -p tsconfig.json`; output in `dist/`, `rootDir: src`.
- `tsx` for the dev loop (`npm run dev`): no build step, native ESM.
- `strict: true` is non-negotiable; `module`/`moduleResolution`: NodeNext to match `"type": "module"`.

## Conventions

- Domain types live in `src/types.ts` (`Expense`, `Balance`, `Transfer`) and are the contract between modules — keep them pure, no imports from I/O code.
- Money is integer cents everywhere (`amountCents`); never introduce float money types. See ADR 0003.
- Union/string-literal types over enums (TS 5.8 era style, plays well with type-stripping runtimes); `satisfies` for config objects; no `any` — use `unknown` + narrowing at the edges (CSV parse, HTTP bodies).
- One module per concern (`ledger.ts`, `settlement.ts`, `store.ts`); tests colocated as `*.test.ts`.

## Testing

Types are checked by `npm run build`; behavior by vitest. If a refactor changes exported types, `tsc` is the gate — run it before pushing.

## Security

Nothing TS-specific; the relevant surface is validation at untrusted edges (HTTP/CSV), covered in the express/vitest playbooks.

## Upgrade policy

npm latest is 7.0.2 (checked 2026-09-13) — the native-speed compiler line. Do **not** bump majors mid-MVP: TS 5.8 is current for our feature set and tsx/vitest compatibility is proven. When we do upgrade (5.8 → 6/7), file a story, run the full suite, and record it with `arggon playbook refresh typescript --version <v>`.

Sources (accessed 2026-09-13): npm registry (dist-tags), https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html
