import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WidgetPalette } from "../WidgetPalette";

function makeProps(overrides?: { onSelectWidget?: (widgetType: string) => void; selectedNodeId?: string | null; className?: string }) {
  return {
    onSelectWidget: overrides?.onSelectWidget ?? (() => {}),
    selectedNodeId: overrides?.selectedNodeId ?? "root",
    ...(overrides?.className ? { className: overrides.className } : {}),
  } as const;
}

describe("WidgetPalette", () => {
  it("renders only widgets that are not hidden from the palette", () => {
    render(<WidgetPalette {...makeProps()} />);

    expect(screen.getAllByText("Container").length).toBeGreaterThan(0);
    expect(screen.queryByText("Sidebar")).not.toBeInTheDocument();
    expect(screen.queryByText("Navbar")).not.toBeInTheDocument();
    expect(screen.queryByText("Toolbar")).not.toBeInTheDocument();
    expect(screen.queryByText("Drawer")).not.toBeInTheDocument();
    expect(screen.queryByText("Panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Snackbar")).not.toBeInTheDocument();
  });

  it("shows the correct count of available components", () => {
    render(<WidgetPalette {...makeProps()} />);

    expect(screen.getByText("21 components available")).toBeInTheDocument();
  });

  it("does not render navigation category when all its widgets are hidden", () => {
    render(<WidgetPalette {...makeProps()} />);

    expect(screen.queryByText("Navigation")).not.toBeInTheDocument();
  });

  it("renders a button for each visible widget", () => {
    render(<WidgetPalette {...makeProps()} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(21);
  });
});
