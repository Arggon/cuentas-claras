import express from "express";
import { parseCsvExpenses, type CsvRowError } from "./csv.js";
import type { LedgerRepository } from "./store.js";
import type { Expense } from "./types.js";

/** Response body of POST /expenses/import (always 200 for a CSV body). */
export interface ImportReport {
  imported: number;
  duplicates: number;
  rejected: CsvRowError[];
}

/** Max CSV body accepted by the import endpoint. */
export const CSV_BODY_LIMIT = "1mb";

/**
 * Bulk write path for CSV exports (spec csv-import-004). The parser owns
 * validation; this router owns idempotency: rows whose deterministic id already
 * exists in the ledger — or repeats earlier in the same file — are counted as
 * duplicates and skipped, so importing a file twice never duplicates expenses.
 */
export function importRouter(store: LedgerRepository): express.Router {
  const router = express.Router();
  router.post(
    "/expenses/import",
    express.text({ type: "text/csv", limit: CSV_BODY_LIMIT }),
    async (req, res) => {
      const csv: unknown = req.body;
      if (typeof csv !== "string") {
        res.status(400).json({ error: "expected a raw CSV body with Content-Type: text/csv" });
        return;
      }

      const ledger = await store.load();
      const { rows, errors } = parseCsvExpenses(csv, ledger.members);

      const knownIds = new Set(ledger.expenses.map((expense) => expense.id));
      const fresh: Expense[] = [];
      let duplicates = 0;
      for (const row of rows) {
        if (knownIds.has(row.id)) {
          duplicates++;
          continue;
        }
        knownIds.add(row.id); // also de-duplicates repeats within this same file
        fresh.push(row);
      }
      if (fresh.length > 0) await store.append(fresh);

      const report: ImportReport = { imported: fresh.length, duplicates, rejected: errors };
      res.status(200).json(report);
    },
  );
  return router;
}
