import type { Expense } from "./types.js";

export type ParsedExpense = Pick<Expense, "date" | "description" | "amountCents" | "paidBy" | "participants">;

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates an expense body against docs/data-format.md. Pure: given the
 * current member list, it either returns the typed fields or a reason.
 */
export function parseExpenseInput(body: unknown, members: string[]): ParseResult<ParsedExpense> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "body must be a JSON object" };
  }
  const { date, description, amountCents, paidBy, participants } = body as Record<string, unknown>;

  if (typeof date !== "string" || !ISO_DATE.test(date) || Number.isNaN(Date.parse(date))) {
    return { ok: false, error: "date must be an ISO date (YYYY-MM-DD)" };
  }
  if (typeof description !== "string" || description.trim().length === 0) {
    return { ok: false, error: "description must be a non-empty string" };
  }
  if (!Number.isInteger(amountCents) || (amountCents as number) <= 0) {
    return { ok: false, error: "amountCents must be a positive integer (cents)" };
  }
  if (typeof paidBy !== "string" || !members.includes(paidBy)) {
    return { ok: false, error: `paidBy must be a known member (members: ${members.join(", ") || "none"})` };
  }
  if (!Array.isArray(participants) || participants.some((p) => typeof p !== "string")) {
    return { ok: false, error: "participants must be an array of member names" };
  }
  if (new Set(participants).size !== participants.length) {
    return { ok: false, error: "participants must not repeat a member" };
  }
  const unknown = (participants as string[]).filter((p) => !members.includes(p));
  if (unknown.length > 0) {
    return { ok: false, error: `unknown participants: ${unknown.join(", ")}` };
  }
  return {
    ok: true,
    value: {
      date,
      description,
      amountCents: amountCents as number,
      paidBy,
      participants: participants as string[],
    },
  };
}

/** Validates a new member name: non-empty, trimmed, not already present. */
export function parseMemberInput(body: unknown, members: string[]): ParseResult<string> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "body must be a JSON object" };
  }
  const { name } = body as Record<string, unknown>;
  if (typeof name !== "string" || name.trim().length === 0) {
    return { ok: false, error: "name must be a non-empty string" };
  }
  const trimmed = name.trim();
  if (members.includes(trimmed)) {
    return { ok: false, error: `member "${trimmed}" already exists` };
  }
  return { ok: true, value: trimmed };
}
