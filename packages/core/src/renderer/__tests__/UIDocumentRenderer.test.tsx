import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UIDocumentRenderer } from "../UIDocumentRenderer";
import { defaultRegistry } from "../../registry/registry";
import type { UIDLDocument } from "../../types";

function makeDocument(events: Record<string, unknown>): UIDLDocument {
  return {
    version: "1.0.0",
    id: "doc",
    name: "Doc",
    root: {
      id: "root",
      type: "Button",
      testId: "trigger",
      props: { label: "Trigger" },
      events,
    },
  };
}

describe("UIDocumentRenderer — showDialog", () => {
  it("shows a dialog with the action's title/content when triggered, and closes on backdrop click", async () => {
    const user = userEvent.setup();
    const doc = makeDocument({
      onClick: [{ showDialog: { title: "Delete item?", content: "This can't be undone." } }],
    });

    render(<UIDocumentRenderer document={doc} />);

    expect(screen.queryByText("Delete item?")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("trigger"));

    expect(screen.getByText("Delete item?")).toBeInTheDocument();
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument();

    // a11y: Dialog announces itself as a modal dialog named by its title
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("Delete item?");

    await user.click(screen.getByRole("button", { name: "Close" }));

    // the dialog fades out over 200ms (round 14) before unmounting
    await waitFor(() => {
      expect(screen.queryByText("Delete item?")).not.toBeInTheDocument();
    });
  });

  it("closes the dialog on backdrop click", async () => {
    const user = userEvent.setup();
    const doc = makeDocument({
      onClick: [{ showDialog: { title: "Hello", content: "World" } }],
    });

    const { container } = render(<UIDocumentRenderer document={doc} />);
    await user.click(screen.getByTestId("trigger"));
    expect(screen.getByText("Hello")).toBeInTheDocument();

    const backdrop = container.querySelector("[data-overlay-backdrop]");
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as HTMLElement);

    // the dialog fades out over 200ms (round 14) before unmounting
    await waitFor(() => {
      expect(screen.queryByText("Hello")).not.toBeInTheDocument();
    });
  });
});

describe("UIDocumentRenderer — showSnackbar", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a snackbar with the action's message when triggered", async () => {
    const user = userEvent.setup();
    const doc = makeDocument({
      onClick: [{ showSnackbar: { message: "Saved successfully" } }],
    });

    render(<UIDocumentRenderer document={doc} />);
    expect(screen.queryByText("Saved successfully")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("trigger"));

    expect(screen.getByText("Saved successfully")).toBeInTheDocument();

    // a11y: Snackbar is a polite live region so assistive tech announces it without interrupting.
    // The message sits in a span next to the status icon, so assert on the live region itself.
    const snackbar = screen.getByRole("status");
    expect(snackbar).toHaveTextContent("Saved successfully");
    expect(snackbar.getAttribute("aria-live")).toBe("polite");
  });

  it("auto-dismisses after the configured duration", () => {
    vi.useFakeTimers();
    const doc = makeDocument({
      onClick: [{ showSnackbar: { message: "Bye soon", duration: 1000 } }],
    });

    render(<UIDocumentRenderer document={doc} />);

    fireEvent.click(screen.getByTestId("trigger"));
    expect(screen.getByText("Bye soon")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText("Bye soon")).not.toBeInTheDocument();
  });

  it("a new showSnackbar replaces the current one instead of stacking", async () => {
    const user = userEvent.setup();
    const doc: UIDLDocument = {
      version: "1.0.0",
      id: "doc",
      name: "Doc",
      root: {
        id: "root",
        type: "Row",
        children: [
          {
            id: "first",
            type: "Button",
            testId: "first",
            props: { label: "First" },
            events: { onClick: [{ showSnackbar: { message: "First toast" } }] },
          },
          {
            id: "second",
            type: "Button",
            testId: "second",
            props: { label: "Second" },
            events: { onClick: [{ showSnackbar: { message: "Second toast" } }] },
          },
        ],
      },
    };

    render(<UIDocumentRenderer document={doc} />);
    await user.click(screen.getByTestId("first"));
    expect(screen.getByText("First toast")).toBeInTheDocument();

    await user.click(screen.getByTestId("second"));
    expect(screen.queryByText("First toast")).not.toBeInTheDocument();
    expect(screen.getByText("Second toast")).toBeInTheDocument();
  });
});

describe("registry", () => {
  it("Dialog and Snackbar are registered widget types", () => {
    expect(defaultRegistry.has("Dialog")).toBe(true);
    expect(defaultRegistry.has("Snackbar")).toBe(true);
  });
});
