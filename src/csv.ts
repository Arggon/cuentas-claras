import { createHash } from "node:crypto";
import { isValidIsoDate, type ParsedExpense } from "./validate.js";

/** A validated CSV row, ready to append, carrying its deterministic id. */
export type ImportableExpense = ParsedExpense & { id: string };

export interface CsvRowError {
  /** 1-based line in the file where the record starts. */
  line: number;
  reason: string;
}

export interface ParsedCsv {
  rows: ImportableExpense[];
  errors: CsvRowError[];
}

const COLUMNS = ["date", "description", "amount", "paid_by", "participants"] as const;
type Column = (typeof COLUMNS)[number];
type HeaderMap = Record<Column, number>;

/** Digits, then at most one decimal separator (dot or comma) with 1-2 digits (ADR 0003). */
const AMOUNT = /^\d+(?:[.,]\d{1,2})?$/;
/** Cap keeps intPart * 100 far inside Number.MAX_SAFE_INTEGER. */
const MAX_INTEGER_DIGITS = 12;
const ID_HEX_CHARS = 16;

interface RawRecord {
  fields: string[];
  line: number;
}

/**
 * Minimal RFC 4180 reader: fields may be quoted to contain commas, newlines and
 * doubled quotes; `\n` and `\r\n` both end a record (a lone `\r` is field content).
 * Blank lines between records are ignored. Pure string handling, no I/O.
 */
function readRecords(text: string): RawRecord[] {
  const records: RawRecord[] = [];
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let recordOpen = false;
  let line = 1;
  let recordLine = 1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === "\n") line++;
        field += ch;
      }
      continue;
    }
    if (ch === '"' && field === "") {
      inQuotes = true;
      recordOpen = true;
      continue;
    }
    if (ch === ",") {
      fields.push(field);
      field = "";
      recordOpen = true;
      continue;
    }
    if (ch === "\n") {
      if (recordOpen) {
        fields.push(field);
        records.push({ fields, line: recordLine });
        fields = [];
        field = "";
        recordOpen = false;
      }
      recordLine = line + 1;
      line++;
      continue;
    }
    // `\r` only matters as the first half of a CRLF pair.
    if (ch === "\r" && text[i + 1] === "\n") continue;
    field += ch;
    recordOpen = true;
  }
  if (recordOpen) {
    fields.push(field);
    records.push({ fields, line: recordLine });
  }
  return records;
}

function mapHeader(fields: string[]): { ok: true; index: HeaderMap } | { ok: false; error: string } {
  const names = fields.map((f) => f.trim().toLowerCase());
  const index = {} as HeaderMap;
  for (const column of COLUMNS) {
    const at = names.indexOf(column);
    if (at === -1) {
      return { ok: false, error: `header must include a "${column}" column` };
    }
    index[column] = at;
  }
  return { ok: true, index };
}

/**
 * Decimal text → integer cents (ADR 0003): accepts `12.34` and `12,34`, plain
 * integers (`12` → 1200) and one decimal digit (`12.5` → 1250). Anything that is
 * not an exact decimal amount — 3+ decimals, two separators, negative, zero,
 * garbage — is rejected, never rounded.
 */
function amountToCents(raw: string): { ok: true; cents: number } | { ok: false; error: string } {
  const value = raw.trim();
  if (!AMOUNT.test(value)) {
    return { ok: false, error: `amount "${value}" must be a decimal amount with at most 2 decimals (12.34 or 12,34)` };
  }
  const separator = value.search(/[.,]/);
  const intPart = separator === -1 ? value : value.slice(0, separator);
  const fracPart = separator === -1 ? "" : value.slice(separator + 1);
  if (intPart.length > MAX_INTEGER_DIGITS) {
    return { ok: false, error: `amount "${value}" is too large` };
  }
  const cents = Number.parseInt(intPart, 10) * 100 + Number.parseInt(fracPart.padEnd(2, "0"), 10);
  if (cents <= 0) {
    return { ok: false, error: `amount "${value}" must be positive` };
  }
  return { ok: true, cents };
}

/**
 * The id that makes imports idempotent: the same logical row always hashes to the
 * same id, so re-importing a file can be detected row by row.
 */
function deterministicId(row: ParsedExpense): string {
  const digest = createHash("sha256")
    .update(`${row.date}|${row.description}|${row.amountCents}|${row.paidBy}|${row.participants.join(";")}`)
    .digest("hex");
  return `exp_${digest.slice(0, ID_HEX_CHARS)}`;
}

/**
 * Parses a CSV export into validated expenses. Pure: text + member list in,
 * rows + per-row errors out; no I/O, no store access. Per docs/specs/csv-import-004:
 * a bad row rejects only itself, one bad line never poisons the file.
 */
export function parseCsvExpenses(text: string, members: string[]): ParsedCsv {
  const rows: ImportableExpense[] = [];
  const errors: CsvRowError[] = [];

  // Excel-style UTF-8 BOM would otherwise corrupt the first header name.
  const body = text.startsWith("\ufeff") ? text.slice(1) : text;
  const records = readRecords(body);
  if (records.length === 0) {
    return {
      rows,
      errors: [{ line: 1, reason: "missing header row (date,description,amount,paid_by,participants)" }],
    };
  }

  const [header, ...data] = records;
  const mapped = mapHeader(header.fields);
  if (!mapped.ok) {
    return { rows, errors: [{ line: header.line, reason: mapped.error }] };
  }
  const column = mapped.index;
  const lastColumn = Math.max(...Object.values(column));

  for (const record of data) {
    const fields = record.fields;
    if (fields.length <= lastColumn) {
      errors.push({
        line: record.line,
        reason: `row has ${fields.length} column(s), expected ${lastColumn + 1}`,
      });
      continue;
    }

    const date = fields[column.date].trim();
    if (!isValidIsoDate(date)) {
      errors.push({ line: record.line, reason: `date "${date}" must be an ISO date (YYYY-MM-DD)` });
      continue;
    }

    const description = fields[column.description].trim();
    if (description.length === 0) {
      errors.push({ line: record.line, reason: "description must be non-empty" });
      continue;
    }

    const amount = amountToCents(fields[column.amount]);
    if (!amount.ok) {
      errors.push({ line: record.line, reason: amount.error });
      continue;
    }

    const paidBy = fields[column.paid_by].trim();
    if (!members.includes(paidBy)) {
      errors.push({
        line: record.line,
        reason: `paid_by "${paidBy}" is not a known member (members: ${members.join(", ") || "none"})`,
      });
      continue;
    }

    const participantsCell = fields[column.participants].trim();
    const participants = participantsCell === "" ? [] : participantsCell.split(";").map((p) => p.trim());
    if (participants.some((p) => p.length === 0)) {
      errors.push({ line: record.line, reason: "participants must not contain empty names (separate members with ';')" });
      continue;
    }
    const unknown = participants.filter((p) => !members.includes(p));
    if (unknown.length > 0) {
      errors.push({ line: record.line, reason: `unknown participants: ${unknown.join(", ")}` });
      continue;
    }
    if (new Set(participants).size !== participants.length) {
      errors.push({ line: record.line, reason: "participants must not repeat a member" });
      continue;
    }

    const row: ParsedExpense = { date, description, amountCents: amount.cents, paidBy, participants };
    rows.push({ ...row, id: deterministicId(row) });
  }

  return { rows, errors };
}
