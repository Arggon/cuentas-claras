---
spec_id: monthly-digest-004
title: Monthly email digest
status: implemented
created: 2026-09-13
---

# Spec: Monthly email digest (monthly-digest-004)

Tracked as `task-issue-6` (GitHub issue #6). Consumes the ledger (`computeBalances`, spec ledger-balances-001) and the settlement (`computeSettlement`, spec settlement-min-transfers-002). New dependency: `nodemailer` (playbook: docs/playbooks/nodemailer.md).

## Purpose

A cron-style monthly job emails the group a summary of the ledger: the expenses logged during the reported month, the current balances, and the pending transfers that settle them. The job is **disabled by default**: without SMTP configuration it must not send anything and must say so clearly at boot.

Invariants:

- The feature is **fail closed**: no `SMTP_HOST` → job disabled, logged at boot, nothing scheduled.
- Digest building and scheduling are **pure modules** (no I/O); only `SmtpMailer` touches nodemailer, behind the `Mailer` interface so tests never open a network connection.
- Money is formatted to currency **only** in the digest edge (`src/digest.ts`); every core module keeps integer cents (ADR 0003).
- Recipients come from env, **not** from the ledger: the ledger data model has no member emails (docs/data-format.md), so destinations are `DIGEST_TO` (comma-separated) falling back to `SMTP_FROM`.

## Synopsis

```ts
// src/digest.ts
interface DigestPeriod { year: number; month: number }         // month: 1-12
function previousPeriod(now: Date): DigestPeriod                // month that just closed
function buildDigestContent(ledger: Ledger, period: DigestPeriod): {
  monthLabel: string; newExpenses: Expense[];
  balances: Balance[]; transfers: Transfer[]; text: string      // plain-text body, Spanish
}
function sendDigest(mailer: Mailer, ledger: Ledger, period: DigestPeriod,
                    addresses: { from: string; to: string[] }): Promise<void>

// src/schedule.ts
function msUntilNextMonthlyRun(now: Date, hour: number): number // next day 1 at hour:00 local
function scheduleMonthlyDigest(fn: () => void, { hour }: { hour: number },
                               timers?: TimerScheduler): () => void   // cancel handle

// src/mailer.ts
interface Mailer { sendMail(options: MailOptions): Promise<void> }
class SmtpMailer implements Mailer                              // wraps nodemailer, created from env
function smtpConfigFromEnv(env): SmtpConfig | null              // null without SMTP_HOST
function digestAddressesFromEnv(env): { from: string; to: string[] }
function digestHourFromEnv(env): number                         // DIGEST_HOUR, default 9
```

Behavior:

- Monthly cadence: fires the **day 1 of every month** at `DIGEST_HOUR` (local time, default 9) and reports the month that just closed (`previousPeriod`). `msUntilNextMonthlyRun` handles hour-not-yet-reached, hour-passed, last day of month, and Dec 31 → Jan 1 year rollover.
- Body (`text`, plain, Spanish): month label, new expenses of the reported month (description, ISO date, payer, currency-formatted amount), current balances over the **whole** ledger (positive = "a favor", negative = "debe"), and the settlement transfers ("transferencias sugeridas").
- Email: subject `Resumen mensual cuentas-claras — <monthLabel>`, `to` = recipients joined by `", "`, `from` = `SMTP_FROM`.
- Boot (`src/index.ts`): with `SMTP_HOST` set → log that the digest is enabled (recipients + hour) and schedule `load ledger → sendDigest`; without it → log `digest deshabilitado: falta SMTP_HOST`. The index change stays minimal (parallel branches touch `app.ts`, not `index.ts`).

Env: `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (default `cuentas-claras@localhost`), `DIGEST_TO` (default: `SMTP_FROM`), `DIGEST_HOUR` (default 9).

## Acceptance

- [ ] Without `SMTP_HOST` the job is disabled and the boot log states it; no timer is scheduled.
- [ ] `buildDigestContent` only includes expenses dated in the reported month; balances/transfers cover the whole ledger.
- [ ] The body is Spanish plain text with currency-formatted amounts; formatting happens only in `src/digest.ts`.
- [ ] `msUntilNextMonthlyRun` is correct around the configured hour, on the last day of the month, and across the Dec→Jan year rollover.
- [ ] `sendDigest` sends `to`/`subject`/`text` through the `Mailer` interface (fake Mailer in tests — no real SMTP).
- [ ] `scheduleMonthlyDigest` fires the callback at the computed delay and re-arms itself; cancellation clears the timer (no live timers left in tests, even when `fn` throws).
- [ ] Full `npm test` + `npm run build` green; no new network I/O in the suite.
