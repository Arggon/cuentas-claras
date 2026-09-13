import type { Server } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { FileLedgerRepository } from "./store.js";

let server: Server | undefined;

afterEach(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
  }
});

async function boot(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "cc-app-"));
  const store = new FileLedgerRepository(path.join(dir, "ledger.json"));
  server = createApp(store).listen(0);
  await new Promise<void>((resolve) => server!.once("listening", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("no port");
  return `http://127.0.0.1:${address.port}`;
}

const get = (base: string, path: string) => fetch(`${base}${path}`);
const post = (base: string, path: string, body: unknown) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const postCsv = (base: string, body: string, contentType = "text/csv") =>
  fetch(`${base}/expenses/import`, { method: "POST", headers: { "content-type": contentType }, body });

describe("API", () => {
  it("keeps the health endpoint", async () => {
    const base = await boot();
    const res = await get(base, "/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("manages members", async () => {
    const base = await boot();
    const created = await post(base, "/members", { name: "gonza" });
    expect(created.status).toBe(201);
    await post(base, "/members", { name: "sol" });

    const duplicate = await post(base, "/members", { name: "gonza" });
    expect(duplicate.status).toBe(400);

    const list = await get(base, "/members");
    expect(await list.json()).toEqual(["gonza", "sol"]);
  });

  it("creates and lists expenses", async () => {
    const base = await boot();
    await post(base, "/members", { name: "gonza" });
    await post(base, "/members", { name: "sol" });

    const created = await post(base, "/expenses", {
      date: "2027-01-10",
      description: "Cabin",
      amountCents: 4500000,
      paidBy: "gonza",
      participants: ["gonza", "sol"],
    });
    expect(created.status).toBe(201);
    const expense = (await created.json()) as { id: string; amountCents: number };
    expect(expense.id).toMatch(/^exp_/);
    expect(expense.amountCents).toBe(4500000);

    const list = await get(base, "/expenses");
    expect(await list.json()).toEqual([{ ...expense }]);
  });

  it("rejects invalid expenses with 400 and a reason", async () => {
    const base = await boot();
    await post(base, "/members", { name: "gonza" });

    const cases = [
      { date: "10/01/2027", description: "x", amountCents: 100, paidBy: "gonza", participants: [] },
      { date: "2027-01-10", description: "", amountCents: 100, paidBy: "gonza", participants: [] },
      { date: "2027-01-10", description: "x", amountCents: 12.34, paidBy: "gonza", participants: [] },
      { date: "2027-01-10", description: "x", amountCents: 100, paidBy: "nadia", participants: [] },
      { date: "2027-01-10", description: "x", amountCents: 100, paidBy: "gonza", participants: ["nadia"] },
    ];
    for (const body of cases) {
      const res = await post(base, "/expenses", body);
      expect(res.status).toBe(400);
      const { error } = (await res.json()) as { error: string };
      expect(error).toBeTruthy();
    }
  });

  it("serves balances and the minimal settlement end-to-end", async () => {
    const base = await boot();
    for (const name of ["gonza", "sol", "martin"]) await post(base, "/members", { name });
    await post(base, "/expenses", {
      date: "2027-01-10",
      description: "Cabin",
      amountCents: 30000,
      paidBy: "gonza",
      participants: ["gonza", "sol", "martin"],
    });

    const balances = await (await get(base, "/balances")).json();
    expect(balances).toEqual([
      { member: "gonza", netCents: 20000 },
      { member: "martin", netCents: -10000 },
      { member: "sol", netCents: -10000 },
    ]);

    const settlement = (await (await get(base, "/settlement")).json()) as Array<{
      from: string;
      to: string;
      amountCents: number;
    }>;
    // Equal debtors may match in either order; the set of transfers is what matters.
    expect(settlement).toHaveLength(2);
    expect(settlement.map((t) => ({ ...t })).sort((a, b) => a.from.localeCompare(b.from))).toEqual([
      { from: "martin", to: "gonza", amountCents: 10000 },
      { from: "sol", to: "gonza", amountCents: 10000 },
    ]);
  });
});

describe("CSV import", () => {
  const header = "date,description,amount,paid_by,participants";
  const csv = [
    header,
    "2027-01-10,Cabin,12.34,gonza,sol;martin",
    '2027-01-11,Cafe con leche,"12,50",sol,',
    "2027-01-12,Unknown payer,3.00,nadia,",
    "2027-01-13,Bad amount,12.345,gonza,",
  ].join("\n");

  async function bootWithMembers(): Promise<string> {
    const base = await boot();
    for (const name of ["gonza", "sol", "martin"]) await post(base, "/members", { name });
    return base;
  }

  it("imports valid rows, rejects bad ones per row and lists them in /expenses", async () => {
    const base = await bootWithMembers();

    const res = await postCsv(base, csv);
    expect(res.status).toBe(200);
    const report = (await res.json()) as {
      imported: number;
      duplicates: number;
      rejected: Array<{ line: number; reason: string }>;
    };
    expect(report.imported).toBe(2);
    expect(report.duplicates).toBe(0);
    expect(report.rejected).toEqual([
      { line: 4, reason: expect.stringMatching(/paid_by "nadia" is not a known member/) },
      { line: 5, reason: expect.stringMatching(/amount "12.345"/) },
    ]);

    const expenses = (await (await get(base, "/expenses")).json()) as Array<{
      id: string;
      date: string;
      amountCents: number;
      paidBy: string;
      participants: string[];
    }>;
    expect(expenses).toHaveLength(2);
    expect(expenses.map((e) => e.id)).toMatchObject([/^exp_[0-9a-f]{16}$/, /^exp_[0-9a-f]{16}$/]);
    expect(expenses[0]).toMatchObject({
      date: "2027-01-10",
      description: "Cabin",
      amountCents: 1234,
      paidBy: "gonza",
      participants: ["sol", "martin"],
    });
    expect(expenses[1]).toMatchObject({ date: "2027-01-11", amountCents: 1250, paidBy: "sol" });
  });

  it("is idempotent: re-importing the same file counts duplicates, not expenses", async () => {
    const base = await bootWithMembers();

    const first = await postCsv(base, csv);
    expect(((await first.json()) as { imported: number }).imported).toBe(2);

    const second = await postCsv(base, csv);
    expect(second.status).toBe(200);
    const report = (await second.json()) as { imported: number; duplicates: number; rejected: unknown[] };
    expect(report.imported).toBe(0);
    expect(report.duplicates).toBe(2);
    expect(report.rejected).toHaveLength(2);

    const expenses = (await (await get(base, "/expenses")).json()) as unknown[];
    expect(expenses).toHaveLength(2);
  });

  it("imports a row repeated within one file exactly once", async () => {
    const base = await bootWithMembers();
    const duplicated = [header, "2027-01-10,Cabin,12.34,gonza,", "2027-01-10,Cabin,12.34,gonza,"].join("\n");

    const res = await postCsv(base, duplicated);
    const report = (await res.json()) as { imported: number; duplicates: number };
    expect(report).toMatchObject({ imported: 1, duplicates: 1 });

    const expenses = (await (await get(base, "/expenses")).json()) as unknown[];
    expect(expenses).toHaveLength(1);
  });

  it("answers with the report for an empty file and 400 for a non-CSV body", async () => {
    const base = await bootWithMembers();

    const empty = await postCsv(base, "");
    expect(empty.status).toBe(200);
    const report = (await empty.json()) as { imported: number; rejected: Array<{ line: number; reason: string }> };
    expect(report.imported).toBe(0);
    expect(report.rejected).toEqual([{ line: 1, reason: expect.stringMatching(/missing header row/) }]);

    // A body sent as something other than text/csv never reaches the parser.
    const notCsv = await postCsv(base, "not csv", "text/plain");
    expect(notCsv.status).toBe(400);
  });
});
