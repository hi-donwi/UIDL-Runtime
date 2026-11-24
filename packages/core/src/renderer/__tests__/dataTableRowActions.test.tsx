import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
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
  it("exposes a named action column without adding a visible heading", () => {
    render(<UIDocumentRenderer document={documentWithRowActions({})} />);

    const table = screen.getByRole("table", { name: "Data table" });
    const actionHeader = within(table).getByRole("columnheader", { name: "Row actions" });

    expect(actionHeader).toBeEmptyDOMElement();
    expect(within(table).getAllByRole("button", { name: "Open" })).toHaveLength(2);
  });

  it("renders row actions in a configurable menu and toggles the menu from the same trigger", async () => {
    const doc = documentWithRowActions({
      onOpen: [{ setState: { path: "selectedId", value: { $bind: "event.id" } } }],
    });
    doc.root.props!.rowActionPresentation = {
      mode: "menu",
      triggerLabel: "More",
      triggerAriaLabel: "Invoice actions",
      menuLabel: "Invoice action menu",
      columnAriaLabel: "Invoice action column",
    };
    const stateStore = createDocumentState({ selectedId: null }).getState();
    render(<UIDocumentRenderer document={doc} dataSources={doc.dataSources} stateStore={stateStore} />);

    const trigger = screen.getAllByRole("button", { name: "Invoice actions" })[1];
    expect(screen.getByRole("columnheader", { name: "Invoice action column" })).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(await screen.findByRole("menu", { name: "Invoice action menu" })).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "Open" })).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByRole("menu", { name: "Invoice action menu" })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Open" }));
    expect(stateStore.getValue("selectedId")).toBe("SINV-002");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes a row action menu on Escape and restores focus to its trigger", async () => {
    const doc = documentWithRowActions({});
    doc.root.props!.rowActionPresentation = { mode: "menu" };
    render(<UIDocumentRenderer document={doc} dataSources={doc.dataSources} />);

    const trigger = screen.getAllByRole("button", { name: "Row actions" })[0];
    fireEvent.click(trigger);
    const menu = await screen.findByRole("menu", { name: "Row actions menu" });
    expect(menu).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("dismisses the row action menu when the user clicks outside it", async () => {
    const doc = documentWithRowActions({});
    doc.root.props!.rowActionPresentation = { mode: "menu" };
    render(<UIDocumentRenderer document={doc} dataSources={doc.dataSources} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Row actions" })[0]);
    expect(await screen.findByRole("menu", { name: "Row actions menu" })).toBeInTheDocument();
    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu on Tab and returns focus to the trigger before native tab navigation", async () => {
    const doc = documentWithRowActions({});
    doc.root.props!.rowActionPresentation = { mode: "menu" };
    render(<UIDocumentRenderer document={doc} dataSources={doc.dataSources} />);

    const trigger = screen.getAllByRole("button", { name: "Row actions" })[0];
    fireEvent.click(trigger);
    expect(await screen.findByRole("menu", { name: "Row actions menu" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Tab" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("portals the menu into the table's shadow root and still dismisses it from outside", () => {
    const doc = documentWithRowActions({});
    doc.root.props!.rowActionPresentation = { mode: "menu" };
    const host = document.createElement("div");
    document.body.append(host);
    const shadowRoot = host.attachShadow({ mode: "open" });
    const container = document.createElement("div");
    shadowRoot.append(container);
    const view = render(<UIDocumentRenderer document={doc} dataSources={doc.dataSources} />, { container });

    const trigger = shadowRoot.querySelector<HTMLButtonElement>('button[aria-label="Row actions"]');
    expect(trigger).not.toBeNull();
    fireEvent.click(trigger!);
    expect(shadowRoot.querySelector('[role="menu"]')).not.toBeNull();
    expect(document.body.querySelector('[role="menu"]')).toBeNull();

    fireEvent.pointerDown(document.body);
    expect(shadowRoot.querySelector('[role="menu"]')).toBeNull();
    view.unmount();
    host.remove();
  });

  it("does not render a menu trigger when a row has no visible actions", () => {
    const doc = documentWithRowActions({});
    doc.dataSources!.invoices = [
      { id: "APP-001", cvScanStatus: "pending" },
      { id: "APP-002", cvScanStatus: "clean" },
    ];
    doc.root.props!.rowActions = [{
      label: "Download CV",
      visibleWhen: {
        op: "eq",
        left: { $bind: "data.row.cvScanStatus" },
        right: { literal: "clean" },
      },
    }];
    doc.root.props!.rowActionPresentation = { mode: "menu" };
    render(<UIDocumentRenderer document={doc} dataSources={doc.dataSources} />);

    expect(screen.getAllByRole("button", { name: "Row actions" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Download CV" })).not.toBeInTheDocument();
  });

  it("shows an action only when its visibleWhen expression matches that row", () => {
    const doc = documentWithRowActions({
      onDownload: [{ setState: { path: "downloadedId", value: { $bind: "event.id" } } }],
    });
    doc.dataSources!.invoices = [
      { id: "APP-001", cvScanStatus: "pending" },
      { id: "APP-002", cvScanStatus: "clean" },
      { id: "APP-003", cvScanStatus: "rejected" },
    ];
    doc.root.props!.rowActions = [
      {
        label: "Download CV",
        event: "onDownload",
        visibleWhen: {
          op: "eq",
          left: { $bind: "data.row.cvScanStatus" },
          right: { literal: "clean" },
        },
      },
    ];
    const stateStore = createDocumentState({ downloadedId: null }).getState();
    render(<UIDocumentRenderer document={doc} dataSources={doc.dataSources} stateStore={stateStore} />);

    const actions = screen.getAllByRole("button", { name: "Download CV" });
    expect(actions).toHaveLength(1);
    fireEvent.click(actions[0]);
    expect(stateStore.getValue("downloadedId")).toBe("APP-002");
  });

  it("hides a conditional action when the expression is missing or cannot be evaluated", () => {
    const doc = documentWithRowActions({ onDownload: [{ setState: { path: "downloaded", value: true } }] });
    doc.dataSources!.invoices = [{ id: "APP-001" }];
    doc.root.props!.rowActions = [
      { label: "Missing field", event: "onDownload", visibleWhen: { $bind: "data.row.cvScanStatus" } },
      { label: "Unknown expression", event: "onDownload", visibleWhen: { unsupported: true } },
      { label: "Malformed expression", event: "onDownload", visibleWhen: { "==": null } },
    ];
    render(<UIDocumentRenderer document={doc} dataSources={doc.dataSources} />);

    expect(screen.queryByRole("button", { name: "Missing field" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unknown expression" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Malformed expression" })).not.toBeInTheDocument();
  });

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
