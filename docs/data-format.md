# Data format (v1)

Storage is a single JSON file (`data/ledger.json`), written atomically.

```json
{
  "group": "mendoza-2027",
  "members": ["gonza", "sol", "martin"],
  "expenses": [
    {
      "id": "exp_001",
      "date": "2027-01-10",
      "description": "Cabin",
      "amountCents": 4500000,
      "paidBy": "gonza",
      "participants": ["gonza", "sol", "martin"]
    }
  ]
}
```

Rules:

- `participants` empty means "everyone in `members` at read time".
- Amounts are integer cents. Never floats.
- `paidBy` must be a member. Importers must validate this.

## CSV import format

`POST /expenses/import` ingests a raw CSV body (`Content-Type: text/csv`, up to 1 MiB)
and appends the valid rows to the ledger. It always answers `200` with:

```json
{ "imported": 2, "duplicates": 1, "rejected": [{ "line": 4, "reason": "..." }] }
```

`line` is the 1-based file line where the record starts. A bad row rejects only
itself — the rest of the file still imports.

Format:

- The first record is a **header row** naming the columns (required, order and case
  insensitive; extra columns are ignored): `date,description,amount,paid_by,participants`.
- `date` — ISO `YYYY-MM-DD`.
- `description` — non-empty; may be quoted (basic RFC 4180) to contain commas,
  newlines or `""` escapes.
- `amount` — decimal with dot or comma as separator (`12.34` and `12,34` both mean
  1234 cents); at most 2 decimals; converted to integer cents exactly per ADR 0003,
  rows that do not parse exactly are rejected (never rounded).
- `paid_by` — must be a known member, otherwise the row is rejected.
- `participants` — member names separated by `;` (`sol;martin`). An empty cell means
  everyone; unknown, repeated or empty names reject the row.
- `\n` and `\r\n` line endings both work; a leading UTF-8 BOM is ignored.

Idempotency: each row maps to the deterministic id
`exp_` + first 16 hex chars of `sha256(date|description|amountCents|paidBy|participants.join(';'))`.
Rows whose id already exists in the ledger — or repeats earlier in the same file —
count as `duplicates` and are skipped, so importing the same file twice never
duplicates expenses.
