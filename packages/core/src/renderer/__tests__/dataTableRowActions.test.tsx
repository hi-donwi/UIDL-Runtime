import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderUIDocument } from "../renderDocument";
import { UIDocumentRenderer } from "../UIDocumentRenderer";
import { createDocumentState } from "../../state/createDocumentState";
import type { UIDLDocument } from "../../types";

/**
 * Regression coverage for the DataTable.rowActions mechanism found during the Meridian Trading Co.
 * build (round 32): row action buttons rendered but had no onClick wired at all. Fixed via a
 * dedicated `event.<path>` bind for actions (interpreter.ts's resolveEventBind) that reaches into
 * whatever row data was clicked, wired through RenderNode.tsx's `onRowAction` synthesis.
 */

function documentWithRowActions(events: Record<string, unknown>): UIDLDocument {
  return {
    version: "1.0.0",
    id: "row-actions-doc",
    name: "Row actions doc",
    dataSources: {
      invoices: [
        { id: "SINV-001", customer: "Acme Corp", total: "$100", route: "/edit/SINV-001" },
        { id: "SINV-002", customer: "Globex Inc", total: "$200", route: "/edit/SINV-002" },
      ],
    },
    root: {
      id: "table",
      type: "DataTable",
      props: {
        dataSource: "invoices",
        columns: [
          { key: "id", label: "Invoice" },
          { key: "customer", label: "Customer" },
        ],
        rowActions: [{ label: "Open", event: "onOpen" }],
      },
      events,
    },
  };
}

describe("DataTable row actions", () => {
  it("clicking a row action fires the mapped event with that row's own data via {\"$bind\": \"event.<field>\"}", () => {
    const doc = documentWithRowActions({
      onOpen: [{ navigate: { route: { $bind: "event.route" } } }],
    });
    const routeChanges: unknown[] = [];
    render(<UIDocumentRenderer document={doc} dataSources={doc.dataSources} onRouteChange={(route) => routeChanges.push(route)} />);

    const openButtons = screen.getAllByText("Open");
    expect(openButtons).toHaveLength(2);

    fireEvent.click(openButtons[1]);
    expect(routeChanges).toEqual(["/edit/SINV-002"]);
  });

  it("setState with {\"$bind\": \"event\"} stores the whole clicked row", () => {
    const doc = documentWithRowActions({
      onOpen: [{ setState: { path: "selectedInvoice", value: { $bind: "event" } } }],
    });
    const stateStore = createDocumentState({ selectedInvoice: null }).getState();
    render(<UIDocumentRenderer document={doc} dataSources={doc.dataSources} stateStore={stateStore} />);

    fireEvent.click(screen.getAllByText("Open")[0]);
    expect(stateStore.getValue("selectedInvoice")).toEqual({
      id: "SINV-001",
      customer: "Acme Corp",
      total: "$100",
      route: "/edit/SINV-001",
    });
  });

  it("setState with {\"$bind\": \"event.<field>\"} stores just that field", () => {
    const doc = documentWithRowActions({
      onOpen: [{ setState: { path: "selectedId", value: { $bind: "event.id" } } }],
    });
    const stateStore = createDocumentState({ selectedId: null }).getState();
    render(<UIDocumentRenderer document={doc} dataSources={doc.dataSources} stateStore={stateStore} />);

    fireEvent.click(screen.getAllByText("Open")[1]);
    expect(stateStore.getValue("selectedId")).toBe("SINV-002");
  });

  it("a row action with no `event` field on the action itself is inert (no crash, no navigation)", () => {
    const doc = documentWithRowActions({ onOpen: [{ navigate: { route: "/should-not-fire" } }] });
    // Override rowActions to omit `event` on the action definition itself.
    doc.root.props!.rowActions = [{ label: "Open" }];
    const routeChanges: unknown[] = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<UIDocumentRenderer document={doc} dataSources={doc.dataSources} onRouteChange={(route) => routeChanges.push(route)} />);

    fireEvent.click(screen.getAllByText("Open")[0]);
    expect(routeChanges).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("an event name with no matching entry in node.events is inert (no crash)", () => {
    const doc = documentWithRowActions({}); // no "onOpen" handler declared at all
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<UIDocumentRenderer document={doc} dataSources={doc.dataSources} />);

    fireEvent.click(screen.getAllByText("Open")[0]);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("does not leak a raw onOpen prop onto the rendered DOM element (would trigger a React unknown-event-handler warning)", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const doc = documentWithRowActions({ onOpen: [{ navigate: { route: { $bind: "event.route" } } }] });
    render(<>{renderUIDocument(doc, { dataSources: doc.dataSources })}</>);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("multiple row actions on the same row are distinguished by their own `event` name", () => {
    const doc = documentWithRowActions({
      onOpen: [{ setState: { path: "log", value: "opened" } }],
      onArchive: [{ setState: { path: "log", value: "archived" } }],
    });
    doc.root.props!.rowActions = [
      { label: "Open", event: "onOpen" },
      { label: "Archive", event: "onArchive" },
    ];
    const stateStore = createDocumentState({ log: "" }).getState();
    render(<UIDocumentRenderer document={doc} dataSources={doc.dataSources} stateStore={stateStore} />);

    fireEvent.click(screen.getAllByText("Archive")[0]);
    expect(stateStore.getValue("log")).toBe("archived");
  });

  it("row actions can call a host mutationHandler through UIDocumentRenderer", async () => {
    const doc = documentWithRowActions({
      onArchive: [
        {
          mutate: {
            operation: "delete",
            collection: "SalesInvoice",
            id: { $bind: "event.id" },
            statusPath: "mutation.status",
          },
        },
      ],
    });
    doc.root.props!.rowActions = [{ label: "Archive", event: "onArchive" }];
    const stateStore = createDocumentState({ mutation: {} }).getState();
    const mutationHandler = vi.fn().mockResolvedValue({ ok: true });
    render(
      <UIDocumentRenderer
        document={doc}
        dataSources={doc.dataSources}
        stateStore={stateStore}
        mutationHandler={mutationHandler}
      />,
    );

    fireEvent.click(screen.getAllByText("Archive")[1]);

    await vi.waitFor(() => {
      expect(mutationHandler).toHaveBeenCalledWith({
        operation: "delete",
        collection: "SalesInvoice",
        id: "SINV-002",
      });
    });
    expect(stateStore.getValue("mutation.status")).toBe("success");
  });
});
