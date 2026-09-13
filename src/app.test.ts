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
