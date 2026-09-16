import { describe, expect, it, beforeEach } from "vitest";
import { Tracer, getTracer, resetTracer } from "../tracing.js";
import type { CompilationSpan, ExpressionSpan, SpanKind } from "../tracing.js";

describe("Tracer", () => {
  let tracer: Tracer;

  beforeEach(() => {
    tracer = new Tracer(100);
  });

  describe("span recording", () => {
    it("records a compilation span via startSpan/finish", () => {
      const { spanId, finish } = tracer.startSpan("compilation");
      expect(spanId).toBe(1);

      const span = finish({
        recipe: "list",
        nodeCount: 42,
        depth: 5,
        success: true,
      });

      expect(span).not.toBeNull();
      expect(span!.kind).toBe("compilation");
      expect(span!.durationMs).toBeGreaterThanOrEqual(0);
      expect((span as CompilationSpan).recipe).toBe("list");
      expect((span as CompilationSpan).nodeCount).toBe(42);
    });

    it("records a span via record() shorthand", () => {
      const span = tracer.record("expression", 1.5, {
        exprType: "eq",
        depth: 2,
        resultType: "boolean",
      });

      expect(span).not.toBeNull();
      expect(span!.kind).toBe("expression");
      expect(span!.durationMs).toBe(1.5);
      expect((span as ExpressionSpan).exprType).toBe("eq");
    });

    it("assigns monotonically increasing span IDs", () => {
      tracer.record("compilation", 1, { recipe: "form", nodeCount: 10, depth: 3, success: true });
      tracer.record("expression", 0.5, { exprType: "add", depth: 1, resultType: "number" });
      tracer.record("render", 2, { componentType: "Card", childCount: 4, bindingCount: 2 });

      const spans = tracer.getSpans();
      expect(spans[0].id).toBe(1);
      expect(spans[1].id).toBe(2);
      expect(spans[2].id).toBe(3);
    });

    it("supports parent span linking", () => {
      const { spanId: parentId, finish: finishParent } = tracer.startSpan("compilation");
      tracer.record("expression", 0.3, { exprType: "path", depth: 1, resultType: "string" }, parentId);
      finishParent({ recipe: "list", nodeCount: 20, depth: 4, success: true });

      const spans = tracer.getSpans();
      expect(spans[0].parentId).toBe(parentId);
      expect(spans[1].parentId).toBeUndefined();
    });
  });

  describe("enable/disable", () => {
    it("does not record spans when disabled", () => {
      tracer.disable();
      const span = tracer.record("compilation", 1, { recipe: "form", nodeCount: 5, depth: 2, success: true });
      expect(span).toBeNull();
      expect(tracer.getSpans().length).toBe(0);
    });

    it("startSpan finish returns null when disabled", () => {
      tracer.disable();
      const { finish } = tracer.startSpan("expression");
      const span = finish({ exprType: "eq", depth: 1, resultType: "boolean" });
      expect(span).toBeNull();
    });

    it("resumes recording after re-enable", () => {
      tracer.disable();
      tracer.record("compilation", 1, { recipe: "form", nodeCount: 5, depth: 2, success: true });
      expect(tracer.getSpans().length).toBe(0);

      tracer.enable();
      tracer.record("compilation", 1, { recipe: "form", nodeCount: 5, depth: 2, success: true });
      expect(tracer.getSpans().length).toBe(1);
    });
  });

  describe("capacity limit", () => {
    it("evicts oldest spans when exceeding maxSpans", () => {
      const smallTracer = new Tracer(3);
      for (let i = 0; i < 5; i++) {
        smallTracer.record("compilation", i, {
          recipe: `recipe-${i}`,
          nodeCount: 10,
          depth: 2,
          success: true,
        });
      }

      const spans = smallTracer.getSpans();
      expect(spans.length).toBe(3);
      expect((spans[0] as CompilationSpan).recipe).toBe("recipe-2");
      expect((spans[2] as CompilationSpan).recipe).toBe("recipe-4");
    });
  });

  describe("getSpansByKind", () => {
    it("filters spans by kind", () => {
      tracer.record("compilation", 1, { recipe: "list", nodeCount: 10, depth: 2, success: true });
      tracer.record("expression", 0.5, { exprType: "add", depth: 1, resultType: "number" });
      tracer.record("compilation", 2, { recipe: "form", nodeCount: 20, depth: 3, success: true });
      tracer.record("render", 1.5, { componentType: "Button", childCount: 0, bindingCount: 1 });

      const compilations = tracer.getSpansByKind("compilation");
      expect(compilations.length).toBe(2);
      expect(compilations[0].recipe).toBe("list");
      expect(compilations[1].recipe).toBe("form");

      const expressions = tracer.getSpansByKind("expression");
      expect(expressions.length).toBe(1);
      expect(expressions[0].exprType).toBe("add");
    });
  });

  describe("clear", () => {
    it("removes all spans", () => {
      tracer.record("compilation", 1, { recipe: "list", nodeCount: 10, depth: 2, success: true });
      tracer.record("expression", 0.5, { exprType: "eq", depth: 1, resultType: "boolean" });
      expect(tracer.getSpans().length).toBe(2);

      tracer.clear();
      expect(tracer.getSpans().length).toBe(0);
    });
  });

  describe("getSummary", () => {
    it("returns correct aggregate statistics", () => {
      // 3 compilations: 1ms, 2ms, 10ms — 2 success, 1 fail
      tracer.record("compilation", 1, { recipe: "list", nodeCount: 10, depth: 2, success: true });
      tracer.record("compilation", 2, { recipe: "form", nodeCount: 20, depth: 3, success: true });
      tracer.record("compilation", 10, { recipe: "dashboard", nodeCount: 30, depth: 4, success: false, errorCode: "CAPABILITY_ERROR" });

      // 2 expressions
      tracer.record("expression", 0.1, { exprType: "path", depth: 1, resultType: "string" });
      tracer.record("expression", 0.3, { exprType: "eq", depth: 2, resultType: "boolean" });

      const summary = tracer.getSummary();

      expect(summary.totalSpans).toBe(5);
      expect(summary.compilationSuccessRate).toBeCloseTo(2 / 3);

      const compStats = summary.spansByKind.compilation;
      expect(compStats.count).toBe(3);
      expect(compStats.minMs).toBe(1);
      expect(compStats.maxMs).toBe(10);
      expect(compStats.meanMs).toBeCloseTo((1 + 2 + 10) / 3);

      const exprStats = summary.spansByKind.expression;
      expect(exprStats.count).toBe(2);
      expect(exprStats.minMs).toBeCloseTo(0.1);
      expect(exprStats.maxMs).toBeCloseTo(0.3);

      // Slowest spans should be sorted descending by duration
      expect(summary.slowestSpans.length).toBe(5);
      expect(summary.slowestSpans[0].durationMs).toBe(10);
    });

    it("returns default stats for empty tracer", () => {
      const summary = tracer.getSummary();
      expect(summary.totalSpans).toBe(0);
      expect(summary.compilationSuccessRate).toBe(1.0);

      const kinds: SpanKind[] = ["compilation", "expression", "render", "binding", "action", "validation"];
      for (const kind of kinds) {
        expect(summary.spansByKind[kind].count).toBe(0);
      }
    });
  });
});

describe("Global tracer", () => {
  beforeEach(() => {
    resetTracer();
  });

  it("getTracer returns a singleton", () => {
    const t1 = getTracer();
    const t2 = getTracer();
    expect(t1).toBe(t2);
  });

  it("resetTracer creates a new instance on next access", () => {
    const t1 = getTracer();
    t1.record("compilation", 1, { recipe: "list", nodeCount: 10, depth: 2, success: true });
    expect(t1.getSpans().length).toBe(1);

    resetTracer();
    const t2 = getTracer();
    expect(t2).not.toBe(t1);
    expect(t2.getSpans().length).toBe(0);
  });
});
