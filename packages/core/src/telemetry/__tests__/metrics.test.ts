import { describe, expect, it, beforeEach } from "vitest";
import { MetricsCollector } from "../metrics.js";

describe("MetricsCollector", () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    MetricsCollector.resetInstance();
    collector = new MetricsCollector(10);
  });

  it("records compilation metrics and calculates percentiles correctly", () => {
    collector.recordCompilation({
      id: "doc-1",
      recipe: "list",
      durationMs: 10,
      nodeCount: 20,
      depth: 3,
      success: true,
    });

    collector.recordCompilation({
      id: "doc-2",
      recipe: "form",
      durationMs: 30,
      nodeCount: 40,
      depth: 5,
      success: true,
    });

    collector.recordCompilation({
      id: "doc-3",
      recipe: "dashboard",
      durationMs: 20,
      nodeCount: 30,
      depth: 4,
      success: false,
      errorCode: "CAPABILITY_ERROR",
    });

    const summary = collector.getSummary();
    expect(summary.compilationCount).toBe(3);
    expect(summary.compilationSuccessRate).toBeCloseTo(2 / 3);
    expect(summary.compilationDurationP50).toBe(20);
    expect(summary.avgNodeCount).toBe(30);
    expect(summary.avgDepth).toBe(4);
  });

  it("records in-flight query deduplication events and hit ratios", () => {
    collector.recordDedup({
      key: "query:orders",
      hit: false,
      durationMs: 50,
    });

    collector.recordDedup({
      key: "query:orders",
      hit: true,
      durationMs: 45,
    });

    collector.recordDedup({
      key: "query:orders",
      hit: true,
      durationMs: 40,
    });

    const summary = collector.getSummary();
    expect(summary.dedupTotalRequests).toBe(3);
    expect(summary.dedupHitRatio).toBeCloseTo(2 / 3);
  });

  it("caps maximum history length", () => {
    const smallCollector = new MetricsCollector(3);
    for (let i = 1; i <= 5; i++) {
      smallCollector.recordCompilation({
        id: `doc-${i}`,
        recipe: "list",
        durationMs: i * 10,
        nodeCount: 10,
        depth: 2,
        success: true,
      });
    }

    const events = smallCollector.getCompilations();
    expect(events.length).toBe(3);
    expect(events[0].id).toBe("doc-3");
    expect(events[2].id).toBe("doc-5");
  });

  it("clears recorded metrics", () => {
    collector.recordCompilation({
      id: "doc-1",
      recipe: "list",
      durationMs: 10,
      nodeCount: 10,
      depth: 2,
      success: true,
    });

    expect(collector.getCompilations().length).toBe(1);
    collector.clear();
    expect(collector.getCompilations().length).toBe(0);
    expect(collector.getSummary().compilationCount).toBe(0);
  });
});
