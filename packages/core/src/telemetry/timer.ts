/**
 * High-resolution timing utility for UIDL runtime operations.
 *
 * Uses `performance.now()` when available (browser and Node 16+), falling back
 * to `Date.now()`. All durations are reported in milliseconds with sub-ms
 * precision where the environment supports it.
 */

const now: () => number =
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? () => performance.now()
    : () => Date.now();

export interface TimerResult {
  /** Duration in milliseconds (sub-ms precision when available). */
  durationMs: number;
  /** The value returned by the timed function. */
  value: unknown;
}

/**
 * Time a synchronous function and return both the result and the duration.
 * Avoids any overhead beyond a pair of `performance.now()` calls.
 */
export function timeSync<T>(fn: () => T): { durationMs: number; value: T } {
  const t0 = now();
  const value = fn();
  const t1 = now();
  return { durationMs: t1 - t0, value };
}

/**
 * Time an asynchronous function and return both the result and the duration.
 */
export async function timeAsync<T>(fn: () => Promise<T>): Promise<{ durationMs: number; value: T }> {
  const t0 = now();
  const value = await fn();
  const t1 = now();
  return { durationMs: t1 - t0, value };
}

/**
 * A reusable stopwatch for manual start/stop timing.
 */
export class Stopwatch {
  private startTime = 0;
  private accumulated = 0;
  private running = false;

  start(): this {
    if (!this.running) {
      this.startTime = now();
      this.running = true;
    }
    return this;
  }

  stop(): number {
    if (this.running) {
      this.accumulated += now() - this.startTime;
      this.running = false;
    }
    return this.accumulated;
  }

  /** Returns elapsed time without stopping. */
  elapsed(): number {
    if (this.running) {
      return this.accumulated + (now() - this.startTime);
    }
    return this.accumulated;
  }

  reset(): this {
    this.accumulated = 0;
    this.startTime = 0;
    this.running = false;
    return this;
  }
}

export { now as performanceNow };
