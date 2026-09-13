import type { Balance, Transfer } from "./types.js";

interface Side {
  member: string;
  cents: number;
}

/**
 * Minimal transfer list that clears all debts, in integer cents. Pure and
 * deterministic — no I/O.
 *
 * Greedy min-cash-flow: repeatedly match the largest creditor with the
 * largest debtor for the smaller of the two amounts. Every balance has one
 * sign, so no member can end up on both sides, and the match loop clears at
 * least one side per transfer — the list never exceeds
 * creditors + debtors - 1 entries.
 */
export function computeSettlement(balances: Balance[]): Transfer[] {
  const creditors: Side[] = balances
    .filter((b) => b.netCents > 0)
    .map((b) => ({ member: b.member, cents: b.netCents }))
    .sort((a, b) => b.cents - a.cents);
  const debtors: Side[] = balances
    .filter((b) => b.netCents < 0)
    .map((b) => ({ member: b.member, cents: -b.netCents }))
    .sort((a, b) => b.cents - a.cents);

  const transfers: Transfer[] = [];
  let creditor = 0;
  let debtor = 0;

  while (creditor < creditors.length && debtor < debtors.length) {
    const amount = Math.min(creditors[creditor].cents, debtors[debtor].cents);
    transfers.push({
      from: debtors[debtor].member,
      to: creditors[creditor].member,
      amountCents: amount,
    });
    creditors[creditor].cents -= amount;
    debtors[debtor].cents -= amount;
    if (creditors[creditor].cents === 0) creditor++;
    if (debtors[debtor].cents === 0) debtor++;
  }

  return transfers;
}
