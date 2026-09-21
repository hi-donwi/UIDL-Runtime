import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UIDocumentRenderer } from "../UIDocumentRenderer";
import { createDocumentState } from "../../state/createDocumentState";
import type { UIDLDocument } from "../../types";

/**
 * Cell semantics for the *live* list path.
 *
 * The static Meridian reference formatted money, dates and statuses in TypeScript before baking
 * them into the document. A `$query`-driven list has no such step, so a generated Sales Order
 * list rendered `1500000`, `2026-08-31` and a bare `Open` where Meridian shows formatted
 * money, a formatted date and a coloured StatusPill. These lock the widget-side rules in.
 */
function listDocument(): UIDLDocument {
  return {
    version: "1.0.0",
    id: "cells-doc",
    name: "Sales Order",
    dataSources: {
      rows: [
        { id: "SO-001", name: "Sales Order 001", date: "2026-08-31", grandTotal: 1500000, status: "Open" },
      ],
    },
    root: {
      id: "table",
      type: "DataTable",
      props: {
        dataSource: "rows",
        locale: "id-ID",
        currency: "IDR",
        columns: [
          { key: "name", label: "Name" },
          { key: "date", label: "Date", format: "date" },
          { key: "grandTotal", label: "Grand Total", format: "currency" },
          { key: "status", label: "Status", format: "status" },
        ],
      },
      events: { onOpen: [{ setState: { path: "opened", value: { $bind: "event.id" } } }] },
    },
  };
}

function renderList() {
  const doc = listDocument();
  const stateStore = createDocumentState({ opened: "" }).getState();
  render(<UIDocumentRenderer document={doc} dataSources={doc.dataSources} stateStore={stateStore} />);
  return stateStore;
}

describe("Text format — summary figures read like the column they total", () => {
  it("formats a bound aggregate as money instead of a raw integer", () => {
    render(
      <UIDocumentRenderer
        document={{
          version: "1.0.0",
          id: "summary-doc",
          name: "Summary",
          dataSources: { rows: [{ grandTotal: 1000000 }, { grandTotal: 500000 }] },
          root: {
            id: "total",
            type: "Text",
            props: {
              value: { $expr: { agg: "sum", over: "data.rows", field: "grandTotal" } },
              format: "currency",
              locale: "id-ID",
              currency: "IDR",
            },
          },
        }}
        dataSources={{ rows: [{ grandTotal: 1000000 }, { grandTotal: 500000 }] }}
      />,
    );
    expect(screen.queryByText("1500000")).toBeNull();
    expect(screen.getByText(/Rp\s?1\.500\.000/)).toBeTruthy();
  });
});

describe("PageBar — Paginator over a server-paginated list", () => {
  function renderPageBar(page: number) {
    const stateStore = createDocumentState({ page, pageSize: 20, $data: { rows: { total: 95 } } }).getState();
    render(
      <UIDocumentRenderer
        document={{
          version: "1.0.0",
          id: "pager-doc",
          name: "Pager",
          root: {
            id: "pager",
            type: "PageBar",
            props: {
              total: { $bind: "state.$data.rows.total" },
              page: { $bind: "state.page" },
              pageSize: { $bind: "state.pageSize" },
            },
            events: { onPageChange: [{ setState: { path: "page", value: null } }] },
          },
        }}
        stateStore={stateStore}
      />,
    );
    return stateStore;
  }

  it("reports the real range and page count from the server total", () => {
    renderPageBar(1);
    expect(screen.getByText("1 - 20")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy(); // ceil(95 / 20)
  });

  it("steps to page 3, which the old fixed Previous/Next buttons could never reach", () => {
    const stateStore = renderPageBar(2);
    fireEvent.click(screen.getByLabelText("Next page"));
    expect(stateStore.getValue("page")).toBe(3);
  });

  it("does not step past the last page", () => {
    const stateStore = renderPageBar(5);
    expect(screen.getByLabelText("Next page")).toHaveProperty("disabled", true);
    expect(stateStore.getValue("page")).toBe(5);
  });
});

describe("DataTable cell rendering — ListCell parity", () => {
  it("formats a currency column with the declared currency", () => {
    renderList();
    expect(screen.queryByText("1500000")).toBeNull();
    expect(screen.getByText(/Rp\s?1\.500\.000/)).toBeTruthy();
  });

  it("formats a date column instead of echoing the ISO string", () => {
    renderList();
    expect(screen.queryByText("2026-08-31")).toBeNull();
    expect(screen.getByText(/31 Agu|31 Agt|Agu 31|31\/08\/2026/)).toBeTruthy();
  });

  it("renders a status column as a coloured pill, not plain text", () => {
    renderList();
    const status = screen.getByText("Open");
    expect(status.className).toContain("pill");
    // "Open" is live work — blue, on the same logic StatusPill colours "Submitted".
    expect(status.className).toMatch(/blue/);
  });

  it("right-aligns the numeric column without the document asking", () => {
    renderList();
    const cell = screen.getByText(/Rp\s?1\.500\.000/).closest("div");
    expect(cell?.className).toContain("justify-end");
  });

  it("opens the document when the row itself is clicked (Meridian has no action column)", () => {
    const state = renderList();
    expect(screen.queryByRole("button", { name: "Open" })).toBeNull();
    fireEvent.click(screen.getByText("Sales Order 001").closest("[data-row-id]")!);
    expect(state.getValue("opened")).toBe("SO-001");
  });

  it("opens the document from the keyboard, so the row is not mouse-only", () => {
    const state = renderList();
    fireEvent.keyDown(screen.getByText("Sales Order 001").closest("[data-row-id]")!, { key: "Enter" });
    expect(state.getValue("opened")).toBe("SO-001");
  });

});

describe("controlled inputs tolerate a null bound value", () => {
  it("renders an empty string rather than dropping to uncontrolled", () => {
    // A doctype whose stored field is null made React warn and quietly stop tracking the
    // field's state, so typing into it did not update the document.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <UIDocumentRenderer
        document={{
          version: "1.0.0",
          id: "null-value-doc",
          name: "Null value",
          state: { subject: null },
          root: {
            id: "field",
            type: "TextField",
            props: { "aria-label": "Subject", value: { $bind: "state.subject" } },
            events: { onChange: [{ setState: { path: "subject", value: null } }] },
          },
        }}
        stateStore={createDocumentState({ subject: null }).getState()}
      />,
    );
    expect((screen.getByLabelText("Subject") as HTMLInputElement).value).toBe("");
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("maps a lookup row's own keys onto an option", () => {
    // A Link binds rows straight from a query, and those carry the target doctype's keys, not
    // `value`/`label`. Unmapped, every lookup rendered as an empty dropdown and the documents
    // with a required Link could not be saved at all.
    render(
      <UIDocumentRenderer
        document={{
          version: "1.0.0",
          id: "lookup-doc",
          name: "Lookup",
          state: { party: "" },
          root: {
            id: "party",
            type: "Select",
            props: {
              "aria-label": "Customer",
              value: { $bind: "state.party" },
              options: [{ id: "party-1", name: "PT Nusantara Retail" }],
              optionValueKey: "id",
              optionLabelKey: "name",
            },
            events: { onChange: [{ setState: { path: "party", value: null } }] },
          },
        }}
        stateStore={createDocumentState({ party: "" }).getState()}
      />,
    );
    const option = screen.getByRole("option", { name: "PT Nusantara Retail" }) as HTMLOptionElement;
    expect(option.value).toBe("party-1");
  });
});
