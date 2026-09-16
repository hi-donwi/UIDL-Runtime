/**
 * Multi-Platform UIDL Compiler Benchmark Suite.
 *
 * Compares compilation performance across three runtime targets:
 *   1. TypeScript (in-process, via compilePage)
 *   2. Java CLI (uidl-generator JAR, via child process)
 *   3. Quarkus REST API (HTTP POST to /api/v1/compile, optional)
 *
 * Reports per-recipe percentile latencies, throughput (ops/sec), document
 * complexity metrics (node count, depth), and cross-platform comparison tables.
 *
 * Usage:
 *   npm run bench:compilers                            # TS only
 *   npm run bench:compilers -- --java                  # TS + Java CLI
 *   npm run bench:compilers -- --quarkus http://...    # TS + Quarkus REST
 *   npm run bench:compilers -- --java --quarkus http://localhost:8080  # all three
 *   npm run bench:compilers -- --iterations 500        # custom iteration count
 *   npm run bench:compilers -- --json                  # emit JSON report to stdout
 *
 * Strictly adheres to zero-emoji policy.
 */

import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compilePage } from "../packages/core/src/compiler/compilePage.js";
import type { CompilePageInput, HostCapabilities } from "../packages/core/src/compiler/types.js";
import { Tracer } from "../packages/core/src/telemetry/tracing.js";
import { MetricsCollector } from "../packages/core/src/telemetry/metrics.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArgValue(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

const INCLUDE_JAVA = args.includes("--java");
const QUARKUS_URL = getArgValue("--quarkus");
const ITERATIONS = parseInt(getArgValue("--iterations") ?? "1000", 10);
const JSON_OUTPUT = args.includes("--json");
const WARMUP_ITERATIONS = Math.min(50, Math.floor(ITERATIONS / 10));

// ---------------------------------------------------------------------------
// Host capabilities and recipe inputs (shared across all platforms)
// ---------------------------------------------------------------------------

const PLAYGROUND_CAPS: HostCapabilities = {
  collections: ["orders", "users", "items", "categories", "general", "invoices", "patients", "sales"],
  commands: ["workspace.rag.search", "order.approve"],
  mutationCollections: ["orders", "users", "items", "categories", "general", "invoices", "patients", "sales"],
  limits: {
    maxPageSize: 500,
    maxFilters: 10,
  },
};

