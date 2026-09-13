---
plan_id: monthly-digest-004
title: Plan for Monthly email digest
spec: docs/specs/spec-monthly-digest-004.md
status: implemented
created: 2026-09-13
---

# Plan: Monthly email digest (monthly-digest-004)

Derived from `docs/specs/spec-monthly-digest-004.md`. Each task carries a
verifiable acceptance criterion and links back to the spec.

## Tasks

### T1: Dependency + playbook for nodemailer

- `nodemailer@10.0.9` (dependencies) + `@types/nodemailer@8.0.1` (devDependencies); `arggon playbook new nodemailer --version 10.0.9` filled with Setup/Conventions/Testing/Security/Upgrade policy and dated sources.
- **Acceptance:** `npm ls nodemailer` resolves; playbook has no `fill me` placeholders.

### T2: `src/mailer.ts` — Mailer interface + SmtpMailer + env parsing

- `Mailer { sendMail(options): Promise<void> }`; `SmtpMailer` creates the nodemailer transport once (host/port/secure for 465, auth when user present, `disableFileAccess`/`disableUrlAccess`). `smtpConfigFromEnv` (null without `SMTP_HOST`), `digestAddressesFromEnv` (`DIGEST_TO` fallback `SMTP_FROM`), `digestHourFromEnv` (default 9). Optional transport constructor param for offline tests.
- **Acceptance:** `npx tsc -p tsconfig.json` compiles; no nodemailer import outside this file.

### T3: `src/digest.ts` — pure digest content

- `previousPeriod`, `buildDigestContent` (month filter + `computeBalances` + `computeSettlement` + Spanish plain-text body), `formatCents` (only currency edge), `sendDigest` (subject + to + text through the `Mailer` interface).
- **Acceptance:** pure module (imports only `./types.js`, `./ledger.js`, `./settlement.js`, `./mailer.js` types).

### T4: `src/schedule.ts` — monthly scheduler

- `msUntilNextMonthlyRun` (pure, local time, rollover-safe: target is always day 1 so `setMonth(+1)` never clamps) + `scheduleMonthlyDigest` (setTimeout loop, injectable `TimerScheduler`, cancel handle, keeps rescheduling even if `fn` throws).
- **Acceptance:** pure module (imports only `node` types); cancel handle clears pending timers.

### T5: Wire `src/index.ts`

- With `SMTP_HOST`: create `SmtpMailer`, log recipients + hour, `scheduleMonthlyDigest(() => store.load() → sendDigest(...previousPeriod(new Date())))`. Without: `console.log("digest deshabilitado: falta SMTP_HOST")`. Minimal diff — no `app.ts` changes.
- **Acceptance:** `npm run build` green; boot log covers both branches.

### T6: Tests (`digest.test.ts`, `schedule.test.ts`, `mailer.test.ts`)

- Digest: month filtering, whole-ledger balances, settlement transfers, Spanish text + currency formatting, empty months; `previousPeriod` incl. January → December. Schedule: before/after hour, last day of month, Dec→Jan, exact-instant; fake timers fire/re-arm/cancel/throw-safety. Mailer: env parsing table cases, `SmtpMailer` over a `jsonTransport`, fake-Mailer `sendDigest` capture.
- **Acceptance:** `npm test` green with no network or real SMTP; every spec acceptance bullet maps to at least one `it()`.
