import { promises as fs } from "node:fs";
import path from "node:path";
import type { Expense, Ledger } from "./types.js";

/**
 * Storage boundary (ADR 0002): the API layer talks to this interface only,
 * so the JSON file can later become SQLite without touching routes.
 */
export interface LedgerRepository {
  load(): Promise<Ledger>;
  append(expenses: Expense[]): Promise<void>;
  addMember(member: string): Promise<void>;
}

export const DEFAULT_LEDGER_GROUP = "cuentas-claras";

function emptyLedger(): Ledger {
  return { group: DEFAULT_LEDGER_GROUP, members: [], expenses: [] };
}

export class FileLedgerRepository implements LedgerRepository {
  /** Serializes read-modify-write cycles within this process. */
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async load(): Promise<Ledger> {
    try {
      return JSON.parse(await fs.readFile(this.filePath, "utf8")) as Ledger;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptyLedger();
      throw err;
    }
  }

  async append(expenses: Expense[]): Promise<void> {
    await this.mutate((ledger) => {
      ledger.expenses.push(...expenses);
    });
  }

  async addMember(member: string): Promise<void> {
    await this.mutate((ledger) => {
      if (!ledger.members.includes(member)) ledger.members.push(member);
    });
  }

  private async mutate(mutate: (ledger: Ledger) => void): Promise<void> {
    const run = this.writeQueue.then(async () => {
      const ledger = await this.load();
      mutate(ledger);
      await this.save(ledger);
    });
    this.writeQueue = run.catch(() => {});
    return run;
  }

  /**
   * Atomic write per ADR 0002: write a tmp sibling file, then rename over
   * the target — a crash mid-write can never damage the existing ledger.
   */
  private async save(ledger: Ledger): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tmp, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
    await fs.rename(tmp, this.filePath);
  }
}
