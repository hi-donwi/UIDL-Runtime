import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PAGE_RECIPES,
  isPageRecipe,
  semanticListNodeIds,
  semanticNodeId,
  validateHostCapabilities,
  type CompilePageInput,
} from "../types.js";

describe("Public recipe/compiler contracts — not dependent on demo, company, or host-specific code", () => {
  it("exposes all seven PageRecipe values without company/demo names", () => {
    expect(PAGE_RECIPES).toEqual(["list", "form", "report", "dashboard", "settings", "tree", "wizard"]);
    for (const recipe of PAGE_RECIPES) {
      expect(isPageRecipe(recipe)).toBe(true);
    }
    expect(isPageRecipe("meridian-sales-invoices")).toBe(false);
    expect(isPageRecipe("shoe-company")).toBe(false);
    expect(isPageRecipe("module.records")).toBe(false);
  });

  it("file has zero forbidden imports (demo, company, or host-specific code)", () => {
    const file = resolve(import.meta.dirname ?? ".", "../types.ts");
    const candidates = [
      file,
      resolve(process.cwd(), "packages/core/src/compiler/types.ts"),
    ];
    let content = "";
    for (const candidate of candidates) {
      try {
        content = readFileSync(candidate, "utf-8");
        if (content.includes("PageRecipe")) break;
      } catch {
        // try next
      }
    }
    expect(content).toContain("PageRecipe");

    // Check only import statements — comments may mention the names as documentation
    const importLines = content
      .split("\n")
      .filter((line) => line.trim().startsWith("import "));
    const importsText = importLines.join("\n");
    const forbiddenImports = [
      "@host-app",
      "templates",
      "demoShortcuts",
      "ErpModuleSpec",
      "ErpDocType",
      "ShoeCompany",
      "shoe-company",
      "meridian",
      "koperasi",
    ];
    for (const needle of forbiddenImports) {
      expect(importsText, `types.ts must not import "${needle}"`).not.toContain(needle);
    }
    // Ensure collection string "module.records" does not appear as hardcoded collection name in code
    const codeWithoutComments = content
      .split("\n")
      .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("/**") && !line.trim().startsWith("//"))
      .join("\n");
    // Allow it only inside documentation comment; code (non-comment) must not hardcode a host's module.records
    const hardcodedModuleRecords = /collection:\s*["']module\.records["']/;
    expect(codeWithoutComments).not.toMatch(hardcodedModuleRecords);

    // Only allowed local imports — check from specifiers, handles multi-line imports
    const fromSpecifiers = Array.from(importsText.matchAll(/from\s+["']([^"']+)["']/g)).map((m) => m[1]);
    for (const spec of fromSpecifiers) {
      expect(spec).toMatch(/^(\.\.\/(types|utils\/(i18n|listCell))(\.js)?|\.\/types(\.js)?)$/);
    }
  });

  it("validateHostCapabilities fails closed for unknown collection (fail-closed gate)", () => {
    const input: CompilePageInput = {
      recipe: "list",
      meta: {
        name: "invoices",
        label: { id: "Faktur", en: "Invoices" },
        titleField: "customer",
        fields: [
          { key: "customer", label: { id: "Pelanggan", en: "Customer" }, widget: "TextField" },
          { key: "amount", label: { id: "Nominal", en: "Amount" }, widget: "Currency" },
        ],
        columns: [{ field: "customer" }],
        defaultSort: { field: "customer", dir: "asc" },
      },
      hostCapabilities: { collections: ["customers"], commands: [] },
    };

    const issues = validateHostCapabilities(input);
    expect(issues.some((i) => i.code === "unknown_collection")).toBe(true);
  });

  it("validateHostCapabilities passes for allowlisted collection and respects limits", () => {
    const input: CompilePageInput = {
      recipe: "list",
      meta: {
        name: "invoices",
        label: { id: "Faktur", en: "Invoices" },
        titleField: "customer",
        fields: [
          { key: "customer", label: { id: "Pelanggan", en: "Customer" }, widget: "TextField" },
        ],
        columns: [{ field: "customer" }],
        filters: [
          { field: "customer", widget: "TextField" },
          { field: "status", widget: "Select" },
        ],
        defaultSort: { field: "customer", dir: "asc" },
        pageSize: 50,
      },
      hostCapabilities: {
        collections: ["invoices", "customers"],
        commands: [],
        limits: { maxPageSize: 20, maxFilters: 1 },
      },
    };

    const issues = validateHostCapabilities(input);
    expect(issues.some((i) => i.path === "meta.pageSize")).toBe(true);
    expect(issues.some((i) => i.path === "meta.filters")).toBe(true);
  });

  it("semanticNodeId is deterministic and stable", () => {
    expect(semanticNodeId("form", "invoices", "customer")).toBe("form-invoices-field-customer");
    expect(semanticNodeId("form", "invoices", "customer")).toBe(semanticNodeId("form", "invoices", "customer"));
    expect(semanticListNodeIds("invoices")).toEqual({
      search: "list-invoices-search",
      table: "list-invoices-table",
      page: "list-invoices-page",
    });
  });

  it("report $query collection is also gated by hostCapabilities", () => {
    const input: CompilePageInput = {
      recipe: "report",
      meta: {
        name: "trial-balance",
        label: { id: "Neraca", en: "Trial Balance" },
        columns: [{ key: "account", label: { id: "Akun", en: "Account" } }],
        dataSource: { $query: { collection: "trial_balance", filters: [] } },
      },
      hostCapabilities: { collections: ["invoices"], commands: [] },
    };
    expect(validateHostCapabilities(input).some((i) => i.code === "unknown_collection")).toBe(true);
  });
});
