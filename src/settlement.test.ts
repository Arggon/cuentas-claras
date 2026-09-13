import { describe, expect, it } from "vitest";
import { computeBalances } from "./ledger.js";
import { computeSettlement } from "./settlement.js";
import type { Balance, Expense } from "./types.js";

const balances = (entries: Array<[string, number]>): Balance[] =>
  entries.map(([member, netCents]) => ({ member, netCents }));

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

const totalTransferred = (transfers: ReturnType<typeof computeSettlement>) =>
  transfers.reduce((sum, t) => sum + t.amountCents, 0);

describe("computeSettlement", () => {
  it("clears a simple one-way debt", () => {
    const transfers = computeSettlement(
      balances([
        ["gonza", 100],
        ["sol", -100],
      ]),
    );
    expect(transfers).toEqual([{ from: "sol", to: "gonza", amountCents: 100 }]);
  });

  it("splits one creditor across several debtors with exact cents", () => {
    const transfers = computeSettlement(
      balances([
        ["gonza", 100],
        ["sol", -60],
        ["martin", -40],
      ]),
    );
    // Largest debtor first: sol 60, then martin 40.
    expect(transfers).toEqual([
      { from: "sol", to: "gonza", amountCents: 60 },
      { from: "martin", to: "gonza", amountCents: 40 },
    ]);
  });

  it("matches the largest creditor with the largest debtor first", () => {
    const transfers = computeSettlement(
      balances([
        ["ana", 500],
        ["gonza", 100],
        ["sol", -300],
        ["martin", -300],
      ]),
    );
    expect(transfers[0]).toEqual({ from: "sol", to: "ana", amountCents: 300 });
    expect(transfers[1]).toEqual({ from: "martin", to: "ana", amountCents: 200 });
    expect(transfers[2]).toEqual({ from: "martin", to: "gonza", amountCents: 100 });
  });

  it("returns no transfers for empty or all-zero balances", () => {
    expect(computeSettlement([])).toEqual([]);
    expect(computeSettlement(balances([["gonza", 0], ["sol", 0]]))).toEqual([]);
  });

  it("never puts a member on both sides (property)", () => {
    const transfers = computeSettlement(
      balances([
        ["ana", 333],
        ["gonza", 1],
        ["sol", -17],
        ["martin", -317],
      ]),
    );
    const froms = new Set(transfers.map((t) => t.from));
    const tos = new Set(transfers.map((t) => t.to));
    for (const from of froms) expect(tos.has(from)).toBe(false);
  });

  it("clears ledger-produced balances exactly (property)", () => {
    const members = ["gonza", "sol", "martin", "ana"];
    const expenses = [
      expense({ id: "e1", amountCents: 4500000, paidBy: "gonza" }),
      expense({ id: "e2", amountCents: 10000, paidBy: "sol", participants: ["sol", "martin"] }),
      expense({ id: "e3", amountCents: 999, paidBy: "martin" }),
    ];
    const nets = computeBalances(members, expenses);
    const totalDebt = nets.reduce((sum, b) => sum + Math.max(0, -b.netCents), 0);

    const transfers = computeSettlement(nets);
    expect(totalTransferred(transfers)).toBe(totalDebt);
    expect(totalDebt).toBeGreaterThan(0);
    // Transfer count bound: at most creditors + debtors - 1.
    const sides = nets.filter((b) => b.netCents !== 0).length;
    expect(transfers.length).toBeLessThanOrEqual(sides - 1);
  });
});
