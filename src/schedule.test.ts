import { describe, expect, it, vi } from "vitest";
import {
  msUntilNextMonthlyRun,
  scheduleMonthlyDigest,
  type TimerScheduler,
} from "./schedule.js";

interface ScheduledTimer {
  handler: () => void;
  ms: number;
}

/** Deterministic time+timer double: nothing ever runs on the real clock. */
class FakeTimers implements TimerScheduler {
  scheduled: ScheduledTimer[] = [];
  cleared: unknown[] = [];
  private currentTime: Date;

  constructor(start: Date) {
    this.currentTime = start;
  }

  now(): Date {
    return this.currentTime;
  }

  setTimeout(handler: () => void, ms: number): unknown {
    const timer: ScheduledTimer = { handler, ms };
    this.scheduled.push(timer);
    return timer;
  }

  clearTimeout(handle: unknown): void {
    this.cleared.push(handle);
  }

  /** Simulate the timeout firing at its scheduled instant. */
  fire(index: number): void {
    const timer = this.scheduled[index];
    this.currentTime = new Date(this.currentTime.getTime() + timer.ms);
    timer.handler();
  }
}

describe("msUntilNextMonthlyRun", () => {
  const cases: { name: string; now: Date; hour: number; next: Date }[] = [
    {
      name: "day 1 before the hour targets the same day",
      now: new Date(2027, 2, 1, 5, 0, 0, 0),
      hour: 9,
      next: new Date(2027, 2, 1, 9, 0, 0, 0),
    },
    {
      name: "day 1 after the hour rolls to the next month",
      now: new Date(2027, 2, 1, 10, 30, 0, 0),
      hour: 9,
      next: new Date(2027, 3, 1, 9, 0, 0, 0),
    },
    {
      name: "mid-month targets day 1 of the next month",
      now: new Date(2027, 2, 15, 12, 0, 0, 0),
      hour: 9,
      next: new Date(2027, 3, 1, 9, 0, 0, 0),
    },
    {
      name: "last day of the month targets day 1 of the next month",
      now: new Date(2027, 0, 31, 22, 0, 0, 0),
      hour: 9,
      next: new Date(2027, 1, 1, 9, 0, 0, 0),
    },
    {
      name: "Dec 31 rolls over to Jan 1 of the next year",
      now: new Date(2026, 11, 31, 23, 0, 0, 0),
      hour: 9,
      next: new Date(2027, 0, 1, 9, 0, 0, 0),
    },
    {
      name: "exactly at the target instant targets the next month (strictly after)",
      now: new Date(2027, 2, 1, 9, 0, 0, 0),
      hour: 9,
      next: new Date(2027, 3, 1, 9, 0, 0, 0),
    },
    {
      name: "midnight hour on day 1 after the run still lands in-month next month",
      now: new Date(2027, 4, 1, 0, 0, 0, 0),
      hour: 0,
      next: new Date(2027, 5, 1, 0, 0, 0, 0),
    },
  ];

  for (const { name, now, hour, next } of cases) {
    it(name, () => {
      expect(msUntilNextMonthlyRun(now, hour)).toBe(next.getTime() - now.getTime());
    });
  }

  it("always returns a positive delay", () => {
    for (let day = 1; day <= 28; day++) {
      for (const hour of [0, 9, 23]) {
        expect(msUntilNextMonthlyRun(new Date(2027, 5, day, 12), hour)).toBeGreaterThan(0);
      }
    }
  });
});

describe("scheduleMonthlyDigest", () => {
  it("arms the first run at the next monthly instant", () => {
    const timers = new FakeTimers(new Date(2027, 2, 20, 8, 0, 0, 0));
    const fn = vi.fn();
    const cancel = scheduleMonthlyDigest(fn, { hour: 9 }, timers);
    cancel();

    expect(timers.scheduled).toHaveLength(1);
    const expected = new Date(2027, 3, 1, 9, 0, 0, 0).getTime() - timers.now().getTime();
    expect(timers.scheduled[0].ms).toBe(expected);
    expect(fn).not.toHaveBeenCalled();
  });

  it("fires the callback and re-arms for the following month", () => {
    const timers = new FakeTimers(new Date(2027, 2, 20, 8, 0, 0, 0));
    const fn = vi.fn();
    const cancel = scheduleMonthlyDigest(fn, { hour: 9 }, timers);

    timers.fire(0); // Apr 1 09:00

    expect(fn).toHaveBeenCalledTimes(1);
    expect(timers.scheduled).toHaveLength(2);
    const expected = new Date(2027, 4, 1, 9, 0, 0, 0).getTime() - timers.now().getTime();
    expect(timers.scheduled[1].ms).toBe(expected);
    cancel();
  });

  it("keeps re-arming across several fires", () => {
    const timers = new FakeTimers(new Date(2027, 11, 31, 10, 0, 0, 0));
    const fn = vi.fn();
    const cancel = scheduleMonthlyDigest(fn, { hour: 9 }, timers);

    timers.fire(0); // Jan 1 09:00
    timers.fire(1); // Feb 1 09:00

    expect(fn).toHaveBeenCalledTimes(2);
    expect(timers.scheduled).toHaveLength(3);
    cancel();
  });

  it("re-arms even when the callback throws (the loop never dies)", () => {
    const timers = new FakeTimers(new Date(2027, 2, 20, 8, 0, 0, 0));
    const cancel = scheduleMonthlyDigest(
      () => {
        throw new Error("boom");
      },
      { hour: 9 },
      timers,
    );

    expect(() => timers.fire(0)).not.toThrow();
    expect(timers.scheduled).toHaveLength(2);
    cancel();
  });

  it("cancel clears the pending timer and stops the loop for good", () => {
    const timers = new FakeTimers(new Date(2027, 2, 20, 8, 0, 0, 0));
    const fn = vi.fn();
    const cancel = scheduleMonthlyDigest(fn, { hour: 9 }, timers);
    const pending = timers.scheduled[0];

    cancel();
    expect(timers.cleared).toContain(pending);

    // A late fire (timer already cleared in production) must do nothing at all.
    pending.handler();
    expect(fn).not.toHaveBeenCalled();
    expect(timers.scheduled).toHaveLength(1);
  });
});
