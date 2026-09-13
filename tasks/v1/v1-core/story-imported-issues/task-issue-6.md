---
type: task
status: done
id: task-issue-6
title: "issue #6: Notifications: monthly email digest"
assignee: Arggon
branch: feat/task-issue-6
parent: story-imported-issues
labels: [enhancement]
created: "2026-09-13"
updated: "2026-09-13"
depends_on: [task-issue-4]
---
Optional/later: a cron-style job that emails a monthly summary (new expenses, current balances, pending transfers) to group members.

- SMTP config via env.
- Skip for now if the rest lands quickly; tracking it so it doesn't get lost.
> imported from issue #6

## Acceptance

- [x] Cron-style job que envía por email el resumen mensual (gastos nuevos del mes, balances actuales, transferencias pendientes del settlement) — `src/digest.ts` + `src/schedule.ts`.
- [x] SMTP config vía env (`SMTP_HOST`, `SMTP_PORT` default 587, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`); destinatarios vía `DIGEST_TO` con fallback `SMTP_FROM` porque los miembros del ledger no tienen emails modelados.
- [x] El job queda deshabilitado si no hay config SMTP, con log claro al boot (`digest deshabilitado: falta SMTP_HOST`) y sin timers agendados.
- [x] Mensual: corre el día 1 de cada mes a la hora configurada (`DIGEST_HOUR`, default 9, hora local); `msUntilNextMonthlyRun` maneja antes/después de la hora, último día del mes y rollover 31 dic → 1 ene.
- [x] SMTP aislado tras la interfaz `Mailer` (solo `SmtpMailer` toca nodemailer); tests con fake Mailer + fake timers, sin SMTP real ni I/O de red — playbook `docs/playbooks/nodemailer.md` (nodemailer 10.0.9, con fuentes datadas).
- [x] Spec `docs/specs/spec-monthly-digest-004.md` y plan en `status: implemented`; gates en verde: `npm test` (66 tests), `npm run build`, `arggon validate --json`.
