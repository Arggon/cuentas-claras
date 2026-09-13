import { randomUUID } from "node:crypto";
import express from "express";
import { computeBalances } from "./ledger.js";
import { importRouter } from "./routes-import.js";
import { computeSettlement } from "./settlement.js";
import type { LedgerRepository } from "./store.js";
import { parseExpenseInput, parseMemberInput } from "./validate.js";
import type { Expense } from "./types.js";

/**
 * App factory: express stays inside this module (see ARCHITECTURE.md
 * boundaries) and tests boot it on an ephemeral port.
 */
export function createApp(store: LedgerRepository): express.Express {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/members", async (_req, res) => {
    res.json((await store.load()).members);
  });

  app.post("/members", async (req, res) => {
    const members = await store.load().then((ledger) => ledger.members);
    const parsed = parseMemberInput(req.body, members);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    await store.addMember(parsed.value);
    res.status(201).json({ name: parsed.value });
  });

  app.post("/expenses", async (req, res) => {
    const ledger = await store.load();
    const parsed = parseExpenseInput(req.body, ledger.members);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const expense: Expense = { id: `exp_${randomUUID()}`, ...parsed.value };
    await store.append([expense]);
    res.status(201).json(expense);
  });

  app.get("/expenses", async (_req, res) => {
    res.json((await store.load()).expenses);
  });

  app.get("/balances", async (_req, res) => {
    const ledger = await store.load();
    res.json(computeBalances(ledger.members, ledger.expenses));
  });

  app.get("/settlement", async (_req, res) => {
    const ledger = await store.load();
    res.json(computeSettlement(computeBalances(ledger.members, ledger.expenses)));
  });

  app.use(importRouter(store));

  // Express 5 forwards async-handler rejections here.
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err);
      res.status(500).json({ error: "internal error" });
    },
  );

  return app;
}
