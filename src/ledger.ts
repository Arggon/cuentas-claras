import type { Balance, Expense } from "./types.js";

/**
 * Net balance per member in integer cents: positive = the group owes this
 * member, negative = this member owes. Pure and deterministic — no I/O.
 *
 * Each expense is split evenly across its participants (empty = all members).
 * The remainder cents of an uneven split belong to the payer, so the payer's
 * credit is always `share * (n - 1)`: every other participant contributes
 * exactly `share` and the totals cancel to zero for any integer input.
 */
export function computeBalances(members: string[], expenses: Expense[]): Balance[] {
  const net = new Map<string, number>(members.map((m) => [m, 0]));

  for (const expense of expenses) {
    const participants =
      expense.participants.length > 0 ? [...expense.participants] : [...members];
    // The payer always shares his own expense, even if a bad row omitted him:
    // this is what keeps sum(net) === 0.
    if (!participants.includes(expense.paidBy)) {
      participants.push(expense.paidBy);
    }

    const share = Math.floor(expense.amountCents / participants.length);

    for (const participant of participants) {
      if (participant === expense.paidBy) continue;
      net.set(participant, (net.get(participant) ?? 0) - share);
    }
    net.set(
      expense.paidBy,
      (net.get(expense.paidBy) ?? 0) + share * (participants.length - 1),
    );
  }

  return [...net.entries()]
    .map(([member, netCents]) => ({ member, netCents }))
    .sort((a, b) => (a.member < b.member ? -1 : a.member > b.member ? 1 : 0));
}
