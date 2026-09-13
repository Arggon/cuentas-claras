export interface Expense {
  id: string;
  /** ISO date of the expense. */
  date: string;
  description: string;
  amountCents: number;
  /** Member who paid. */
  paidBy: string;
  /** Members splitting the expense (empty = all group members). */
  participants: string[];
}

export interface Balance {
  member: string;
  /** Positive = the group owes this member. Negative = this member owes. */
  netCents: number;
}

export interface Transfer {
  from: string;
  to: string;
  amountCents: number;
}

/** The persisted ledger, exactly as docs/data-format.md defines it. */
export interface Ledger {
  group: string;
  members: string[];
  expenses: Expense[];
}
