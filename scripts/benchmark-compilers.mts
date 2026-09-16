/**
 * UIDL Compiler Performance & Throughput Benchmark.
 *
 * Measures compilePage execution latency and throughput across all 7 canonical recipes:
 * - list
 * - form
 * - report
 * - dashboard
 * - settings
 * - tree
 * - wizard
 *
 * Strictly adheres to zero-emoji policy.
 */

import { performance } from "node:perf_hooks";
import { compilePage } from "../packages/core/src/compiler/compilePage.js";
import type { CompilePageInput, HostCapabilities } from "../packages/core/src/compiler/types.js";
import { MetricsCollector } from "../packages/core/src/telemetry/metrics.js";

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
      name: "executive-summary",
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

interface BenchmarkStats {
  recipe: string;
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

function calculatePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const weight = rank - lower;
  if (lower === upper) return sorted[lower] ?? 0;
  return ((sorted[lower] ?? 0) * (1 - weight)) + ((sorted[upper] ?? 0) * weight);
}

function runRecipeBenchmark(recipe: string, input: CompilePageInput, iterations = 1000): BenchmarkStats {
  // Warm-up phase (50 runs)
  for (let i = 0; i < 50; i++) {
    compilePage(input);
  }

  // Timed execution phase
  const durations: number[] = new Array(iterations);
  const startTotal = performance.now();

  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    compilePage(input);
    const t1 = performance.now();
    durations[i] = t1 - t0;
  }

  const endTotal = performance.now();
  const totalMs = endTotal - startTotal;

  durations.sort((a, b) => a - b);

  const sum = durations.reduce((acc, v) => acc + v, 0);
  const meanMs = sum / iterations;
  const minMs = durations[0] ?? 0;
  const maxMs = durations[durations.length - 1] ?? 0;
  const p50Ms = calculatePercentile(durations, 50);
  const p95Ms = calculatePercentile(durations, 95);
  const p99Ms = calculatePercentile(durations, 99);
  const opsPerSec = (iterations / totalMs) * 1000;

  return {
    recipe,
    iterations,
    totalMs,
    opsPerSec,
    minMs,
    meanMs,
    p50Ms,
    p95Ms,
    p99Ms,
    maxMs,
  };
}

async function main() {
  console.log("================================================================================");
  console.log("UIDL Compiler Performance and Throughput Benchmark");
  console.log("================================================================================");
  console.log("");

  const telemetry = new MetricsCollector(10000);
  const results: BenchmarkStats[] = [];
  const iterationsPerRecipe = 1000;

  for (const [recipe, input] of Object.entries(RECIPE_INPUTS)) {
    const stats = runRecipeBenchmark(recipe, input, iterationsPerRecipe);
    results.push(stats);

    // Measure node count and depth of sample document
    const doc = compilePage(input);
    const countNodes = (node: any): number => {
      let count = 1;
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          count += countNodes(child);
        }
      }
      return count;
    };
    const measureDepth = (node: any): number => {
      if (!node.children || !Array.isArray(node.children) || node.children.length === 0) {
        return 1;
      }
      let maxChildDepth = 0;
      for (const child of node.children) {
        maxChildDepth = Math.max(maxChildDepth, measureDepth(child));
      }
      return 1 + maxChildDepth;
    };

    // Record into telemetry collector to verify metrics aggregation
    telemetry.recordCompilation({
      recipe,
      durationMs: stats.meanMs,
      nodeCount: countNodes(doc.root),
      depth: measureDepth(doc.root),
      success: true,
    });
  }

  // Format table output
  console.log(
    "Recipe".padEnd(12) +
    "Iterations".padStart(12) +
    "Throughput (ops/s)".padStart(20) +
    "Mean (ms)".padStart(12) +
    "p50 (ms)".padStart(12) +
    "p95 (ms)".padStart(12) +
    "p99 (ms)".padStart(12) +
    "Max (ms)".padStart(12)
  );
  console.log("-".repeat(104));

  let aggregateOps = 0;
  for (const r of results) {
    aggregateOps += r.opsPerSec;
    console.log(
      r.recipe.padEnd(12) +
      r.iterations.toString().padStart(12) +
      r.opsPerSec.toFixed(1).padStart(20) +
      r.meanMs.toFixed(3).padStart(12) +
      r.p50Ms.toFixed(3).padStart(12) +
      r.p95Ms.toFixed(3).padStart(12) +
      r.p99Ms.toFixed(3).padStart(12) +
      r.maxMs.toFixed(3).padStart(12)
    );
  }

  console.log("-".repeat(104));
  const avgThroughput = aggregateOps / results.length;
  console.log(`Average Across All Recipes: ${avgThroughput.toFixed(1)} ops/sec`);
  console.log("");

  const summary = telemetry.getSummary();
  console.log("Telemetry Summary Snapshot:");
  console.log(`- Total Measured Compilations: ${summary.compilationCount}`);
  console.log(`- Compilation Success Rate: ${(summary.compilationSuccessRate * 100).toFixed(1)}%`);
  console.log(`- Median Duration (p50): ${summary.compilationDurationP50.toFixed(3)} ms`);
  console.log(`- 95th Percentile Duration (p95): ${summary.compilationDurationP95.toFixed(3)} ms`);
  console.log(`- Average Node Count: ${summary.avgNodeCount}`);
  console.log(`- Average Depth: ${summary.avgDepth}`);
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
