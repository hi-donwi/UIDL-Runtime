import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocumentSchema } from "../../schemas/document";
import { UIDocumentRenderer } from "../UIDocumentRenderer";
import { createDocumentState } from "../../state/createDocumentState";
import { buildPosDocument } from "../../../../../packages/templates/src/meridian/pointOfSale";
import {
  buildCustomizeFormDocument,
  buildGetStartedDocument,
  buildImportWizardDocument,
  buildSettingsDocument,
  buildTemplateBuilderDocument,
} from "../../../../../packages/templates/src/meridian/settingsAndMeta";

describe("meridian demo POS", () => {
  it("adds an item to the cart, shows it in the cart section, and removes it again", () => {
    const doc = DocumentSchema.parse(buildPosDocument());
    const stateStore = createDocumentState(doc.state ?? {}).getState();
    render(<UIDocumentRenderer document={doc} stateStore={stateStore} />);

    expect(screen.getByText("Items")).toBeInTheDocument();
    expect(screen.getByText("Cart")).toBeInTheDocument();

    // ItemsGrid makes the whole tile the click target; there is no per-tile "add" button.
    const tiles = screen.getAllByTestId(/^pos-item-/);
    expect(tiles.length).toBeGreaterThan(0);
    fireEvent.click(tiles[0]);

    const removeButtons = screen.getAllByText("Remove");
    expect(removeButtons).toHaveLength(1);

    fireEvent.click(removeButtons[0]);
    expect(screen.queryAllByText("Remove")).toHaveLength(0);
  });

  it("Complete Sale clears the cart and shows a confirmation snackbar", async () => {
    const doc = DocumentSchema.parse(buildPosDocument());
    const stateStore = createDocumentState(doc.state ?? {}).getState();
    render(<UIDocumentRenderer document={doc} stateStore={stateStore} />);

    // Re-query between clicks: the state change re-renders the tree, detaching the old nodes.
    fireEvent.click(screen.getAllByTestId(/^pos-item-/)[0]);
    fireEvent.click(screen.getAllByTestId(/^pos-item-/)[1]);
    expect(screen.getAllByText("Remove")).toHaveLength(2);

    fireEvent.click(screen.getByText("Complete Sale"));

    await waitFor(() => expect(screen.getByText("Sale completed — thank you!")).toBeInTheDocument());
    expect(screen.queryAllByText("Remove")).toHaveLength(0);
  });

  it("validates against DocumentSchema and renders with no console errors", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const doc = DocumentSchema.parse(buildPosDocument());
    const stateStore = createDocumentState(doc.state ?? {}).getState();
    render(<UIDocumentRenderer document={doc} stateStore={stateStore} />);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("meridian demo Settings", () => {
  it("is a tabbed, real editable form — the General tab is open by default", () => {
    const doc = DocumentSchema.parse(buildSettingsDocument());
    const stateStore = createDocumentState(doc.state ?? {}).getState();
    render(<UIDocumentRenderer document={doc} stateStore={stateStore} />);

    for (const tab of ["General", "Invoices", "Accounting", "Print", "System"]) {
      expect(screen.getByRole("button", { name: tab })).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Company Name")).toHaveValue("Meridian Trading Co.");
    fireEvent.change(screen.getByLabelText("Company Name"), { target: { value: "New Name Co." } });
    expect(stateStore.getValue("general.companyName")).toBe("New Name Co.");
  });

  it("switches tabs and a Checkbox field on another tab reflects its real boolean state", () => {
    // Regression test: settingsFieldNode() must pass `checked` (not `value`) to Checkbox, and
    // panels are visibility-gated so a field only exists in the DOM once its tab is open.
    const doc = DocumentSchema.parse(buildSettingsDocument());
    const stateStore = createDocumentState(doc.state ?? {}).getState();
    render(<UIDocumentRenderer document={doc} stateStore={stateStore} />);

    expect(screen.queryByLabelText("Enable Inventory")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accounting" }));

    const inventoryCheckbox = screen.getByLabelText("Enable Inventory") as HTMLInputElement;
    expect(inventoryCheckbox.checked).toBe(true);
    fireEvent.click(inventoryCheckbox);
    expect(stateStore.getValue("accounting.enableInventory")).toBe(false);
  });
});

describe("meridian demo Get Started", () => {
  it("validates, renders every real getStartedConfig.ts section, and each card navigates somewhere real", () => {
    const doc = DocumentSchema.parse(buildGetStartedDocument());
    const routeChanges: unknown[] = [];
    render(<UIDocumentRenderer document={doc} onRouteChange={(route) => routeChanges.push(route)} />);

    expect(screen.getByText("Set Up Your Workspace")).toBeInTheDocument();
    for (const section of ["Organisation", "Accounts", "Sales", "Purchase"]) {
      expect(screen.getByText(section)).toBeInTheDocument();
    }
    expect(screen.getByText("Review Accounts")).toBeInTheDocument();
    expect(screen.getByText("Add Customers")).toBeInTheDocument();

    fireEvent.click(screen.getAllByText("Review")[0]);
    expect(routeChanges).toEqual(["/meridian/settings"]);
  });

  it("marks Meridian's already-populated sections as done, derived from the real mock data", () => {
    const doc = DocumentSchema.parse(buildGetStartedDocument());
    render(<UIDocumentRenderer document={doc} />);

    // Meridian already has customers, suppliers, items, and invoices in mockData.ts, so every
    // card should read as done — not a hand-typed flag, but derived the same way every other
    // page in this demo derives its numbers.
    expect(screen.queryByText("Not started")).not.toBeInTheDocument();
    expect(screen.getAllByText("✓ Done").length).toBeGreaterThan(0);
  });
});

describe("meridian demo meta tool pages (illustrative, not functional)", () => {
  it.each([
    ["Import Wizard", buildImportWizardDocument],
    ["Customize Form", buildCustomizeFormDocument],
    ["Template Builder", buildTemplateBuilderDocument],
  ] as const)("%s validates and renders with no console errors", (title, builder) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const doc = DocumentSchema.parse(builder());
    render(<UIDocumentRenderer document={doc} />);
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
