import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UIDocumentRenderer } from "../UIDocumentRenderer";
import { createDocumentState } from "../../state/createDocumentState";
import type { UIDLDocument } from "../../types";

/**
 * Renderer regression suite for the core widget set used by host's generated
 * UIDL documents — Text, DataTable (static + datasource), Chart, form widgets,
 * $bind state binding, and navigate/setState actions. These complement the
 * broader smoke tests in universalExamples / dataWidgets / formWidgets /
 * queryDataSources by isolating each primitive's DOM behavior.
 */

describe("renderer · Text", () => {
  it("renders the value prop as paragraph text", () => {
    const doc: UIDLDocument = {
      version: "1.0.0", id: "t1", name: "T1", root: {
        id: "hello", type: "Text", props: { value: "Hello, world!" },
      },
    };
    render(<UIDocumentRenderer document={doc} />);
    expect(screen.getByText("Hello, world!")).toBeInTheDocument();
    expect(screen.getByText("Hello, world!")).toContainHTML("<p");
  });

  it("renders heading prop as a semantic heading element", () => {
    const doc: UIDLDocument = {
      version: "1.0.0", id: "t2", name: "T2", root: {
        id: "title", type: "Text", props: { value: "Section Title", heading: 2 },
      },
    };
    render(<UIDocumentRenderer document={doc} />);
    const heading = screen.getByText("Section Title");
    expect(heading.tagName).toBe("H2");
  });

  it("renders a static (non-bound) value that stays in sync with a later same-prop value", async () => {
    const doc: UIDLDocument = {
      version: "1.0.0", id: "t3", name: "T3",
      state: { title: "Initial" },
      root: {
        id: "dynamic-title", type: "Text",
        props: { value: { $bind: "state.title" } },
      },
    };
    const store = createDocumentState({ title: "Initial" }).getState();
    render(<UIDocumentRenderer document={doc} stateStore={store} />);
    expect(screen.getByText("Initial")).toBeInTheDocument();

    store.setState("title", "Updated");
    await waitFor(() => expect(screen.getByText("Updated")).toBeInTheDocument());
  });
});

describe("renderer · DataTable (static rows)", () => {
  it("renders column headers and static row values", () => {
    const doc: UIDLDocument = {
      version: "1.0.0", id: "dt1", name: "DT1", root: {
        id: "table", type: "DataTable", props: {
          title: "Customers",
          columns: [
            { key: "name", label: "Name" },
            { key: "tier", label: "Tier", align: "right" },
          ],
          rows: [
            { name: "Acme", tier: "Platinum" },
            { name: "Globex", tier: "Gold" },
          ],
          emptyMessage: "No customers",
        },
      },
    };
    render(<UIDocumentRenderer document={doc} />);
    expect(screen.getByText("Customers")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Tier")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Platinum")).toBeInTheDocument();
    expect(screen.getByText("Globex")).toBeInTheDocument();
  });

  it("shows emptyMessage when rows are empty", () => {
    const doc: UIDLDocument = {
      version: "1.0.0", id: "dt2", name: "DT2",
      root: {
        id: "empty-table", type: "DataTable", props: {
          columns: [{ key: "id", label: "#" }],
          rows: [],
          emptyMessage: "Belum ada data",
        },
      },
    };
    render(<UIDocumentRenderer document={doc} />);
    expect(screen.getByText("Belum ada data")).toBeInTheDocument();
  });
});

describe("renderer · Chart (static rows)", () => {
  it("renders a bar chart from static rows with xKey/yKey", () => {
    const doc: UIDLDocument = {
      version: "1.0.0", id: "ch1", name: "CH1", root: {
        id: "chart", type: "Chart", props: {
          title: "Monthly Revenue",
          chartType: "bar",
          rows: [
            { month: "Jan", amount: 120 },
            { month: "Feb", amount: 200 },
          ],
          xKey: "month",
          yKey: "amount",
        },
      },
    };
    render(<UIDocumentRenderer document={doc} />);
    expect(screen.getByText("Monthly Revenue")).toBeInTheDocument();
    expect(screen.getByText("Jan")).toBeInTheDocument();
    expect(screen.getByText("Feb")).toBeInTheDocument();
  });
});

describe("renderer · form binding & action", () => {
  it("TextField $bind writes input events back to state via setState", () => {
    const doc: UIDLDocument = {
      version: "1.0.0", id: "bind1", name: "Bind1",
      state: { query: "" },
      root: {
        id: "root", type: "Column", children: [
          {
            id: "search", type: "TextField",
            props: { label: "Search", value: { $bind: "state.query" }, placeholder: "Type…" },
            events: { onChange: [{ setState: { path: "query", value: null } }] },
          },
        ],
      },
    };
    const store = createDocumentState({ query: "" }).getState();
    render(<UIDocumentRenderer document={doc} stateStore={store} />);
    const input = screen.getByPlaceholderText("Type…") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "invoice-001" } });
    expect(store.getValue("query")).toBe("invoice-001");
  });

  it("Button onClick navigate fires the route change callback", async () => {
    const doc: UIDLDocument = {
      version: "1.0.0", id: "nav1", name: "Nav1", root: {
        id: "btn", type: "Button",
        props: { label: "Open Detail" },
        events: { onClick: [{ navigate: { route: "/invoices/SINV-001" } }] },
      },
    };
    const routes: string[] = [];
    render(
      <UIDocumentRenderer
        document={doc}
         onRouteChange={(route) => routes.push(typeof route === "string" ? route : JSON.stringify(route))}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open Detail" }));
    await waitFor(() => expect(routes).toEqual(["/invoices/SINV-001"]));
  });

  it("Checkbox $bind reflects state and writes back on change", () => {
    const doc: UIDLDocument = {
      version: "1.0.0", id: "bind2", name: "Bind2",
      state: { active: true },
      root: {
        id: "chk", type: "Checkbox",
        props: { label: "Active", checked: { $bind: "state.active" } },
        events: { onChange: [{ setState: { path: "active", value: null } }] },
      },
    };
    const store = createDocumentState({ active: true }).getState();
    render(<UIDocumentRenderer document={doc} stateStore={store} />);
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(store.getValue("active")).toBe(false);
  });
});
