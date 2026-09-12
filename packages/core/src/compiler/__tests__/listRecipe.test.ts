import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileListPage, parseListQueryParams, serializeListQueryParams } from "../list.js";
import { DocumentSchema } from "../../schemas/document.js";
import type { HostCapabilities, ListPageMeta } from "../types.js";

function sampleMeta(): ListPageMeta {
  return {
    name: "invoices",
    label: { id: "Faktur", en: "Invoices" },
    titleField: "customer",
    fields: [
      { key: "customer", label: { id: "Pelanggan", en: "Customer" }, widget: "TextField", required: true },
      { key: "amount", label: { id: "Nominal", en: "Amount" }, widget: "Currency" },
      { key: "status", label: { id: "Status", en: "Status" }, widget: "Select", options: [{ value: "draft", label: "Draft" }, { value: "paid", label: "Paid" }] },
      { key: "due_date", label: { id: "Jatuh Tempo", en: "Due Date" }, widget: "Date" },
    ],
    columns: [
      { field: "customer", width: "200px" },
      { field: "amount", align: "right" },
      { field: "status" },
    ],
    filters: [
      { field: "status", widget: "Select" },
      { field: "customer", widget: "TextField" },
    ],
    defaultSort: { field: "customer", dir: "asc" },
    pageSize: 20,
    summaries: [{ label: { id: "Total", en: "Total" }, agg: "sum", field: "amount" }],
  };
}

function caps(overrides: Partial<HostCapabilities> = {}): HostCapabilities {
  return { collections: ["invoices", "customers"], commands: [], ...overrides };
}

function walkTypes(node: unknown, out: Set<string>) {
  const n = node as { type?: string; children?: unknown[]; slots?: Record<string, unknown[]> };
  if (n.type) out.add(n.type);
  n.children?.forEach((c) => walkTypes(c, out));
  if (n.slots) Object.values(n.slots).forEach((arr) => arr.forEach((c) => walkTypes(c, out)));
}

function collectNodes(node: unknown, predicate: (n: { type: string; id?: string; props?: Record<string, unknown>; events?: Record<string, unknown>; style?: unknown; visibility?: unknown }) => boolean, out: unknown[] = []) {
  const n = node as { type: string; id?: string; props?: Record<string, unknown>; events?: Record<string, unknown>; children?: unknown[]; slots?: Record<string, unknown[]> };
  if (predicate(n as never)) out.push(n);
  n.children?.forEach((c) => collectNodes(c, predicate, out));
  if (n.slots) Object.values(n.slots).forEach((arr) => arr.forEach((c) => collectNodes(c, predicate, out)));
  return out;
}

