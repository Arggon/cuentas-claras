import { computeBalances } from "./ledger.js";
import { computeSettlement } from "./settlement.js";
import type { Mailer } from "./mailer.js";
import type { Balance, Expense, Ledger, Transfer } from "./types.js";

/** Reported month; `month` is 1-12 (matches the human label, not Date's 0-11). */
export interface DigestPeriod {
  year: number;
  month: number;
}

export interface DigestContent {
  monthLabel: string;
  newExpenses: Expense[];
  balances: Balance[];
  transfers: Transfer[];
  text: string;
}

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/**
 * The month the digest reports: the one that just closed relative to `now`
 * (a run fired on Jan 1 reports December of the previous year).
 */
export function previousPeriod(now: Date): DigestPeriod {
  const month = now.getMonth() + 1;
  return month === 1
    ? { year: now.getFullYear() - 1, month: 12 }
    : { year: now.getFullYear(), month: month - 1 };
}

/**
 * The only currency-formatting edge in the digest path (ADR 0003 keeps the
 * core in integer cents). es-AR style: "$1.234,56", negatives as "-$...".
 */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toString();
  const thousands = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}$${thousands},${(abs % 100).toString().padStart(2, "0")}`;
}

function monthPrefix(period: DigestPeriod): string {
  return `${period.year}-${period.month.toString().padStart(2, "0")}`;
}

function balanceLine(balance: Balance): string {
  if (balance.netCents === 0) return `- ${balance.member}: $0,00 (sin deuda)`;
  if (balance.netCents > 0) {
    return `- ${balance.member}: ${formatCents(balance.netCents)} a favor`;
  }
  return `- ${balance.member}: ${formatCents(balance.netCents)} (debe)`;
}

function renderText(
  ledger: Ledger,
  monthLabel: string,
  newExpenses: Expense[],
  balances: Balance[],
  transfers: Transfer[],
): string {
  const lines: string[] = [
    `Resumen mensual de cuentas-claras — ${monthLabel}`,
    `Grupo: ${ledger.group}`,
    "",
    `Gastos nuevos del mes (${newExpenses.length}):`,
  ];
  if (newExpenses.length === 0) {
    lines.push("(ningún gasto registrado este mes)");
  } else {
    for (const expense of newExpenses) {
      lines.push(
        `- ${expense.date} · ${expense.description} · ${formatCents(expense.amountCents)} · pagó ${expense.paidBy}`,
      );
    }
  }
  lines.push("", "Balances actuales:");
  for (const balance of balances) {
    lines.push(balanceLine(balance));
  }
  lines.push("", "Transferencias sugeridas:");
  if (transfers.length === 0) {
    lines.push("(no hay deudas pendientes)");
  } else {
    for (const transfer of transfers) {
      lines.push(
        `- ${transfer.from} → ${transfer.to}: ${formatCents(transfer.amountCents)}`,
      );
    }
  }
  lines.push("", "Mensaje automático de cuentas-claras.");
  return lines.join("\n");
}

/**
 * Pure digest builder: no I/O, integer cents until the text rendering.
 * `newExpenses` covers only the reported month; balances and transfers cover
 * the whole ledger (they are the group's *current* state, not the month's).
 */
export function buildDigestContent(ledger: Ledger, period: DigestPeriod): DigestContent {
  const prefix = monthPrefix(period);
  const newExpenses = ledger.expenses.filter((expense) => expense.date.startsWith(prefix));
  const balances = computeBalances(ledger.members, ledger.expenses);
  const transfers = computeSettlement(balances);
  const monthLabel = `${MONTH_NAMES[period.month - 1]} ${period.year}`;
  const text = renderText(ledger, monthLabel, newExpenses, balances, transfers);
  return { monthLabel, newExpenses, balances, transfers, text };
}

/**
 * Arms subject + recipients and delegates to the Mailer boundary. Recipients
 * are injected (env-derived upstream): the ledger has no modeled emails.
 */
export async function sendDigest(
  mailer: Mailer,
  ledger: Ledger,
  period: DigestPeriod,
  addresses: { from: string; to: string[] },
): Promise<void> {
  const content = buildDigestContent(ledger, period);
  await mailer.sendMail({
    from: addresses.from,
    to: addresses.to.join(", "),
    subject: `Resumen mensual cuentas-claras — ${content.monthLabel}`,
    text: content.text,
  });
}
