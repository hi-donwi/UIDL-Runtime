import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommandPalette } from "../../../../apps/reference/src/CommandPalette";
import { PlaygroundRoute } from "../../../../apps/reference/src/PlaygroundRoute";
import { defaultDarkTheme } from "../theme/presets";
import { UIDocumentRenderer } from "../renderer/UIDocumentRenderer";
import type { UIDLDocument } from "../types";

describe("CommandPalette Component", () => {
  it("renders when open and filters items based on search query", () => {
    const handleClose = vi.fn();
    const handleSelect = vi.fn();

    const { rerender } = render(
      <CommandPalette open={false} onClose={handleClose} onSelect={handleSelect} />
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(<CommandPalette open={true} onClose={handleClose} onSelect={handleSelect} />);
    expect(screen.getByRole("dialog", { name: /universal command palette/i })).toBeDefined();

    const input = screen.getByPlaceholderText(/cari modul, konsol industri/i);
    expect(input).toBeDefined();

    // Type query "faktur"
    fireEvent.change(input, { target: { value: "faktur" } });
    expect(screen.getByText(/faktur pajak ppn 11%/i)).toBeDefined();

    // Select with Enter
    fireEvent.keyDown(input, { key: "Enter" });
    expect(handleSelect).toHaveBeenCalledWith(
      "/meridian/print/tax-invoice/SalesInvoice/SINV-2027-00001"
    );
    expect(handleClose).toHaveBeenCalled();
  });

  it("handles keyboard navigation and escape key", () => {
    const handleClose = vi.fn();
    const handleSelect = vi.fn();

    render(<CommandPalette open={true} onClose={handleClose} onSelect={handleSelect} />);
    const input = screen.getByPlaceholderText(/cari modul, konsol industri/i);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(handleClose).toHaveBeenCalled();
  });
});

describe("PlaygroundRoute Component", () => {
  it("renders JSON editor and live document preview", () => {
    const handleBack = vi.fn();
    const handleToggleTheme = vi.fn();

    render(
      <PlaygroundRoute
        onBack={handleBack}
        isDark={false}
        onToggleTheme={handleToggleTheme}
      />
    );

    expect(screen.getByText(/uidl-runtime JSON Schema Playground/i)).toBeDefined();
    expect(screen.getAllByText(/Antrean Poliklinik & Rekam Medis \(EMR\)/i).length).toBeGreaterThanOrEqual(1);

    // Check Format button
    const formatBtn = screen.getByTitle(/format json/i);
    fireEvent.click(formatBtn);

    // Switch preset
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "medtech" } });
    expect(screen.getAllByText(/Device History Record \(DHR\) & Sterilisasi Lot/i).length).toBeGreaterThanOrEqual(1);
  });
});

describe("Dark Theme Tokens & UIDocumentRenderer Integration", () => {
  it("renders UIDocumentRenderer smoothly with defaultDarkTheme", () => {
    const sampleDoc: UIDLDocument = {
      version: "1.0.0",
      id: "dark-test-doc",
      name: "Dark Theme Document",
      root: {
        id: "root-col",
        type: "Column",
        children: [
          {
            id: "title",
            type: "Text",
            props: { value: "Dark Mode Header" },
          },
        ],
      },
    };

    const { getByText } = render(
      <UIDocumentRenderer document={sampleDoc} theme={defaultDarkTheme} />
    );

    expect(getByText("Dark Mode Header")).toBeDefined();
  });
});