describe("List recipe — search/filter/sort/page/action", () => {
  it("is host-and-company-free (no forbidden imports)", () => {
    const candidates = [
      resolve(import.meta.dirname ?? ".", "../list.ts"),
      resolve(process.cwd(), "packages/core/src/compiler/list.ts"),
    ];
    let content = "";
    for (const p of candidates) {
      try {
        content = readFileSync(p, "utf-8");
        if (content.includes("compileListPage")) break;
      } catch {
        // Not this candidate; try the next one.
      }
    }
    expect(content).toContain("compileListPage");
    const importLines = content.split("\n").filter((l) => l.trim().startsWith("import "));
    const importsText = importLines.join("\n");
    for (const needle of ["@host-app", "templates", "ErpModuleSpec", "ShoeCompany", "koperasi"]) {
      expect(importsText).not.toContain(needle);
    }
    // Extract all `from "..."` specifiers from import lines (handles multi-line imports)
    const fromSpecifiers = Array.from(importsText.matchAll(/from\s+["']([^"']+)["']/g)).map((m) => m[1]);
    for (const spec of fromSpecifiers) {
      expect(spec).toMatch(
        /^(\.\.\/types(\.js)?|\.\.\/utils\/(i18n|listCell)(\.js)?|\.\/types(\.js)?)$/,
      );
    }
  });

  it("produces a schema-valid UIDLDocument", () => {
    const doc = compileListPage(sampleMeta(), { hostCapabilities: caps() });
    const parsed = DocumentSchema.safeParse(doc);
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3))).toBe(true);
  });

  it("search input is bound to state.search and resets page to 1", () => {
    const doc = compileListPage(sampleMeta(), { hostCapabilities: caps() });
    const searchNodes = collectNodes(doc.root, (n) => n.id === "list-invoices-search") as Array<{ props: Record<string, unknown>; events: Record<string, unknown> }>;
    expect(searchNodes).toHaveLength(1);
    expect(searchNodes[0].props.value).toEqual({ $bind: "state.search" });
    const onChange = searchNodes[0].events.onChange as unknown[];
    expect(onChange).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ setState: expect.objectContaining({ path: "search" }) }),
        expect.objectContaining({ setState: expect.objectContaining({ path: "page", value: 1 }) }),
      ]),
    );
  });

  it("filter bar renders Select and TextField per meta.filters and each resets page", () => {
    const doc = compileListPage(sampleMeta(), { hostCapabilities: caps() });
    const statusFilter = collectNodes(doc.root, (n) => n.id === "filter-status")[0] as { type: string; props: Record<string, unknown>; events: Record<string, unknown> };
    expect(statusFilter.type).toBe("Select");
    expect((statusFilter.props.options as unknown[]).length).toBeGreaterThan(1);
    expect((statusFilter.props.value as Record<string, unknown>)["$bind"]).toBe("state.filter_status");

    const customerFilter = collectNodes(doc.root, (n) => n.id === "filter-customer")[0] as { type: string };
    expect(customerFilter.type).toBe("TextField");

    // each filter onChange resets page
    for (const id of ["filter-status", "filter-customer"]) {
      const node = collectNodes(doc.root, (n) => n.id === id)[0] as { events: Record<string, unknown> };
      const onChange = node.events.onChange as Array<Record<string, unknown>>;
      expect(JSON.stringify(onChange)).toContain('"path":"page"');
    }
  });

  it("sort defaults and dataSource bind to state.sortField/sortDir", () => {
    const doc = compileListPage(sampleMeta(), { hostCapabilities: caps() });
    expect(doc.state).toMatchObject({ sortField: "customer", sortDir: "asc" });
    const ds = doc.dataSources?.rows as { $query: { sort: Array<{ field: unknown; dir: unknown }>; collection: string } };
    expect(ds.$query.collection).toBe("invoices");
    expect(ds.$query.sort[0].field).toEqual({ $bind: "state.sortField" });
    expect(ds.$query.sort[0].dir).toEqual({ $bind: "state.sortDir" });
  });

  it("pagination state and $query page binding plus footer controls", () => {
    const doc = compileListPage(sampleMeta(), { hostCapabilities: caps() });
    expect(doc.state).toMatchObject({ page: 1, pageSize: 20 });
    const ds = doc.dataSources?.rows as { $query: { page: { number: unknown; size: unknown } } };
    expect(ds.$query.page.number).toEqual({ $bind: "state.page" });
    expect(ds.$query.page.size).toEqual({ $bind: "state.pageSize" });

    const pagination = collectNodes(doc.root, (n) => n.id === "list-invoices-page")[0];
    expect(pagination).toBeDefined();
    const types = new Set<string>();
    walkTypes(doc.root, types);
    expect(types.has("DataTable")).toBe(true);
  });

  it("DataTable columns map from meta.columns with currency right-align and show summaries", () => {
    const doc = compileListPage(sampleMeta(), { hostCapabilities: caps() });
    const table = collectNodes(doc.root, (n) => n.id === "list-invoices-table")[0] as { props: Record<string, unknown> };
    expect(table.props.dataSource).toBe("rows");
    const cols = table.props.columns as Array<{ key: string; align?: string; label: string }>;
    expect(cols.map((c) => c.key)).toEqual(["customer", "amount", "status"]);
    expect(cols.find((c) => c.key === "amount")?.align).toBe("right");
    const summary = collectNodes(doc.root, (n) => n.id === "list-summaries")[0];
    expect(summary).toBeDefined();
  });

  it("summaries aggregate the loaded rows instead of printing SUM(field) as text", () => {
    const doc = compileListPage(sampleMeta(), { hostCapabilities: caps() });
    const agg = collectNodes(doc.root, (n) => n.id === "summary-0-agg")[0] as { props: Record<string, unknown> };

    expect(agg.props.value).toEqual({
      $expr: { agg: "sum", over: "data.rows", field: "amount" },
    });
    expect(JSON.stringify(doc)).not.toContain("SUM(amount)");
  });

  it("emits no row-action column (Meridian opens on row click) and a + New button with route", () => {
    const doc = compileListPage(sampleMeta(), { hostCapabilities: caps(), routePolicy: { listBase: "/app/acme/list" } });
    const table = collectNodes(doc.root, (n) => n.id === "list-invoices-table")[0] as {
      props: Record<string, unknown>;
      events: Record<string, unknown>;
    };
    // Meridian's List has no action column; the row is the affordance, so the open
    // intent has to survive on the node's `onOpen` even with `rowActions` empty.
    expect(table.props.rowActions).toEqual([]);
    expect(table.events.onOpen).toBeDefined();

    const newBtn = collectNodes(doc.root, (n) => n.id === "create-new-btn")[0] as { events: Record<string, unknown> };
    const nav = (newBtn.events.onClick as Array<Record<string, unknown>>)[0] as { navigate: { route: string } };
    expect(nav.navigate.route).toContain("invoices");
    expect(nav.navigate.route).toContain("/app/acme/list");
  });

  it("allows hosts to use standard UIDL command actions for row open", () => {
    const doc = compileListPage(sampleMeta(), {
      hostCapabilities: caps(),
      rowOpenActions: [
        {
          command: {
            name: "module.record.open-editor",
            payload: { id: { $bind: "event.id" }, collection: "invoices" },
          },
        },
      ],
    });

    const table = collectNodes(doc.root, (n) => n.id === "list-invoices-table")[0] as { events: Record<string, unknown> };
    expect(table.events.onOpen).toEqual([
      {
        command: {
          name: "module.record.open-editor",
          payload: { id: { $bind: "event.id" }, collection: "invoices" },
        },
      },
    ]);
  });

  it("allows hosts to use standard UIDL command actions for create new", () => {
    const doc = compileListPage(sampleMeta(), {
      hostCapabilities: caps(),
      createNewActions: [
        {
          command: {
            name: "module.record.create",
            payload: { collection: "invoices" },
          },
        },
      ],
    });

    const newBtn = collectNodes(doc.root, (n) => n.id === "create-new-btn")[0] as { events: Record<string, unknown> };
    expect(newBtn.events.onClick).toEqual([
      {
        command: {
          name: "module.record.create",
          payload: { collection: "invoices" },
        },
      },
    ]);
  });

  it("fail-closed when collection not allowlisted", () => {
    expect(() =>
      compileListPage(sampleMeta(), { hostCapabilities: { collections: ["other"], commands: [] } }),
    ).toThrow(/hostCapabilities rejected/);
  });

  it("parse/serialize query params round-trip filters/search/sort/page", () => {
    const meta = sampleMeta();
    const params = new URLSearchParams("q=acme&page=2&sort=-amount&status=paid");
    const state = parseListQueryParams(params, meta);
    expect(state).toMatchObject({ search: "acme", page: 2, sortField: "amount", sortDir: "desc", filter_status: "paid" });

    const back = serializeListQueryParams({ ...state, pageSize: 20, filter_customer: "" }, meta);
    expect(back.get("q")).toBe("acme");
    expect(back.get("page")).toBe("2");
    expect(back.get("sort")).toBe("-amount");
    expect(back.get("status")).toBe("paid");
    expect(back.has("customer")).toBe(false); // empty filter not serialized
  });

  it("semantic IDs are stable and derived from meta.name", () => {
    const doc = compileListPage(sampleMeta(), { hostCapabilities: caps() });
    expect(collectNodes(doc.root, (n) => n.id === "list-invoices-search")).toHaveLength(1);
    expect(collectNodes(doc.root, (n) => n.id === "list-invoices-table")).toHaveLength(1);
  });

  it("respects UiPolicy lang for placeholders and labels", () => {
    const enDoc = compileListPage(sampleMeta(), { hostCapabilities: caps(), uiPolicy: { lang: "en" } });
    const search = collectNodes(enDoc.root, (n) => n.id === "list-invoices-search")[0] as { props: Record<string, unknown> };
    expect((search.props.placeholder as string).toLowerCase()).toContain("search");

    const idDoc = compileListPage(sampleMeta(), { hostCapabilities: caps(), uiPolicy: { lang: "id" } });
    const searchId = collectNodes(idDoc.root, (n) => n.id === "list-invoices-search")[0] as { props: Record<string, unknown> };
    expect((searchId.props.placeholder as string).toLowerCase()).toContain("cari");
  });

  it("puts filters behind a header Filter button, the way ListView does", () => {
    const doc = compileListPage(sampleMeta(), { hostCapabilities: caps() });

    // The filter controls used to sit in a strip above the rows, which is not where Meridian
    // keeps them and which pushed the first row a strip's height down every list.
    const header = collectNodes(doc.root, (n) => n.id === "list-header")[0] as { children: unknown[] };
    const toggle = collectNodes(doc.root, (n) => n.id === "filter-toggle-btn")[0];
    const popover = collectNodes(doc.root, (n) => n.id === "filter-popover")[0] as {
      type: string;
      props: Record<string, unknown>;
    };
    const bar = collectNodes(doc.root, (n) => n.id === "filter-bar")[0];

    expect(toggle).toBeDefined();
    expect(popover.type).toBe("Popover");
    expect(popover.props.open).toEqual({ $bind: "state.filterOpen" });
    expect(bar).toBeDefined();
    // The strip must live inside the popover, not as a sibling of the table.
    expect(collectNodes(header as never, (n) => n.id === "filter-bar").length).toBe(1);
    expect(doc.state).toMatchObject({ filterOpen: false });
  });
});
