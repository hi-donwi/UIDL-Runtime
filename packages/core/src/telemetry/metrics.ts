export interface CompilationMetric {
  id: string;
  recipe: string;
  durationMs: number;
  nodeCount: number;
  depth: number;
  success: boolean;
  errorCode?: string;
  timestamp: number;
}

export interface DedupMetric {
  key: string;
  hit: boolean;
  durationMs: number;
  timestamp: number;
}

export interface TelemetrySummary {
  compilationCount: number;
  compilationSuccessRate: number;
  compilationDurationP50: number;
  compilationDurationP95: number;
  avgNodeCount: number;
  avgDepth: number;
  dedupTotalRequests: number;
  dedupHitRatio: number;
}

export class MetricsCollector {
  private static instance: MetricsCollector | null = null;
  private readonly maxEvents: number;
  private readonly compilations: CompilationMetric[] = [];
  private readonly dedupEvents: DedupMetric[] = [];

  constructor(maxEvents = 1000) {
    this.maxEvents = maxEvents;
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  static resetInstance(): void {
    MetricsCollector.instance = null;
  }

  private seq = 0;

  recordCompilation(metric: Omit<CompilationMetric, "timestamp" | "id"> & { id?: string }): CompilationMetric {
    const entry: CompilationMetric = {
      ...metric,
      id: metric.id ?? `comp-${++this.seq}-${Date.now()}`,
      timestamp: Date.now(),
    };
    this.compilations.push(entry);
    if (this.compilations.length > this.maxEvents) {
      this.compilations.shift();
    }
    return entry;
  }

  recordDedup(metric: Omit<DedupMetric, "timestamp">): DedupMetric {
    const entry: DedupMetric = {
      ...metric,
      timestamp: Date.now(),
    };
    this.dedupEvents.push(entry);
    if (this.dedupEvents.length > this.maxEvents) {
      this.dedupEvents.shift();
    }
    return entry;
  }

  getCompilations(): readonly CompilationMetric[] {
    return this.compilations;
  }

  getDedupEvents(): readonly DedupMetric[] {
    return this.dedupEvents;
  }

  clear(): void {
    this.compilations.length = 0;
    this.dedupEvents.length = 0;
  }

  getSummary(): TelemetrySummary {
    const totalComp = this.compilations.length;
    if (totalComp === 0) {
      const dedupCount = this.dedupEvents.length;
      const dedupHits = this.dedupEvents.filter((d) => d.hit).length;
      return {
        compilationCount: 0,
        compilationSuccessRate: 1.0,
        compilationDurationP50: 0,
        compilationDurationP95: 0,
        avgNodeCount: 0,
        avgDepth: 0,
        dedupTotalRequests: dedupCount,
        dedupHitRatio: dedupCount > 0 ? dedupHits / dedupCount : 0,
      };
    }

    const successes = this.compilations.filter((c) => c.success);
    const sortedDurations = [...this.compilations]
      .map((c) => c.durationMs)
      .sort((a, b) => a - b);

    const p50Idx = Math.floor(sortedDurations.length * 0.5);
    const p95Idx = Math.min(
      sortedDurations.length - 1,
      Math.floor(sortedDurations.length * 0.95)
    );

    const sumNodes = this.compilations.reduce((acc, c) => acc + c.nodeCount, 0);
    const sumDepth = this.compilations.reduce((acc, c) => acc + c.depth, 0);

    const dedupCount = this.dedupEvents.length;
    const dedupHits = this.dedupEvents.filter((d) => d.hit).length;

    return {
      compilationCount: totalComp,
      compilationSuccessRate: successes.length / totalComp,
      compilationDurationP50: sortedDurations[p50Idx] ?? 0,
      compilationDurationP95: sortedDurations[p95Idx] ?? 0,
      avgNodeCount: Math.round(sumNodes / totalComp),
      avgDepth: Math.round((sumDepth / totalComp) * 10) / 10,
      dedupTotalRequests: dedupCount,
      dedupHitRatio: dedupCount > 0 ? dedupHits / dedupCount : 0,
    };
  }
}
