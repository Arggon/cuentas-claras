import { describe, expect, it, vi } from "vitest";
import {
  buildDigestContent,
  formatCents,
  previousPeriod,
  sendDigest,
} from "./digest.js";
import type { DigestPeriod } from "./digest.js";
import type { Mailer, MailOptions } from "./mailer.js";
import type { Expense, Ledger } from "./types.js";

const MEMBERS = ["gonza", "sol", "martin"];

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

function ledgerWith(expenses: Expense[]): Ledger {
  return { group: "mendoza-2027", members: MEMBERS, expenses };
}

class FakeMailer implements Mailer {
  sent: MailOptions[] = [];

  async sendMail(options: MailOptions): Promise<void> {
    this.sent.push(options);
  }
}

describe("formatCents", () => {
  it("renders integer cents as es-AR style currency", () => {
    expect(formatCents(0)).toBe("$0,00");
    expect(formatCents(1)).toBe("$0,01");
    expect(formatCents(500)).toBe("$5,00");
    expect(formatCents(123450)).toBe("$1.234,50");
    expect(formatCents(100000000)).toBe("$1.000.000,00");
  });

  it("prefixes negatives with a single minus sign", () => {
    expect(formatCents(-250)).toBe("-$2,50");
    expect(formatCents(-123450)).toBe("-$1.234,50");
  });
});

describe("previousPeriod", () => {
  it("reports the month that just closed", () => {
    expect(previousPeriod(new Date(2027, 2, 15, 12, 30))).toEqual({ year: 2027, month: 2 });
    expect(previousPeriod(new Date(2027, 0, 31, 23, 59))).toEqual({ year: 2026, month: 12 });
  });

  it("rolls January back to December of the previous year", () => {
    expect(previousPeriod(new Date(2027, 0, 1, 9, 0))).toEqual({ year: 2026, month: 12 });
  });
});

describe("buildDigestContent", () => {
  const JAN: DigestPeriod = { year: 2027, month: 1 };

  it("labels the month in Spanish", () => {
    expect(buildDigestContent(ledgerWith([]), JAN).monthLabel).toBe("enero 2027");
    expect(buildDigestContent(ledgerWith([]), { year: 2026, month: 12 }).monthLabel).toBe(
      "diciembre 2026",
    );
  });

  it("only includes expenses dated in the reported month, in ledger order", () => {
    const ledger = ledgerWith([
      expense({ id: "dec", date: "2026-12-31", description: "Cena diciembre", amountCents: 9000 }),
      expense({ id: "jan-a", date: "2027-01-03", description: "Cabaña", amountCents: 4500000 }),
      expense({ id: "jan-b", date: "2027-01-20", description: "Cenas", amountCents: 30000, paidBy: "sol" }),
      expense({ id: "feb", date: "2027-02-01", description: "Febrero", amountCents: 1000 }),
    ]);
    const content = buildDigestContent(ledger, JAN);
    expect(content.newExpenses.map((e) => e.id)).toEqual(["jan-a", "jan-b"]);
  });

  it("computes balances over the whole ledger, not just the month", () => {
    // 300 even among 3 in December: gonza +200, others -100 each.
    const ledger = ledgerWith([
      expense({ date: "2026-12-31", description: "Diciembre", amountCents: 30000 }),
    ]);
    const content = buildDigestContent(ledger, JAN);
    expect(content.balances).toEqual([
      { member: "gonza", netCents: 20000 },
      { member: "martin", netCents: -10000 },
      { member: "sol", netCents: -10000 },
    ]);
    expect(content.newExpenses).toEqual([]);
  });

  it("derives transfers from the current balances (min settlement)", () => {
    const ledger = ledgerWith([
      expense({ date: "2027-01-05", description: "Cabaña", amountCents: 30000 }),
    ]);
    const content = buildDigestContent(ledger, JAN);
    const sorted = [...content.transfers].sort((a, b) => (a.from < b.from ? -1 : 1));
    expect(sorted).toEqual([
      { from: "martin", to: "gonza", amountCents: 10000 },
      { from: "sol", to: "gonza", amountCents: 10000 },
    ]);
  });

  it("renders a Spanish plain-text body with currency-formatted amounts", () => {
    const ledger = ledgerWith([
      expense({ id: "jan-a", date: "2027-01-03", description: "Cabaña", amountCents: 4500000 }),
      expense({ id: "jan-b", date: "2027-01-20", description: "Cenas", amountCents: 30000, paidBy: "sol" }),
    ]);
    const { text } = buildDigestContent(ledger, JAN);
    expect(text).toContain("Resumen mensual de cuentas-claras — enero 2027");
    expect(text).toContain("Grupo: mendoza-2027");
    expect(text).toContain("Gastos nuevos del mes (2):");
    expect(text).toContain("- 2027-01-03 · Cabaña · $45.000,00 · pagó gonza");
    expect(text).toContain("- 2027-01-20 · Cenas · $300,00 · pagó sol");
    expect(text).toContain("Balances actuales:");
    expect(text).toContain("- gonza: $29.900,00 a favor");
    expect(text).toContain("- martin: -$15.100,00 (debe)");
    expect(text).toContain("Transferencias sugeridas:");
    expect(text).toContain("- martin → gonza: $15.100,00");
    expect(text).toContain("- sol → gonza: $14.800,00");
    expect(text).not.toMatch(/\d{5,}/); // no raw cents leak into the text
  });

  it("handles an empty month and a debt-free ledger with explicit wording", () => {
    const { text } = buildDigestContent(ledgerWith([]), JAN);
    expect(text).toContain("Gastos nuevos del mes (0):");
    expect(text).toContain("(ningún gasto registrado este mes)");
    expect(text).toContain("- gonza: $0,00 (sin deuda)");
    expect(text).toContain("(no hay deudas pendientes)");
  });
});

describe("sendDigest", () => {
  it("arms to/subject/text through the Mailer interface", async () => {
    const mailer = new FakeMailer();
    const ledger = ledgerWith([
      expense({ date: "2027-01-03", description: "Cabaña", amountCents: 30000 }),
    ]);
    await sendDigest(mailer, ledger, { year: 2027, month: 1 }, {
      from: "noreply@cuentas.test",
      to: ["gonza@cuentas.test", "sol@cuentas.test"],
    });

    expect(mailer.sent).toHaveLength(1);
    const mail = mailer.sent[0];
    expect(mail.from).toBe("noreply@cuentas.test");
    expect(mail.to).toBe("gonza@cuentas.test, sol@cuentas.test");
    expect(mail.subject).toBe("Resumen mensual cuentas-claras — enero 2027");
    expect(mail.text).toBe(buildDigestContent(ledger, { year: 2027, month: 1 }).text);
  });

  it("resolves once the mailer resolves and propagates failures", async () => {
    const failing: Mailer = {
      sendMail: vi.fn(async () => {
        throw new Error("smtp down");
      }),
    };
    await expect(
      sendDigest(failing, ledgerWith([]), { year: 2027, month: 1 }, { from: "a@b.c", to: ["d@e.f"] }),
    ).rejects.toThrow("smtp down");
  });
});
