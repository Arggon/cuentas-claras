import { describe, expect, it } from "vitest";
import { computeBalances } from "./ledger.js";
import type { Expense } from "./types.js";

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: "exp_1",
    date: "2027-01-10",
    description: "test expense",
    amountCents: 0,
    paidBy: "gonza",
    participants: [],
    ...overrides,
  };
}

const MEMBERS = ["gonza", "sol", "martin"];

describe("computeBalances", () => {
  it("splits an even expense across explicit participants", () => {
    const balances = computeBalances(MEMBERS, [
      expense({ amountCents: 30000, participants: MEMBERS }),
    ]);
    // gonza paid 300 and owes 100 of his own: net +200.
    expect(balances).toEqual([
      { member: "gonza", netCents: 20000 },
      { member: "martin", netCents: -10000 },
      { member: "sol", netCents: -10000 },
    ]);
  });

  it("gives remainder cents to the payer", () => {
    const balances = computeBalances(MEMBERS, [
      expense({ amountCents: 100, participants: MEMBERS }),
    ]);
    // share = 33 each; gonza absorbs the extra cent (34 of his own): net +66.
    expect(balances).toEqual([
      { member: "gonza", netCents: 66 },
      { member: "martin", netCents: -33 },
      { member: "sol", netCents: -33 },
    ]);
  });

  it("treats empty participants as all members", () => {
    const balances = computeBalances(MEMBERS, [
      expense({ amountCents: 400, paidBy: "sol" }),
    ]);
    expect(balances).toEqual([
      { member: "gonza", netCents: -133 },
      { member: "martin", netCents: -133 },
      { member: "sol", netCents: 266 },
    ]);
  });

  it("lists every member exactly once, sorted by name, zero balance included", () => {
    const balances = computeBalances([...MEMBERS, "ana"], [
      expense({ amountCents: 200, participants: ["gonza", "sol"] }),
    ]);
    expect(balances.map((b) => b.member)).toEqual(["ana", "gonza", "martin", "sol"]);
    expect(balances.find((b) => b.member === "ana")).toEqual({ member: "ana", netCents: 0 });
  });

  it("accumulates multiple expenses additively", () => {
    const balances = computeBalances(MEMBERS, [
      expense({ id: "e1", amountCents: 300, participants: MEMBERS }),
      expense({ id: "e2", amountCents: 90, paidBy: "martin", participants: ["gonza", "martin"] }),
    ]);
    // gonza: +200 -45 = +155; martin: -100 +45 = -55; sol: -100.
    expect(balances).toEqual([
      { member: "gonza", netCents: 155 },
      { member: "martin", netCents: -55 },
      { member: "sol", netCents: -100 },
    ]);
  });

  it("joins a payer omitted from participants (keeps the sum at zero)", () => {
    const balances = computeBalances(MEMBERS, [
      expense({ amountCents: 500, participants: ["sol"] }),
    ]);
    // gonza is added to the split: 250 each.
    expect(balances).toEqual([
      { member: "gonza", netCents: 250 },
      { member: "martin", netCents: 0 },
      { member: "sol", netCents: -250 },
    ]);
  });

  it("keeps the sum of balances at zero (property)", () => {
    const scenarios: Expense[][] = [
      [],
      [expense({ amountCents: 1, participants: MEMBERS })],
      [expense({ amountCents: 9999, participants: MEMBERS })],
      [expense({ amountCents: 2, participants: [] })],
      [expense({ amountCents: 12345, paidBy: "sol" }), expense({ amountCents: 7, participants: ["martin"] })],
    ];
    for (const expenses of scenarios) {
      const total = computeBalances(MEMBERS, expenses).reduce((sum, b) => sum + b.netCents, 0);
      expect(total).toBe(0);
    }
  });
});
