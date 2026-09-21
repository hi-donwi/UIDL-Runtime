import { describe, expect, it } from "vitest";
import { timeSync, timeAsync, Stopwatch, performanceNow } from "../timer.js";

describe("performanceNow", () => {
  it("returns a finite number", () => {
    const t = performanceNow();
    expect(Number.isFinite(t)).toBe(true);
    expect(t).toBeGreaterThanOrEqual(0);
  });

  it("is monotonically non-decreasing", () => {
    const t0 = performanceNow();
    const t1 = performanceNow();
    expect(t1).toBeGreaterThanOrEqual(t0);
  });
});

describe("timeSync", () => {
  it("returns both the value and a non-negative duration", () => {
    const result = timeSync(() => 42);
    expect(result.value).toBe(42);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("captures elapsed time for a blocking operation", () => {
    const result = timeSync(() => {
      // Busy-wait for ~2ms
      const deadline = performanceNow() + 2;
      while (performanceNow() < deadline) {
        /* spin */
      }
      return "done";
    });
    expect(result.value).toBe("done");
    expect(result.durationMs).toBeGreaterThanOrEqual(1);
  });
});

describe("timeAsync", () => {
  it("returns both the resolved value and a non-negative duration", async () => {
    const result = await timeAsync(async () => "async-result");
    expect(result.value).toBe("async-result");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("captures elapsed time including await", async () => {
    const result = await timeAsync(
      () => new Promise<string>((resolve) => setTimeout(() => resolve("delayed"), 10)),
    );
    expect(result.value).toBe("delayed");
    expect(result.durationMs).toBeGreaterThanOrEqual(5);
  });
});

describe("Stopwatch", () => {
  it("starts at zero", () => {
    const sw = new Stopwatch();
    expect(sw.elapsed()).toBe(0);
  });

  it("accumulates time across start/stop cycles", () => {
    const sw = new Stopwatch();

    sw.start();
    const deadline1 = performanceNow() + 2;
    while (performanceNow() < deadline1) {
      /* spin */
    }
    sw.stop();
    const first = sw.elapsed();
    expect(first).toBeGreaterThanOrEqual(1);

    sw.start();
    const deadline2 = performanceNow() + 2;
    while (performanceNow() < deadline2) {
      /* spin */
    }
    const total = sw.stop();
    expect(total).toBeGreaterThanOrEqual(first);
  });

  it("does not double-count when start is called twice", () => {
    const sw = new Stopwatch();
    sw.start();
    sw.start(); // should be a no-op
    const deadline = performanceNow() + 2;
    while (performanceNow() < deadline) {
      /* spin */
    }
    const elapsed = sw.stop();
    expect(elapsed).toBeGreaterThanOrEqual(1);
    expect(elapsed).toBeLessThan(100); // sanity: not double counted
  });

  it("reset clears accumulated time", () => {
    const sw = new Stopwatch();
    sw.start();
    const deadline = performanceNow() + 2;
    while (performanceNow() < deadline) {
      /* spin */
    }
    sw.stop();
    expect(sw.elapsed()).toBeGreaterThan(0);

    sw.reset();
    expect(sw.elapsed()).toBe(0);
  });

  it("stop without start returns zero", () => {
    const sw = new Stopwatch();
    expect(sw.stop()).toBe(0);
  });
});
