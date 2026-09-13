# ADR 0003: Money as integer cents

- **Status:** Accepted (decided 2026-09-13)
- **Deciders:** repo owner (Gonzalo Arganaraz)

## Context

Floating point money is how projects like this die: `0.1 + 0.2` drift breaks split-and-settle arithmetic silently.

## Decision

All amounts are integer cents (`amountCents`) across the domain, storage, API and tests. Formatting to currency strings happens at the edges only (UI, exports). CSV/HTTP inputs are parsed into cents at the boundary and rejected if they do not parse exactly. (Origin: docs/DECISIONS.md entry "Money as integer cents".)

## Consequences

- No rounding beyond the documented remainder rule (split remainder cents go to the payer — see the ledger spec).
- Every importer/parser has one job: text → integer cents, or a rejection.
- Tests can assert exact integers; no epsilon comparisons, ever.
