/**
 * Injectable time dependency so tests never leave live timers behind and can
 * control "now" deterministically.
 */
export interface TimerScheduler {
  now(): Date;
  setTimeout(handler: () => void, timeoutMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const nodeTimers: TimerScheduler = {
  now: () => new Date(),
  setTimeout: (handler, timeoutMs) => setTimeout(handler, timeoutMs),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Milliseconds until the next monthly run: day 1 of a month at `hour`:00:00
 * local time, strictly after `now`. The target is always a day 1, so rolling
 * the month forward can never clamp (every month has a 1st) and Dec → Jan
 * rolls into the next year on its own.
 */
export function msUntilNextMonthlyRun(now: Date, hour: number): number {
  const target = new Date(now.getFullYear(), now.getMonth(), 1, hour, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setMonth(target.getMonth() + 1);
  }
  return target.getTime() - now.getTime();
}

export type CancelSchedule = () => void;

/**
 * setTimeout loop: arms `fn` for the next monthly run and re-arms itself after
 * every fire. Returns a cancel handle; callers must keep it and cancel on
 * shutdown (tests cancel it to leave zero live timers). A throwing `fn` never
 * kills the loop — the wiring logs its own errors.
 */
export function scheduleMonthlyDigest(
  fn: () => void,
  options: { hour: number },
  timers: TimerScheduler = nodeTimers,
): CancelSchedule {
  let cancelled = false;
  let handle: unknown;

  const tick = (): void => {
    if (cancelled) return;
    try {
      fn();
    } catch {
      // keep the loop alive; error reporting belongs to the callback
    }
    // Re-arm from "now", not from the nominal target: drift- and DST-proof.
    handle = timers.setTimeout(tick, msUntilNextMonthlyRun(timers.now(), options.hour));
  };

  handle = timers.setTimeout(tick, msUntilNextMonthlyRun(timers.now(), options.hour));

  return () => {
    cancelled = true;
    timers.clearTimeout(handle);
  };
}
