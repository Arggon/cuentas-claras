---
playbook_id: nodemailer
version: 10.0.9
researched: 2026-09-13
status: current
---

# nodemailer playbook

SMTP e-mail sending for the monthly digest job (`nodemailer@^10.0.9` in package.json; latest is 10.0.9 as of 2026-09-13, requires Node >= 20 — we run Node 22).

## Setup

- `npm i nodemailer` (runtime dependency) + `npm i -D @types/nodemailer` (latest 8.0.1 — DefinitelyTyped majors track the typings, not nodemailer's; TS 5.x tag = 8.0.1).
- nodemailer is CommonJS; with our ESM + NodeNext setup use the default import: `import nodemailer from "nodemailer"` — Node's CJS interop exposes `createTransport` on the default export (verified locally on nodemailer@10.0.9, 2026-09-13).
- Create the transporter **once** at process boot, not per email: `nodemailer.createTransport({ host, port, secure, auth })`. `secure: true` = implicit TLS (port 465); `secure: false` (default) still upgrades via STARTTLS when the server advertises it (source: nodemailer.com/smtp, accessed 2026-09-13).
- Port defaults to 587 when `secure` is false, 465 when true; `host` defaults to `localhost`.

## Conventions

- Keep the app's core pure: `src/mailer.ts` defines a `Mailer` interface (`sendMail(opts): Promise<void>`); `SmtpMailer` is the only place that touches nodemailer. Everything else (digest building, scheduling) depends on the interface, so tests use fake mailers — no SMTP in the suite.
- Credentials and recipients come from env, never hard-coded: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, plus `DIGEST_TO` / `DIGEST_HOUR` for the digest job. If `SMTP_HOST` is missing the feature is disabled (fail closed, log at boot).
- Pass explicit `from`, `to`, `subject`, `text` on every `sendMail` call (message configuration, source: nodemailer.com/usage, accessed 2026-09-13). `sendMail` returns a Promise when no callback is given — await it so boot code can log failures.
- Use `transporter.verify()` (Promise form) if a runbook needs to probe connectivity; it only tests connection/auth, not envelope permission (source: nodemailer.com/smtp, accessed 2026-09-13).

## Testing

Never connect to a real SMTP server in tests: inject a fake `Mailer` (records `to`/`subject`/`text`) for the digest, and for schedule tests inject fake timers. `SmtpMailer` itself stays thin (transport creation + one call) and is covered by the type checker plus a `jsonTransport`-style offline transporter if ever needed. If you need an end-to-end SMTP fake, run a local capture server — do not add network dependencies to `npm test`.

## Security

- TLS: keep `secure: false` + STARTTLS for 587, `secure: true` for 465. Do not ship `tls: { rejectUnauthorized: false }` — the "self-signed" example in the docs is for local debugging only (source: nodemailer.com/smtp, accessed 2026-09-13).
- Set `disableFileAccess: true` and `disableUrlAccess: true` on the transporter so message data can never read files/URLs (nodemailer's documented hardening when message content may come from outside; source: nodemailer.com/smtp, accessed 2026-09-13).
- `SMTP_PASS` lives in env only — never log the transport options or the auth block.
- No known advisories affecting 10.0.9 as of 2026-09-13 (checked npm registry + GitHub advisories on that date).

## Upgrade policy

Track npm `latest` (10.0.9 as of 2026-09-13). Major bumps stay tracked stories: read the release notes, run the full suite (the fake-Mailer tests pin our side of the contract), then `arggon playbook refresh nodemailer --version <v>`. `@types/nodemailer` bumps ride along independently.

Sources (accessed 2026-09-13): npm registry (dist-tags for nodemailer and @types/nodemailer); https://nodemailer.com/usage/ ; https://nodemailer.com/smtp/