const RECIPE_INPUTS: Record<string, CompilePageInput> = {
  list: {
    recipe: "list",
    meta: {
      name: "orders",
      label: { en: "Customer Orders", id: "Daftar Pesanan" },
      titleField: "orderNumber",
      fields: [
        { key: "orderNumber", label: { en: "Order #", id: "No. Pesanan" }, widget: "TextField" },
        { key: "customer", label: { en: "Customer", id: "Pelanggan" }, widget: "TextField" },
        { key: "total", label: { en: "Total Amount", id: "Total Bayar" }, widget: "Currency" },
      ],
      columns: [
        { field: "orderNumber" },
        { field: "customer" },
        { field: "total" },
      ],
      defaultSort: { field: "orderNumber", dir: "desc" },
    },
    hostCapabilities: PLAYGROUND_CAPS,
  },
  form: {
    recipe: "form",
    meta: {
      name: "orders",
      label: { en: "Sales Order Entry", id: "Entri Pesanan Penjualan" },
      titleField: "orderNumber",
      fields: [
        { key: "orderNumber", label: { en: "Order #", id: "No. Pesanan" }, widget: "TextField" },
        { key: "customer", label: { en: "Customer Name", id: "Nama Pelanggan" }, widget: "TextField" },
        { key: "total", label: { en: "Total (IDR)", id: "Total (Rp)" }, widget: "Currency" },
      ],
    },
    hostCapabilities: PLAYGROUND_CAPS,
    recordId: "ORD-2026-001",
  },
  report: {
    recipe: "report",
    meta: {
      name: "sales",
      label: { en: "Monthly Revenue Report", id: "Laporan Pendapatan Bulanan" },
      columns: [
        { key: "period", label: { en: "Month / Period", id: "Bulan / Periode" } },
        { key: "revenue", label: { en: "Gross Revenue", id: "Pendapatan Kotor" }, format: "currency" },
      ],
      dataSource: [
        { period: "January 2026", revenue: 145000000 },
        { period: "February 2026", revenue: 182500000 },
        { period: "March 2026", revenue: 210000000 },
      ],
    },
    hostCapabilities: PLAYGROUND_CAPS,
  },
  dashboard: {
    recipe: "dashboard",
    meta: {
      name: "executive",
      label: { en: "Executive Performance Dashboard", id: "Dashboard Kinerja Eksekutif" },
      kpis: [
        { label: { en: "Monthly Revenue", id: "Pendapatan Bulanan" }, value: "Rp 537.500.000" },
        { label: { en: "Active Customers", id: "Pelanggan Aktif" }, value: "1.420" },
        { label: { en: "Fulfillment Rate", id: "Tingkat Pemenuhan" }, value: "98.4%" },
      ],
    },
    hostCapabilities: PLAYGROUND_CAPS,
  },
  settings: {
    recipe: "settings",
    meta: {
      name: "workspace",
      label: { en: "Enterprise System Settings", id: "Pengaturan Sistem Perusahaan" },
      sections: [
        {
          id: "general",
          label: { en: "General Preferences", id: "Preferensi Umum" },
          fields: [
            { key: "companyName", label: { en: "Company Legal Name", id: "Nama Legal Perusahaan" }, widget: "TextField" },
            { key: "defaultCurrency", label: { en: "Base Currency", id: "Mata Uang Dasar" }, widget: "TextField" },
          ],
        },
      ],
    },
    hostCapabilities: PLAYGROUND_CAPS,
  },
  tree: {
    recipe: "tree",
    meta: {
      name: "categories",
      label: { en: "Product Category Hierarchy", id: "Hierarki Kategori Produk" },
      titleField: "name",
      fields: [
        { key: "name", label: { en: "Category Name", id: "Nama Kategori" }, widget: "TextField" },
      ],
      nodes: [
        {
          key: "cat-it",
          label: { en: "Information Technology", id: "Teknologi Informasi" },
          children: [
            { key: "cat-cloud", label: { en: "Cloud and Infrastructure", id: "Cloud dan Infrastruktur" } },
            { key: "cat-software", label: { en: "Enterprise Software", id: "Software Enterprise" } },
          ],
        },
        {
          key: "cat-ops",
          label: { en: "Operations and Supply", id: "Operasional dan Pasokan" },
        },
      ],
    },
    hostCapabilities: PLAYGROUND_CAPS,
  },
  wizard: {
    recipe: "wizard",
    meta: {
      name: "vendor-onboarding",
      label: { en: "Vendor Onboarding Registration", id: "Pendaftaran Vendor Baru" },
      steps: [
        {
          id: "step-company",
          label: { en: "1. Company Info", id: "1. Info Perusahaan" },
          fields: [
            { key: "vendorName", label: { en: "Vendor Name", id: "Nama Vendor" }, widget: "TextField" },
            { key: "taxId", label: { en: "Tax ID (NPWP)", id: "NPWP" }, widget: "TextField" },
          ],
        },
        {
          id: "step-contact",
          label: { en: "2. Primary Contact", id: "2. Kontak Utama" },
          fields: [
            { key: "contactPerson", label: { en: "Contact Name", id: "Nama Kontak" }, widget: "TextField" },
            { key: "contactEmail", label: { en: "Email Address", id: "Alamat Email" }, widget: "TextField" },
          ],
        },
      ],
    },
    hostCapabilities: PLAYGROUND_CAPS,
  },
};

// ---------------------------------------------------------------------------
// Statistics helpers
// ---------------------------------------------------------------------------

interface BenchmarkStats {
  recipe: string;
  platform: string;
  iterations: number;
  totalMs: number;
  opsPerSec: number;
  minMs: number;
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
}

interface DocumentComplexity {
  recipe: string;
  nodeCount: number;
  depth: number;
  bindingCount: number;
}

function calculatePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const weight = rank - lower;
  if (lower === upper) return sorted[lower] ?? 0;
  return ((sorted[lower] ?? 0) * (1 - weight)) + ((sorted[upper] ?? 0) * weight);
}

function statsFromDurations(
  recipe: string,
  platform: string,
  iterations: number,
  totalMs: number,
  durations: number[],
): BenchmarkStats {
  durations.sort((a, b) => a - b);
  const sum = durations.reduce((acc, v) => acc + v, 0);
  return {
    recipe,
    platform,
    iterations,
    totalMs,
    opsPerSec: (iterations / totalMs) * 1000,
    minMs: durations[0] ?? 0,
    meanMs: sum / iterations,
    p50Ms: calculatePercentile(durations, 50),
    p95Ms: calculatePercentile(durations, 95),
    p99Ms: calculatePercentile(durations, 99),
    maxMs: durations[durations.length - 1] ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Document complexity analysis
// ---------------------------------------------------------------------------

function countNodes(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  let count = 1;
  const n = node as Record<string, unknown>;
  if (Array.isArray(n.children)) {
    for (const child of n.children) {
      count += countNodes(child);
    }
  }
  return count;
}

function measureDepth(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  const n = node as Record<string, unknown>;
  if (!Array.isArray(n.children) || n.children.length === 0) return 1;
  let maxChildDepth = 0;
  for (const child of n.children) {
    maxChildDepth = Math.max(maxChildDepth, measureDepth(child));
  }
  return 1 + maxChildDepth;
}

function countBindings(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  let count = 0;
  const n = node as Record<string, unknown>;
  if (n.props && typeof n.props === "object") {
    for (const val of Object.values(n.props as Record<string, unknown>)) {
      if (val && typeof val === "object" && "$bind" in (val as Record<string, unknown>)) {
        count++;
      }
    }
  }
  if (Array.isArray(n.children)) {
    for (const child of n.children) {
      count += countBindings(child);
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// TypeScript benchmark runner
// ---------------------------------------------------------------------------

function benchmarkTS(recipe: string, input: CompilePageInput, iterations: number): BenchmarkStats {
  // Warm-up
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    compilePage(input);
  }

  const durations: number[] = new Array(iterations);
  const startTotal = performance.now();

  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    compilePage(input);
    const t1 = performance.now();
    durations[i] = t1 - t0;
  }

  const endTotal = performance.now();
  return statsFromDurations(recipe, "TypeScript", iterations, endTotal - startTotal, durations);
}

// ---------------------------------------------------------------------------
// Java CLI benchmark runner
// ---------------------------------------------------------------------------

function findJavaCli(): string | null {
  const jarPath = resolve(PROJECT_ROOT, "server/uidl-generator/target/uidl-generator-1.0.0-SNAPSHOT.jar");
  if (existsSync(jarPath)) return jarPath;
  return null;
}

function benchmarkJavaCli(recipe: string, input: CompilePageInput, iterations: number): BenchmarkStats | null {
  const jarPath = findJavaCli();
  if (!jarPath) {
    if (!JSON_OUTPUT) {
      console.log(`  [SKIP] Java CLI jar not found at server/uidl-generator/target/`);
    }
    return null;
  }

  const payload = JSON.stringify({
    recipe: input.recipe,
    meta: input.meta,
    hostCapabilities: input.hostCapabilities,
  });

  // Warm-up (fewer iterations for subprocess overhead)
  const javaWarmup = Math.min(5, WARMUP_ITERATIONS);
  for (let i = 0; i < javaWarmup; i++) {
    try {
      execFileSync("java", ["-jar", jarPath, "--compile", "--stdin"], { input: payload, timeout: 10000 });
    } catch {
      if (!JSON_OUTPUT) console.log(`  [SKIP] Java CLI warm-up failed for ${recipe}`);
      return null;
    }
  }

  // Reduced iteration count for CLI (subprocess overhead dominates)
  const cliIterations = Math.min(iterations, 50);
  const durations: number[] = new Array(cliIterations);
  const startTotal = performance.now();

  for (let i = 0; i < cliIterations; i++) {
    const t0 = performance.now();
    try {
      execFileSync("java", ["-jar", jarPath, "--compile", "--stdin"], { input: payload, timeout: 10000 });
    } catch {
      durations[i] = -1; // Mark failed
      continue;
    }
    const t1 = performance.now();
    durations[i] = t1 - t0;
  }

  const endTotal = performance.now();
  const validDurations = durations.filter((d) => d >= 0);
  if (validDurations.length === 0) return null;

  return statsFromDurations(recipe, "Java CLI", validDurations.length, endTotal - startTotal, validDurations);
}

// ---------------------------------------------------------------------------
// Quarkus REST benchmark runner
// ---------------------------------------------------------------------------

async function benchmarkQuarkus(
  recipe: string,
  input: CompilePageInput,
  iterations: number,
  baseUrl: string,
): Promise<BenchmarkStats | null> {
  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/v1/compile`;
  const payload = JSON.stringify({
    recipe: input.recipe,
    meta: input.meta,
    hostCapabilities: input.hostCapabilities,
  });

  // Warm-up
  const httpWarmup = Math.min(10, WARMUP_ITERATIONS);
  for (let i = 0; i < httpWarmup; i++) {
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      if (!resp.ok) {
        if (!JSON_OUTPUT) console.log(`  [SKIP] Quarkus warm-up failed for ${recipe}: HTTP ${resp.status}`);
        return null;
      }
      await resp.json();
    } catch (err) {
      if (!JSON_OUTPUT) console.log(`  [SKIP] Quarkus warm-up failed for ${recipe}: ${(err as Error).message}`);
      return null;
    }
  }

  // Reduced iteration count for HTTP (network overhead)
  const httpIterations = Math.min(iterations, 100);
  const durations: number[] = [];
  const startTotal = performance.now();

  for (let i = 0; i < httpIterations; i++) {
    const t0 = performance.now();
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      if (resp.ok) {
        await resp.json();
        durations.push(performance.now() - t0);
      }
    } catch {
      // Skip failed requests
    }
  }

  const endTotal = performance.now();
  if (durations.length === 0) return null;

  return statsFromDurations(recipe, "Quarkus REST", durations.length, endTotal - startTotal, durations);
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function printPlatformTable(results: BenchmarkStats[]): void {
  console.log(
    "Recipe".padEnd(12) +
    "Platform".padEnd(16) +
    "Iters".padStart(8) +
    "ops/s".padStart(12) +
    "Mean(ms)".padStart(11) +
    "p50(ms)".padStart(10) +
    "p95(ms)".padStart(10) +
    "p99(ms)".padStart(10) +
    "Max(ms)".padStart(10),
  );
  console.log("-".repeat(99));

  for (const r of results) {
    console.log(
      r.recipe.padEnd(12) +
      r.platform.padEnd(16) +
      r.iterations.toString().padStart(8) +
      r.opsPerSec.toFixed(1).padStart(12) +
      r.meanMs.toFixed(3).padStart(11) +
      r.p50Ms.toFixed(3).padStart(10) +
      r.p95Ms.toFixed(3).padStart(10) +
      r.p99Ms.toFixed(3).padStart(10) +
      r.maxMs.toFixed(3).padStart(10),
    );
  }
}

function printComplexityTable(complexities: DocumentComplexity[]): void {
  console.log(
    "Recipe".padEnd(12) +
    "Nodes".padStart(8) +
    "Depth".padStart(8) +
    "Bindings".padStart(10),
  );
  console.log("-".repeat(38));
  for (const c of complexities) {
    console.log(
      c.recipe.padEnd(12) +
      c.nodeCount.toString().padStart(8) +
      c.depth.toString().padStart(8) +
      c.bindingCount.toString().padStart(10),
    );
  }
}

function printComparisonTable(
  tsResults: BenchmarkStats[],
  javaResults: (BenchmarkStats | null)[],
  quarkusResults: (BenchmarkStats | null)[],
): void {
  console.log(
    "Recipe".padEnd(12) +
    "TS(ops/s)".padStart(12) +
    "Java(ops/s)".padStart(14) +
    "Qk(ops/s)".padStart(12) +
    "TS/Java".padStart(10) +
    "TS/Qk".padStart(10),
  );
  console.log("-".repeat(70));

  for (let i = 0; i < tsResults.length; i++) {
    const ts = tsResults[i];
    const java = javaResults[i];
    const qk = quarkusResults[i];

    const javaOps = java ? java.opsPerSec.toFixed(1) : "N/A";
    const qkOps = qk ? qk.opsPerSec.toFixed(1) : "N/A";
    const tsJavaRatio = java ? (ts.opsPerSec / java.opsPerSec).toFixed(1) + "x" : "N/A";
    const tsQkRatio = qk ? (ts.opsPerSec / qk.opsPerSec).toFixed(1) + "x" : "N/A";

    console.log(
      ts.recipe.padEnd(12) +
      ts.opsPerSec.toFixed(1).padStart(12) +
      javaOps.padStart(14) +
      qkOps.padStart(12) +
      tsJavaRatio.padStart(10) +
      tsQkRatio.padStart(10),
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface BenchmarkReport {
  timestamp: string;
  iterations: number;
  platforms: string[];
  typescript: BenchmarkStats[];
  javaCli: (BenchmarkStats | null)[];
  quarkusRest: (BenchmarkStats | null)[];
  complexity: DocumentComplexity[];
  telemetrySummary: ReturnType<MetricsCollector["getSummary"]>;
  traceSummary: ReturnType<Tracer["getSummary"]>;
}

async function main() {
  const platforms = ["TypeScript"];
  if (INCLUDE_JAVA) platforms.push("Java CLI");
  if (QUARKUS_URL) platforms.push("Quarkus REST");

  if (!JSON_OUTPUT) {
    console.log("================================================================================");
    console.log("UIDL Multi-Platform Compiler Benchmark Suite");
    console.log("================================================================================");
    console.log(`Platforms:  ${platforms.join(", ")}`);
    console.log(`Iterations: ${ITERATIONS} (TS), capped for CLI/HTTP`);
    console.log(`Warmup:     ${WARMUP_ITERATIONS} iterations`);
    console.log("");
  }

  const tracer = new Tracer(10000);
  const collector = new MetricsCollector(10000);
  const recipes = Object.keys(RECIPE_INPUTS);

  // -------------------------------------------------------------------------
  // TypeScript benchmarks
  // -------------------------------------------------------------------------
  if (!JSON_OUTPUT) {
    console.log("[1/4] TypeScript in-process compilation");
    console.log("-".repeat(99));
  }

  const tsResults: BenchmarkStats[] = [];
  const complexities: DocumentComplexity[] = [];

  for (const recipe of recipes) {
    const input = RECIPE_INPUTS[recipe];
    const stats = benchmarkTS(recipe, input, ITERATIONS);
    tsResults.push(stats);

    // Measure document complexity
    const doc = compilePage(input);
    const nodes = countNodes(doc.root);
    const depth = measureDepth(doc.root);
    const bindings = countBindings(doc.root);
    complexities.push({ recipe, nodeCount: nodes, depth, bindingCount: bindings });

    // Record into telemetry collectors
    collector.recordCompilation({
      recipe,
      durationMs: stats.meanMs,
      nodeCount: nodes,
      depth,
      success: true,
    });

    tracer.record("compilation", stats.meanMs, {
      recipe,
      nodeCount: nodes,
      depth,
      success: true,
    });
  }

  if (!JSON_OUTPUT) {
    printPlatformTable(tsResults);
    console.log("");
  }

  // -------------------------------------------------------------------------
  // Java CLI benchmarks
  // -------------------------------------------------------------------------
  const javaResults: (BenchmarkStats | null)[] = [];

  if (INCLUDE_JAVA) {
    if (!JSON_OUTPUT) {
      console.log("[2/4] Java CLI compilation (subprocess)");
      console.log("-".repeat(99));
    }

    for (const recipe of recipes) {
      const input = RECIPE_INPUTS[recipe];
      const stats = benchmarkJavaCli(recipe, input, ITERATIONS);
      javaResults.push(stats);
    }

    const validJava = javaResults.filter((r): r is BenchmarkStats => r !== null);
    if (validJava.length > 0 && !JSON_OUTPUT) {
      printPlatformTable(validJava);
    }
    if (!JSON_OUTPUT) console.log("");
  } else {
    for (const _ of recipes) javaResults.push(null);
  }

  // -------------------------------------------------------------------------
  // Quarkus REST benchmarks
  // -------------------------------------------------------------------------
  const quarkusResults: (BenchmarkStats | null)[] = [];

  if (QUARKUS_URL) {
    if (!JSON_OUTPUT) {
      console.log(`[3/4] Quarkus REST compilation (${QUARKUS_URL})`);
      console.log("-".repeat(99));
    }

    for (const recipe of recipes) {
      const input = RECIPE_INPUTS[recipe];
      const stats = await benchmarkQuarkus(recipe, input, ITERATIONS, QUARKUS_URL);
      quarkusResults.push(stats);
    }

    const validQuarkus = quarkusResults.filter((r): r is BenchmarkStats => r !== null);
    if (validQuarkus.length > 0 && !JSON_OUTPUT) {
      printPlatformTable(validQuarkus);
    }
    if (!JSON_OUTPUT) console.log("");
  } else {
    for (const _ of recipes) quarkusResults.push(null);
  }

  // -------------------------------------------------------------------------
  // Summary tables
  // -------------------------------------------------------------------------
  if (!JSON_OUTPUT) {
    console.log("[4/4] Summary");
    console.log("================================================================================");
    console.log("");

    // Document complexity table
    console.log("Document Complexity Analysis:");
    printComplexityTable(complexities);
    console.log("");

    // Cross-platform comparison (if multiple platforms)
    if (INCLUDE_JAVA || QUARKUS_URL) {
      console.log("Cross-Platform Throughput Comparison:");
      printComparisonTable(tsResults, javaResults, quarkusResults);
      console.log("");
    }

    // Aggregate TypeScript stats
    const totalOps = tsResults.reduce((acc, r) => acc + r.opsPerSec, 0);
    console.log(`TypeScript Average Throughput: ${(totalOps / tsResults.length).toFixed(1)} ops/sec`);

    // Telemetry summary
    const summary = collector.getSummary();
    console.log("");
    console.log("Telemetry MetricsCollector Summary:");
    console.log(`  Compilations measured: ${summary.compilationCount}`);
    console.log(`  Success rate: ${(summary.compilationSuccessRate * 100).toFixed(1)}%`);
    console.log(`  Duration p50: ${summary.compilationDurationP50.toFixed(3)} ms`);
    console.log(`  Duration p95: ${summary.compilationDurationP95.toFixed(3)} ms`);
    console.log(`  Avg node count: ${summary.avgNodeCount}`);
    console.log(`  Avg depth: ${summary.avgDepth}`);

    // Tracer summary
    const traceSummary = tracer.getSummary();
    console.log("");
    console.log("Tracer Span Summary:");
    console.log(`  Total spans: ${traceSummary.totalSpans}`);
    console.log(`  Compilation success rate: ${(traceSummary.compilationSuccessRate * 100).toFixed(1)}%`);
    if (traceSummary.slowestSpans.length > 0) {
      console.log("  Slowest spans:");
      for (const s of traceSummary.slowestSpans) {
        console.log(`    ${s.label}: ${s.durationMs.toFixed(3)} ms`);
      }
    }

    console.log("");
    console.log("================================================================================");
  }

  // -------------------------------------------------------------------------
  // JSON output
  // -------------------------------------------------------------------------
  if (JSON_OUTPUT) {
    const report: BenchmarkReport = {
      timestamp: new Date().toISOString(),
      iterations: ITERATIONS,
      platforms,
      typescript: tsResults,
      javaCli: javaResults,
      quarkusRest: quarkusResults,
      complexity: complexities,
      telemetrySummary: collector.getSummary(),
      traceSummary: tracer.getSummary(),
    };
    console.log(JSON.stringify(report, null, 2));
  }
}

main().catch((err) => {
  console.error("Benchmark suite failed:", err);
  process.exit(1);
});
