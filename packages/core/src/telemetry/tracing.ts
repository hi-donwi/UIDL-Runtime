/**
 * Structured event tracing for UIDL runtime operations.
 *
 * Provides a lightweight span-based tracing model that records:
 * - Compilation spans (recipe type, node count, depth, success/failure)
 * - Expression evaluation spans (expression type, depth, result type)
 * - Render spans (component type, child count, binding count)
 * - Binding resolution spans (scope prefix, path, cache hit/miss)
 *
 * Each span carries a `kind` discriminator, timestamps, and duration so
 * downstream consumers (dashboards, CI regression checks) can aggregate
 * without parsing free-form strings.
 */

import { performanceNow } from "./timer.js";

// ---------------------------------------------------------------------------
// Span types
// ---------------------------------------------------------------------------

export type SpanKind = "compilation" | "expression" | "render" | "binding" | "action" | "validation";

/** Fields common to every span. */
export interface BaseSpan {
  /** Monotonically increasing span ID within a `Tracer` instance. */
  id: number;
  kind: SpanKind;
  /** High-resolution start time (ms, from `performance.now`). */
  startMs: number;
  /** Duration in ms (sub-ms precision where available). */
  durationMs: number;
  /** Optional parent span ID for nested tracing. */
  parentId?: number;
}

export interface CompilationSpan extends BaseSpan {
  kind: "compilation";
  recipe: string;
  nodeCount: number;
  depth: number;
  success: boolean;
  errorCode?: string;
}

export interface ExpressionSpan extends BaseSpan {
  kind: "expression";
  exprType: string;
  depth: number;
  resultType: string;
}

export interface RenderSpan extends BaseSpan {
  kind: "render";
  componentType: string;
  childCount: number;
  bindingCount: number;
}

export interface BindingSpan extends BaseSpan {
  kind: "binding";
  scopePrefix: string;
  path: string;
  resolved: boolean;
}

export interface ActionSpan extends BaseSpan {
  kind: "action";
  actionType: string;
  success: boolean;
  errorCode?: string;
}

export interface ValidationSpan extends BaseSpan {
  kind: "validation";
  documentId: string;
  issueCount: number;
  success: boolean;
}

export type Span =
  | CompilationSpan
  | ExpressionSpan
  | RenderSpan
  | BindingSpan
  | ActionSpan
  | ValidationSpan;

// ---------------------------------------------------------------------------
// Aggregated statistics
// ---------------------------------------------------------------------------

export interface SpanStats {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

function calculatePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower] ?? 0;
  const weight = rank - lower;
  return (sorted[lower] ?? 0) * (1 - weight) + (sorted[upper] ?? 0) * weight;
}

function computeStats(durations: number[]): SpanStats {
  if (durations.length === 0) {
    return { count: 0, totalMs: 0, minMs: 0, maxMs: 0, meanMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0 };
  }
  const sorted = [...durations].sort((a, b) => a - b);
  const totalMs = sorted.reduce((acc, v) => acc + v, 0);
  return {
    count: sorted.length,
    totalMs,
    minMs: sorted[0] ?? 0,
    maxMs: sorted[sorted.length - 1] ?? 0,
    meanMs: totalMs / sorted.length,
    p50Ms: calculatePercentile(sorted, 50),
    p95Ms: calculatePercentile(sorted, 95),
    p99Ms: calculatePercentile(sorted, 99),
  };
}

// ---------------------------------------------------------------------------
// Trace summary
// ---------------------------------------------------------------------------

export interface TraceSummary {
  totalSpans: number;
  spansByKind: Record<SpanKind, SpanStats>;
  /** Compilation-specific: success rate across all compilation spans. */
  compilationSuccessRate: number;
  /** Top 5 slowest spans regardless of kind. */
  slowestSpans: ReadonlyArray<{ id: number; kind: SpanKind; durationMs: number; label: string }>;
}

// ---------------------------------------------------------------------------
// Tracer
// ---------------------------------------------------------------------------

export class Tracer {
  private readonly maxSpans: number;
  private readonly spans: Span[] = [];
  private seq = 0;
  private enabled = true;

