/**
 * Telemetry module barrel export.
 *
 * Re-exports the three sub-modules so consumers can do:
 *   import { MetricsCollector, Tracer, timeSync } from "@uidl/core/telemetry";
 */

export { MetricsCollector } from "./metrics.js";
export type { CompilationMetric, DedupMetric, TelemetrySummary } from "./metrics.js";

export { Tracer, getTracer, resetTracer } from "./tracing.js";
export type {
  SpanKind,
  BaseSpan,
  CompilationSpan,
  ExpressionSpan,
  RenderSpan,
  BindingSpan,
  ActionSpan,
  ValidationSpan,
  Span,
  SpanStats,
  TraceSummary,
} from "./tracing.js";

export { timeSync, timeAsync, Stopwatch, performanceNow } from "./timer.js";
export type { TimerResult } from "./timer.js";
