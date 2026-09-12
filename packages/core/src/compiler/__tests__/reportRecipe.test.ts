import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileReportPage } from "../report.js";
import { DocumentSchema } from "../../schemas/document.js";
import type { HostCapabilities, ReportPageMeta } from "../types.js";

function sampleMeta(overrides: Partial<ReportPageMeta> = {}): ReportPageMeta {
  return {
    name: "trial-balance",
    label: { id: "Neraca Saldo", en: "Trial Balance" },
    columns: [
      { key: "account", label: { id: "Akun", en: "Account" } },
      { key: "debit", label: { id: "Debit", en: "Debit" }, align: "right" },
      { key: "credit", label: { id: "Kredit", en: "Credit" }, align: "right" },
    ],
    dataSource: { $query: { collection: "trial_balance", sort: [{ field: "account", dir: "asc" as const }] } },
    filters: [
      { field: "period", label: { id: "Periode", en: "Period" }, widget: "Select", options: [{ value: "2024-01", label: "Jan 2024" }] },
      { field: "account", label: { id: "Akun", en: "Account" }, widget: "TextField" },
    ],
    summaries: [
      { label: { id: "Total Debit", en: "Total Debit" }, value: 1500000 },
      { label: { id: "Total Kredit", en: "Total Credit" }, value: 1500000 },
    ],
    ...overrides,
  };
}

function caps(): HostCapabilities { return { collections: ["trial_balance", "general_ledger"], commands: [] }; }

function collectNodes(node: unknown, predicate: (n: { id?: string; type: string; props?: Record<string, unknown> }) => boolean, out: unknown[] = []) {
  const n = node as { id?: string; type: string; props?: Record<string, unknown>; children?: unknown[]; slots?: Record<string, unknown[]> };
  if (predicate(n)) out.push(n);
  if (n.children) n.children.forEach((c) => collectNodes(c, predicate, out));
  if (n.slots) Object.values(n.slots).forEach((arr) => arr.forEach((c) => collectNodes(c, predicate, out)));
  return out;
}

describe("Report recipe — metrics/filter/summary/chart states", () => {
  it("is host-and-company-free", () => {
    const p = resolve(import.meta.dirname ?? ".", "../report.ts");
    const content = readFileSync(p, "utf-8");
    const imports = content.split("\n").filter((l) => l.trim().startsWith("import ")).join("\n");
    for (const needle of ["@host-app", "templates", "ShoeCompany"]) expect(imports).not.toContain(needle);
    const specs = Array.from(imports.matchAll(/from\s+["']([^"']+)["']/g)).map((m) => m[1]);
    for (const s of specs) expect(s).toMatch(/^(\.\.\/types|\.\.\/utils\/i18n|\.\/types(\.js)?)$/);
  });

  it("produces schema-valid document", () => {
    const doc = compileReportPage(sampleMeta(), { hostCapabilities: caps() });
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("filter strip renders Select + TextField per meta.filters with correct binding", () => {
    const doc = compileReportPage(sampleMeta(), { hostCapabilities: caps() });
    expect(doc.state).toMatchObject({ filter_period: "", filter_account: "" });
    const period = collectNodes(doc.root, (n) => n.id === "filter-period")[0] as { type: string; props: Record<string, unknown> };
    expect(period.type).toBe("Select");
    expect(period.props.value).toEqual({ $bind: "state.filter_period" });
    const account = collectNodes(doc.root, (n) => n.id === "filter-account")[0] as { type: string };
    expect(account.type).toBe("TextField");
  });

  it("summary strip renders metric cards per summaries", () => {
    const doc = compileReportPage(sampleMeta(), { hostCapabilities: caps() });
    const strip = collectNodes(doc.root, (n) => n.id === "report-summary-strip")[0];
    expect(strip).toBeDefined();
    const values = collectNodes(doc.root, (n) => (n.id?.startsWith("summary-") ?? false) && (n.id?.endsWith("-value") ?? false));
    expect(values).toHaveLength(2);
  });

  it("dataTable columns and dataSource respect meta + filter-bound $query", () => {
    const doc = compileReportPage(sampleMeta(), { hostCapabilities: caps() });
    const table = collectNodes(doc.root, (n) => n.id === "report-table")[0] as { props: Record<string, unknown> };
    const cols = table.props.columns as Array<{ key: string }>;
    expect(cols.map((c) => c.key)).toEqual(["account", "debit", "credit"]);
    const ds = doc.dataSources?.rows as { $query: { collection: string; filters: unknown[] } };
    expect(ds.$query.collection).toBe("trial_balance");
    expect(ds.$query.filters).toHaveLength(2);
  });

  it("fail-closed when $query collection not allowlisted", () => {
    expect(() => compileReportPage(sampleMeta(), { hostCapabilities: { collections: ["other"], commands: [] } })).toThrow(/hostCapabilities rejected/);
  });

  it("supports static array dataSource (no $query)", () => {
    const doc = compileReportPage(sampleMeta({ dataSource: [{ account: "101", debit: 100, credit: 0 }] }), { hostCapabilities: caps() });
    expect(doc.dataSources?.rows).toEqual([{ account: "101", debit: 100, credit: 0 }]);
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("lang policy affects filter placeholder and title", () => {
    const enDoc = compileReportPage(sampleMeta(), { hostCapabilities: caps(), uiPolicy: { lang: "en" } });
    expect(enDoc.name).toBe("Trial Balance");
    const idDoc = compileReportPage(sampleMeta(), { hostCapabilities: caps(), uiPolicy: { lang: "id" } });
    expect(idDoc.name).toBe("Neraca Saldo");
  });
});
