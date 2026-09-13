import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FileLedgerRepository } from "./store.js";
import type { Expense } from "./types.js";

async function tempLedgerPath(): Promise<{ dir: string; file: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), "cc-store-"));
  return { dir, file: path.join(dir, "ledger.json") };
}

const expense: Expense = {
  id: "exp_1",
  date: "2027-01-10",
  description: "Cabin",
  amountCents: 4500000,
  paidBy: "gonza",
  participants: ["gonza", "sol"],
};

describe("FileLedgerRepository", () => {
  it("returns an empty ledger when the file does not exist yet", async () => {
    const { file } = await tempLedgerPath();
    const store = new FileLedgerRepository(file);
    const ledger = await store.load();
    expect(ledger).toEqual({ group: "cuentas-claras", members: [], expenses: [] });
  });

  it("persists members and expenses across repository instances", async () => {
    const { file } = await tempLedgerPath();
    await new FileLedgerRepository(file).addMember("gonza");
    await new FileLedgerRepository(file).addMember("gonza"); // idempotent
    await new FileLedgerRepository(file).append([expense]);

    const ledger = await new FileLedgerRepository(file).load();
    expect(ledger.members).toEqual(["gonza"]);
    expect(ledger.expenses).toEqual([expense]);
  });

  it("leaves no tmp files behind after a save", async () => {
    const { dir, file } = await tempLedgerPath();
    const store = new FileLedgerRepository(file);
    await store.addMember("sol");
    await store.append([expense]);
    const files = await readdir(dir);
    expect(files).toEqual(["ledger.json"]);
  });
});
