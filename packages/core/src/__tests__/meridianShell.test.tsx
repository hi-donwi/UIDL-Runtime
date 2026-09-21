import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MeridianShell, type ShellNavGroup } from "../../../../packages/templates/src/MeridianShell";

/**
 * The Meridian sidebar:
 * expansion is a pure function of the active route (no independent toggle state), and the whole
 * sidebar can be hidden/shown via a chevrons icon button, matching Sidebar/Desk's own
 * toggleSidebar() behavior.
 */

function groups(): ShellNavGroup[] {
  return [
    { label: "Dashboard", items: [{ label: "Dashboard", path: "/meridian/dashboard" }] },
    {
      label: "Sales",
      items: [
        { label: "Sales Quotes", path: "/meridian/list/SalesQuote" },
        { label: "Sales Invoices", path: "/meridian/list/SalesInvoice", isActive: (p) => p === "/meridian/list/SalesInvoice" || p.startsWith("/meridian/edit/SalesInvoice/") },
      ],
    },
  ];
}

function renderShell(activePath: string, onNavigate = vi.fn()) {
  render(
    <MeridianShell company="Meridian Trading Co." title="Test Page" groups={groups()} activePath={activePath} onNavigate={onNavigate} onBack={vi.fn()}>
      <div>content</div>
    </MeridianShell>,
  );
  return onNavigate;
}

describe("MeridianShell sidebar accordion", () => {
  it("only shows items for the active group; other multi-item groups render collapsed", () => {
    renderShell("/meridian/dashboard");

    expect(screen.getByRole("button", { name: "Sales" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sales Quotes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sales Invoices" })).not.toBeInTheDocument();
  });

  it("expands a group's items when the active path matches one of them", () => {
    renderShell("/meridian/list/SalesInvoice");

    expect(screen.getByRole("button", { name: "Sales Quotes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sales Invoices" })).toBeInTheDocument();
  });

  it("a custom isActive keeps the group expanded while viewing a related edit page", () => {
    renderShell("/meridian/edit/SalesInvoice/SINV-2027-00001");

    expect(screen.getByRole("button", { name: "Sales Invoices" })).toBeInTheDocument();
  });

  it("clicking a collapsed group's header navigates to its first item", async () => {
    const user = userEvent.setup();
    const onNavigate = renderShell("/meridian/dashboard");

    await user.click(screen.getByRole("button", { name: "Sales" }));

    expect(onNavigate).toHaveBeenCalledWith("/meridian/list/SalesQuote");
  });

  it("clicking an expanded item navigates to that item's own path", async () => {
    const user = userEvent.setup();
    const onNavigate = renderShell("/meridian/list/SalesInvoice");

    await user.click(screen.getByRole("button", { name: "Sales Quotes" }));

    expect(onNavigate).toHaveBeenCalledWith("/meridian/list/SalesQuote");
  });
});

describe("MeridianShell sidebar hide/show toggle", () => {
  it("hides the sidebar when its own hide button is clicked, and a show button appears", async () => {
    const user = userEvent.setup();
    renderShell("/meridian/dashboard");

    expect(screen.getByRole("button", { name: "Sales" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hide sidebar" }));

    expect(screen.queryByRole("button", { name: "Sales" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show sidebar" })).toBeInTheDocument();
  });

  it("shows the sidebar again when the show button is clicked", async () => {
    const user = userEvent.setup();
    renderShell("/meridian/dashboard");

    await user.click(screen.getByRole("button", { name: "Hide sidebar" }));
    await user.click(screen.getByRole("button", { name: "Show sidebar" }));

    expect(screen.getByRole("button", { name: "Sales" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show sidebar" })).not.toBeInTheDocument();
  });
});

describe("MeridianShell navbar", () => {
  it("shows the page title and a back-to-catalog button, no leftover debug chrome", () => {
    renderShell("/meridian/dashboard");

    expect(screen.getByText("Test Page")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to catalog" })).toBeInTheDocument();
    expect(screen.queryByText("JSON Runtime")).not.toBeInTheDocument();
    expect(screen.queryByText("Meridian-style UI")).not.toBeInTheDocument();
    expect(screen.queryByText("Source mapping")).not.toBeInTheDocument();
  });

  it("calls onBack when the back button is clicked", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <MeridianShell company="Meridian Trading Co." title="Test Page" groups={groups()} activePath="/meridian/dashboard" onNavigate={vi.fn()} onBack={onBack}>
        <div>content</div>
      </MeridianShell>,
    );

    await user.click(screen.getByRole("button", { name: "Back to catalog" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("renders a right-side action button group when actions are supplied", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <MeridianShell
        company="Meridian Trading Co."
        title="Test Page"
        groups={groups()}
        activePath="/meridian/dashboard"
        onNavigate={vi.fn()}
        onBack={vi.fn()}
        actions={[{ label: "New", variant: "primary", onClick }]}
      >
        <div>content</div>
      </MeridianShell>,
    );

    await user.click(screen.getByRole("button", { name: "New" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders no action buttons when none are supplied", () => {
    renderShell("/meridian/dashboard");
    expect(screen.queryByRole("button", { name: "New" })).not.toBeInTheDocument();
  });
});

describe("MeridianShell nav group (search / back / forward)", () => {
  it("has real in-app back and forward buttons, distinct from the back-to-catalog button", () => {
    renderShell("/meridian/dashboard");

    expect(screen.getByRole("button", { name: "Go back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go forward" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to catalog" })).toBeInTheDocument();
  });

  it("back/forward call the real browser history API", async () => {
    const user = userEvent.setup();
    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
    const forwardSpy = vi.spyOn(window.history, "forward").mockImplementation(() => {});
    renderShell("/meridian/dashboard");

    await user.click(screen.getByRole("button", { name: "Go back" }));
    await user.click(screen.getByRole("button", { name: "Go forward" }));

    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(forwardSpy).toHaveBeenCalledTimes(1);
    backSpy.mockRestore();
    forwardSpy.mockRestore();
  });

  it("opens a search modal listing every sidebar destination, closed by default", async () => {
    const user = userEvent.setup();
    renderShell("/meridian/dashboard");

    expect(screen.queryByRole("dialog", { name: "Search" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByRole("dialog", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sales Quotes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sales Invoices" })).toBeInTheDocument();
  });

  it("filters search results as the user types", async () => {
    const user = userEvent.setup();
    renderShell("/meridian/dashboard");

    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.type(screen.getByPlaceholderText("Type to search..."), "Invoices");

    expect(screen.getByRole("button", { name: "Sales Invoices" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sales Quotes" })).not.toBeInTheDocument();
  });

  it("navigates to and closes on a search result click", async () => {
    const user = userEvent.setup();
    const onNavigate = renderShell("/meridian/dashboard");

    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.click(screen.getByRole("button", { name: "Sales Quotes" }));

    expect(onNavigate).toHaveBeenCalledWith("/meridian/list/SalesQuote");
    expect(screen.queryByRole("dialog", { name: "Search" })).not.toBeInTheDocument();
  });

  it("closes the search modal on Escape without navigating", async () => {
    const user = userEvent.setup();
    const onNavigate = renderShell("/meridian/dashboard");

    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.click(screen.getByPlaceholderText("Type to search..."));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Search" })).not.toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
