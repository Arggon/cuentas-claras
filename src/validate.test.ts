import { describe, expect, it } from "vitest";
import { parseExpenseInput, parseMemberInput } from "./validate.js";

const MEMBERS = ["gonza", "sol", "martin"];

const validBody = {
  date: "2027-01-10",
  description: "Cabin",
  amountCents: 4500000,
  paidBy: "gonza",
  participants: ["sol", "martin"],
};

describe("parseExpenseInput", () => {
  it("accepts a valid expense (empty participants allowed = all members)", () => {
    expect(parseExpenseInput({ ...validBody, participants: [] }, MEMBERS)).toEqual({
      ok: true,
      value: { ...validBody, participants: [] },
    });
  });

  it("rejects non-ISO dates", () => {
    for (const date of ["10/01/2027", "2027-13-01", "20270110", ""]) {
      expect(parseExpenseInput({ ...validBody, date }, MEMBERS).ok).toBe(false);
    }
  });

  it("rejects empty descriptions", () => {
    expect(parseExpenseInput({ ...validBody, description: "   " }, MEMBERS).ok).toBe(false);
  });

  it("rejects non-integer, zero and negative amounts", () => {
    for (const amountCents of [12.34, 0, -100, "4500", Number.NaN]) {
      expect(parseExpenseInput({ ...validBody, amountCents }, MEMBERS).ok).toBe(false);
    }
  });

  it("rejects unknown payers and unknown participants", () => {
    expect(parseExpenseInput({ ...validBody, paidBy: "nadia" }, MEMBERS).ok).toBe(false);
    expect(
      parseExpenseInput({ ...validBody, participants: ["sol", "nadia"] }, MEMBERS).ok,
    ).toBe(false);
  });

  it("rejects duplicate participants and non-array participants", () => {
    expect(
      parseExpenseInput({ ...validBody, participants: ["sol", "sol"] }, MEMBERS).ok,
    ).toBe(false);
    expect(parseExpenseInput({ ...validBody, participants: "sol" }, MEMBERS).ok).toBe(false);
  });
});

describe("parseMemberInput", () => {
  it("trims and accepts a new member", () => {
    expect(parseMemberInput({ name: "  nadia " }, MEMBERS)).toEqual({
      ok: true,
      value: "nadia",
    });
  });

  it("rejects empty names and duplicates", () => {
    expect(parseMemberInput({ name: "" }, MEMBERS).ok).toBe(false);
    expect(parseMemberInput({ name: "sol" }, MEMBERS).ok).toBe(false);
    expect(parseMemberInput("sol", MEMBERS).ok).toBe(false);
  });
});
