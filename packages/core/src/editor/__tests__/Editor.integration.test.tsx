import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Editor } from "../Editor";
import type { UIDLDocument } from "../../types";

function makeDocument(): UIDLDocument {
  return {
    version: "1.0.0",
    id: "test-doc",
    name: "Test Doc",
    state: { count: 0 },
    root: {
      id: "root",
      type: "Container",
      props: {},
      style: {},
      children: [
        {
          id: "count-text",
          type: "Text",
          testId: "count-display",
          props: { value: { $bind: "state.count" } },
        },
        {
          id: "increment-btn",
          type: "Button",
          testId: "increment-button",
          props: { label: "Increment" },
          events: { onClick: [{ setState: { path: "count", value: 42 } }] },
        },
      ],
    },
  };
}

describe("Editor (mounted)", () => {
  it("mounts, dispatches document events, and reflects state changes", async () => {
    const user = userEvent.setup();
    render(<Editor initialDocument={makeDocument()} />);

    expect(screen.getByTestId("count-display")).toHaveTextContent("0");

    await user.click(screen.getByTestId("increment-button"));

    expect(screen.getByTestId("count-display")).toHaveTextContent("42");
  });

  it("selects a node on canvas click without crashing the property/style panels", async () => {
    const user = userEvent.setup();
    render(<Editor initialDocument={makeDocument()} />);

    // Before any selection, the property panel shows its empty state.
    expect(screen.getByText("Select a node to edit its properties.")).toBeInTheDocument();

    await user.click(screen.getByTestId("count-display"));

    // Selecting a node re-renders PropertyPanel past its early return; this used to
    // throw "Rendered more hooks than during the previous render" (hooks-after-early-return).
    expect(screen.getByDisplayValue("Text")).toBeInTheDocument();
    expect(screen.getByDisplayValue("count-text")).toBeInTheDocument();

    // Switching to the Style tab exercises StylePanel's own early-return/hooks fix.
    await user.click(screen.getByRole("button", { name: "Style" }));
    expect(screen.queryByText("Select a node to edit its style.")).not.toBeInTheDocument();
  });

  it("renders each layer tree row exactly once (no duplicate recursion)", () => {
    render(<Editor initialDocument={makeDocument()} />);

    expect(screen.getAllByText("count-text")).toHaveLength(1);
    expect(screen.getAllByText("increment-btn")).toHaveLength(1);
  });

  it("supports real undo/redo through the property panel", async () => {
    const user = userEvent.setup();
    render(<Editor initialDocument={makeDocument()} />);

    const undoButton = screen.getByRole("button", { name: "Undo" });
    const redoButton = screen.getByRole("button", { name: "Redo" });
    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeDisabled();

    await user.click(screen.getByTestId("count-display"));
    const nameInput = screen.getByPlaceholderText("Node name");
    fireEvent.change(nameInput, { target: { value: "My Label" } });

    expect(screen.getByText("My Label")).toBeInTheDocument();
    expect(undoButton).not.toBeDisabled();

    await user.click(undoButton);

    expect(screen.queryByText("My Label")).not.toBeInTheDocument();
    expect(screen.getAllByText("count-text")).toHaveLength(1);
    expect(redoButton).not.toBeDisabled();

    await user.click(redoButton);

    expect(screen.getByText("My Label")).toBeInTheDocument();
  });
});
