import { describe, expect, it } from "vitest";
import { parseCsvExpenses } from "./csv.js";

const MEMBERS = ["gonza", "sol", "martin"];

const HEADER = "date,description,amount,paid_by,participants";

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join("\n");
}

function rowOf(body: string, index = 0) {
  const parsed = parseCsvExpenses(body, MEMBERS);
  expect(parsed.errors).toEqual([]);
  expect(parsed.rows.length).toBeGreaterThan(index);
  return parsed.rows[index];
}

function errorsOf(body: string) {
  const parsed = parseCsvExpenses(body, MEMBERS);
  expect(parsed.rows).toEqual([]);
  return parsed.errors;
}

describe("parseCsvExpenses", () => {
  it("parses dot, comma, integer and one-decimal amounts to exact integer cents", () => {
    const cases: Array<[string, number]> = [
      ["12.34", 1234],
      ["12,34", 1234],
      ["12", 1200],
      ["12.5", 1250],
      ["0.07", 7],
    ];
    for (const [amount, amountCents] of cases) {
      expect(rowOf(csv(`2027-01-10,Cabin,"${amount}",gonza,`)).amountCents).toBe(amountCents);
    }
  });

  it("rejects amounts that are not exact decimals (never rounds)", () => {
    for (const amount of ["12.345", "1,234.56", "1.234,56", "-1.00", "0", "0,00", "abc", "", "12 34"]) {
      const errors = errorsOf(csv(`2027-01-10,Cabin,"${amount}",gonza,`));
      expect(errors).toEqual([{ line: 2, reason: expect.stringMatching(/amount/) }]);
    }
  });

  it("rejects non-ISO dates", () => {
    for (const date of ["10/01/2027", "2027-13-01", "2027-02-30", "20270110", ""]) {
      const errors = errorsOf(csv(`${date},Cabin,12.34,gonza,`));
      expect(errors).toEqual([{ line: 2, reason: expect.stringMatching(/ISO date/) }]);
    }
  });

  it("rejects empty descriptions", () => {
    for (const description of ["", "   "]) {
      const errors = errorsOf(csv(`2027-01-10,${description},12.34,gonza,`));
      expect(errors).toEqual([{ line: 2, reason: expect.stringMatching(/description/) }]);
    }
  });

  it("rejects unknown paid_by per row and still imports the rest", () => {
    const parsed = parseCsvExpenses(
      [HEADER, "2027-01-10,Cabin,12.34,gonza,", "2027-01-11,Cafe,3.00,nadia,"].join("\n"),
      MEMBERS,
    );
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({ date: "2027-01-10", paidBy: "gonza" });
    expect(parsed.errors).toEqual([
      { line: 3, reason: expect.stringMatching(/paid_by "nadia" is not a known member/) },
    ]);
  });

  it("accepts semicolon-separated participants and an empty cell as everyone", () => {
    expect(rowOf(csv("2027-01-10,Cabin,12.34,gonza,sol;martin")).participants).toEqual([
      "sol",
      "martin",
    ]);
    expect(rowOf(csv("2027-01-10,Cabin,12.34,gonza,")).participants).toEqual([]);
  });

  it("rejects unknown, repeated and empty participant names", () => {
    for (const participants of ["sol;nadia", "sol;sol", "sol;;martin"]) {
      const errors = errorsOf(csv(`2027-01-10,Cabin,12.34,gonza,${participants}`));
      expect(errors).toEqual([{ line: 2, reason: expect.stringMatching(/participants/) }]);
    }
  });

  it("handles CRLF line endings and a UTF-8 BOM", () => {
    const body = `\ufeff${[HEADER, "2027-01-10,Cabin,12.34,gonza,sol", "2027-01-11,Cafe,3,gonza,"].join("\r\n")}`;
    const parsed = parseCsvExpenses(body, MEMBERS);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows.map((r) => r.date)).toEqual(["2027-01-10", "2027-01-11"]);
    expect(parsed.rows[0].participants).toEqual(["sol"]);
    expect(parsed.rows[1].amountCents).toBe(300);
  });

  it("supports basic RFC 4180 quoting: commas, newlines and doubled quotes", () => {
    const row = rowOf(
      csv('2027-01-10,"Dinner, drinks, tip",12.34,gonza,', '2027-01-11,"He said ""hi""",5.00,sol,'),
    );
    expect(row.description).toBe("Dinner, drinks, tip");
    const second = rowOf(csv('2027-01-11,"He said ""hi""",5.00,sol,'));
    expect(second.description).toBe('He said "hi"');
  });

  it("reports 1-based file lines even across blank lines and multi-line quoted fields", () => {
    const errors = errorsOf(
      [
        HEADER,
        "",
        "2027-01-11,x,1.00,nadia,",
      ].join("\n"),
    );
    expect(errors).toEqual([{ line: 3, reason: expect.any(String) }]);

    const shifted = parseCsvExpenses(
      [HEADER, '2027-01-10,"multi', 'line",5.00,gonza,', "2027-01-11,x,1.00,nadia,"].join("\n"),
      MEMBERS,
    );
    expect(shifted.errors).toEqual([{ line: 4, reason: expect.stringMatching(/paid_by/) }]);
    expect(shifted.rows[0].description).toBe("multi\nline");
  });

  it("requires a header row with all five columns, in any order or case", () => {
    expect(errorsOf("").map((e) => e.reason)).toEqual([
      expect.stringMatching(/missing header row/),
    ]);

    const headerOnly = parseCsvExpenses(HEADER, MEMBERS);
    expect(headerOnly).toEqual({ rows: [], errors: [] });

    expect(errorsOf("date,description,amount,paid_by\n2027-01-10,Cabin,12.34,gonza")).toEqual([
      { line: 1, reason: expect.stringMatching(/"participants" column/) },
    ]);

    const reordered = parseCsvExpenses(
      ["PAID_BY,Amount,Description,Date,Participants", "gonza,12.34,Cabin,2027-01-10,sol"].join("\n"),
      MEMBERS,
    );
    expect(reordered.errors).toEqual([]);
    expect(reordered.rows[0]).toMatchObject({
      date: "2027-01-10",
      description: "Cabin",
      amountCents: 1234,
      paidBy: "gonza",
      participants: ["sol"],
    });
  });

  it("ignores extra columns and rejects rows with too few fields", () => {
    const withExtra = parseCsvExpenses(
      [
        `${HEADER},currency`,
        "2027-01-10,Cabin,12.34,gonza,sol,USD",
      ].join("\n"),
      MEMBERS,
    );
    expect(withExtra.errors).toEqual([]);
    expect(withExtra.rows[0].amountCents).toBe(1234);

    expect(errorsOf(csv("2027-01-10,Cabin,12.34"))).toEqual([
      { line: 2, reason: expect.stringMatching(/column\(s\), expected/) },
    ]);
  });

  it("assigns deterministic ids: identical rows collide, different rows do not", () => {
    const id = rowOf(csv("2027-01-10,Cabin,12.34,gonza,sol;martin")).id;
    expect(id).toMatch(/^exp_[0-9a-f]{16}$/);
    // Same logical row (dot vs comma decimal, quoted) -> same id.
    expect(rowOf(csv('2027-01-10,Cabin,"12,34",gonza,sol;martin')).id).toBe(id);
    // Any field difference -> different id.
    expect(rowOf(csv("2027-01-10,Cabin,12.35,gonza,sol;martin")).id).not.toBe(id);
    expect(rowOf(csv("2027-01-10,Cabin,12.34,sol,")).id).not.toBe(id);
  });
});
