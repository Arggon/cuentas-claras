---
spec_id: balances-ui-004
title: Balances UI (vanilla)
status: implemented
created: 2026-09-13
---

# Spec: Balances UI (vanilla) (balances-ui-004)

Tracked as `task-issue-5` (GitHub issue #5). Consumes the REST API (spec rest-api-persistence-003): `GET/POST /members`, `POST/GET /expenses`, `GET /balances`, `GET /settlement`.

## Purpose

The API has no face: on a trip someone needs to open a page, log what they paid, and see who owes whom without curl. This spec defines a **single static page served by the same API process** — no build step, no framework, no second deployment unit (same-origin, per the Express playbook security note).

Invariants:

- **No floats in the domain (ADR 0003):** the amount is typed as a decimal *string* and converted exactly to integer cents at the UI edge (`"12.34"` → `1234`) with integer arithmetic only; anything that does not parse exactly (more than 2 decimals, empty, non-numeric) is rejected client-side and re-validated server-side.
- **Currency formatting happens only in the UI:** the wire carries `amountCents`/`netCents` integers end to end; the page formats cents to a currency string at render time.
- **No frameworks:** plain HTML + CSS + JS served from `public/`; the only dependencies remain express (API) and dev tooling.
- **The server stays the source of truth:** the page holds no persistent state of its own — after every mutation it re-fetches members, balances and settlement.

## Synopsis

One page (`GET /` → `public/index.html`, plus `public/app.js` and `public/styles.css` served via `express.static`), in Spanish, with:

- **Miembros:** input + button → `POST /members {name}`; the group starts empty, so this is the first step. Members render as a list and drive the expense form.
- **Nuevo gasto:** who paid (select of members), date (defaults to today), description, amount (decimal string, exact-to-cents conversion at the edge), and participants as checkboxes — none checked means "split among all members" (empty `participants` array, matching the data format rule).
- **Balances:** table from `GET /balances` — per member, "le deben" (positive `netCents`) / "debe" (negative) / "en paz" (zero), amounts formatted from cents in the UI only.
- **Settlement:** list from `GET /settlement` — "A le paga a B $X" per transfer; empty state when there is nothing to settle.
- **Errors:** API 400 bodies (`{ error }`) are shown to the user verbatim; network failures show a generic message.

## Acceptance

- [ ] `GET /` serves the page (200, `text/html`) from the API process itself; a test covers it.
- [ ] Members can be added from the page and appear in the payer select and the participant checkboxes; the group starts empty.
- [ ] The expense form posts `date` (YYYY-MM-DD), `description`, `amountCents` (exact integer from the decimal input), `paidBy` and `participants`; none-checked sends `[]` (split among all).
- [ ] Amount conversion is exact and string-based: `"12.34"` → `1234`, `"12,34"` → `1234`, `"0.05"` → `5`; `"12.345"`, `""` and non-numeric input are rejected without touching the API.
- [ ] Balances table shows owes / is owed per member with cents formatted only at render time.
- [ ] Settlement list shows who pays whom and how much, from `GET /settlement`.
- [ ] A 400 from the API surfaces the body `error` message in the page.
- [ ] No framework, no new runtime dependency; dark terminal look, usable on a phone.
