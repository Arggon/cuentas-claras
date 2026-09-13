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