  constructor(maxSpans = 5000) {
    this.maxSpans = maxSpans;
  }

  /** Disable tracing (zero overhead — spans are not created). */
  disable(): void {
    this.enabled = false;
  }

  /** Re-enable tracing. */
  enable(): void {
    this.enabled = true;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Start a span. Returns a `finishFn` that must be called when the operation
   * completes; the finisher accepts a partial payload to fill in the result
   * fields (nodeCount, success, etc.).
   */
  startSpan<K extends SpanKind>(
    kind: K,
    parentId?: number,
  ): { spanId: number; finish: (payload: Omit<Extract<Span, { kind: K }>, keyof BaseSpan>) => Span | null } {
    const spanId = ++this.seq;
    const startMs = performanceNow();

    return {
      spanId,
      finish: (payload) => {
        if (!this.enabled) return null;
        const durationMs = performanceNow() - startMs;
        const span = {
          id: spanId,
          kind,
          startMs,
          durationMs,
          parentId,
          ...payload,
        } as unknown as Span;

        this.spans.push(span);
        if (this.spans.length > this.maxSpans) {
          this.spans.shift();
        }
        return span;
      },
    };
  }

  /** Record a completed span in one call (when start/stop wrapping is inconvenient). */
  record<K extends SpanKind>(
    kind: K,
    durationMs: number,
    payload: Omit<Extract<Span, { kind: K }>, keyof BaseSpan>,
    parentId?: number,
  ): Span | null {
    if (!this.enabled) return null;
    const span = {
      id: ++this.seq,
      kind,
      startMs: performanceNow() - durationMs,
      durationMs,
      parentId,
      ...payload,
    } as unknown as Span;

    this.spans.push(span);
    if (this.spans.length > this.maxSpans) {
      this.spans.shift();
    }
    return span;
  }

  getSpans(): readonly Span[] {
    return this.spans;
  }

  getSpansByKind<K extends SpanKind>(kind: K): ReadonlyArray<Extract<Span, { kind: K }>> {
    return this.spans.filter((s): s is Extract<Span, { kind: K }> => s.kind === kind);
  }

  clear(): void {
    this.spans.length = 0;
  }

  /** Build an aggregated summary of all recorded spans. */
  getSummary(): TraceSummary {
    const kinds: SpanKind[] = ["compilation", "expression", "render", "binding", "action", "validation"];
    const spansByKind = {} as Record<SpanKind, SpanStats>;

    for (const kind of kinds) {
      const durations = this.spans.filter((s) => s.kind === kind).map((s) => s.durationMs);
      spansByKind[kind] = computeStats(durations);
    }

    const compilations = this.spans.filter((s): s is CompilationSpan => s.kind === "compilation");
    const compilationSuccessRate =
      compilations.length > 0
        ? compilations.filter((c) => c.success).length / compilations.length
        : 1.0;

    const sorted = [...this.spans].sort((a, b) => b.durationMs - a.durationMs);
    const slowestSpans = sorted.slice(0, 5).map((s) => ({
      id: s.id,
      kind: s.kind,
      durationMs: s.durationMs,
      label: spanLabel(s),
    }));

    return {
      totalSpans: this.spans.length,
      spansByKind,
      compilationSuccessRate,
      slowestSpans,
    };
  }
}

function spanLabel(span: Span): string {
  switch (span.kind) {
    case "compilation":
      return `compile:${span.recipe}`;
    case "expression":
      return `expr:${span.exprType}`;
    case "render":
      return `render:${span.componentType}`;
    case "binding":
      return `bind:${span.scopePrefix}.${span.path}`;
    case "action":
      return `action:${span.actionType}`;
    case "validation":
      return `validate:${span.documentId}`;
  }
}

// ---------------------------------------------------------------------------
// Global tracer instance
// ---------------------------------------------------------------------------

let globalTracer: Tracer | null = null;

export function getTracer(): Tracer {
  if (!globalTracer) {
    globalTracer = new Tracer();
  }
  return globalTracer;
}

export function resetTracer(): void {
  globalTracer = null;
}
