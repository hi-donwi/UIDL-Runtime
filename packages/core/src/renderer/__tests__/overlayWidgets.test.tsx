import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { defaultRegistry } from "../../registry/registry";
import { renderNode } from "../RenderNode";
import { UIDocumentRenderer } from "../UIDocumentRenderer";
import { Drawer } from "../../components/primitives";
import { defaultLightTheme } from "../../theme/presets";
import { createDocumentState } from "../../state/createDocumentState";
import type { UIDLDocument, UIDLNode } from "../../types";

/**
 * Roadmap step 5 (see .notes/notes.md): Drawer/Panel are state-controlled overlays —
 * escape-to-close, backdrop-click-to-close, minimal focus trap — built on the Dialog
 * pattern. Controlled via props bound to state (`open: { "$bind": "state.overlays.x" }`),
 * closed via onClose forwarded to the ActionInterpreter. No editor-UI code involved.
 * Round 14 added the enter/exit motion: drawer slides from its edge, panel/dialog fade;
 * 300ms in / 200ms out, exit interrupted by re-opening; prefers-reduced-motion skips it.
 */
describe("overlay chrome widgets: Drawer/Panel", () => {
  it("are registered in defaultRegistry under advanced, accepting children, with onClose", () => {
    for (const type of ["Drawer", "Panel"]) {
      const manifest = defaultRegistry.get(type);
      expect(manifest).toBeDefined();
      expect(manifest?.category).toBe("advanced");
      expect(manifest?.acceptsChildren).toBe(true);
      expect(manifest?.events).toContain("onClose");
    }
  });

  it("renders nothing while closed", () => {
    const { container } = render(<>{renderNode({ id: "d", type: "Drawer", testId: "drawer" })}</>);
    expect(container.querySelector('[data-testid="drawer"]')).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders a right-side drawer with backdrop, dialog semantics, title, and children", () => {
    const node: UIDLNode = {
      id: "drawer",
      type: "Drawer",
      testId: "drawer",
      props: { open: true, title: "Filters" },
      children: [{ id: "text", type: "Text", props: { value: "Filter options" } }],
    };

    const { getByTestId, getByText } = render(<>{renderNode(node)}</>);
    const drawer = getByTestId("drawer");
    expect(drawer.getAttribute("role")).toBe("dialog");
    expect(drawer.getAttribute("aria-modal")).toBe("true");
    for (const expected of ["inset-y-0", "right-0", "w-80", "flex", "flex-col", "bg-white", "shadow-md", "pointer-events-auto", "outline-none"]) {
      expect(drawer.className).toContain(expected);
    }
    // backdrop sibling + wrapper plumbing
    const wrapper = drawer.parentElement!;
    expect(wrapper.className).toContain("pointer-events-none");
    expect(wrapper.querySelector("[data-overlay-backdrop]")).toBeTruthy();
    // title header + children
    expect(getByText("Filters")).toBeTruthy();
    expect(getByText("Filter options")).toBeTruthy();
  });

  it("supports every drawer side", () => {
    const sides: Array<[NonNullable<import("../../components/primitives").DrawerProps["side"]>, string]> = [
      ["left", "left-0"],
      ["right", "right-0"],
      ["top", "top-0 h-80"],
      ["bottom", "bottom-0 h-80"],
    ];
    for (const [side, expected] of sides) {
      const { getByTestId, unmount } = render(
        <>{renderNode({ id: "d", type: "Drawer", testId: "d", props: { open: true, side } })}</>,
      );
      const el = getByTestId("d");
      for (const cls of expected.split(" ")) {
        expect(el.className).toContain(cls);
      }
      unmount();
    }
  });

  it("closes on backdrop click and on Escape", () => {
    const onClose = vi.fn();
    const direct: UIDLNode = {
      id: "drawer",
      type: "Drawer",
      testId: "drawer",
      props: { open: true, onClose },
    };
    const { getByTestId } = render(<>{renderNode(direct)}</>);
    const drawer = getByTestId("drawer");
    const backdrop = drawer.parentElement!.querySelector("[data-overlay-backdrop]")!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("closes only the top-most overlay on Escape when several are open at once", () => {
    const onCloseA = vi.fn();
    const onCloseB = vi.fn();
    const a: UIDLNode = { id: "a", type: "Drawer", testId: "a", props: { open: true, onClose: onCloseA } };
    const b: UIDLNode = { id: "b", type: "Drawer", testId: "b", props: { open: true, onClose: onCloseB } };

    const { rerender } = render(
      <>
        {renderNode(a)}
        {renderNode(b)}
      </>,
    );

    // Escape closes the top-most (b, opened last) only
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCloseB).toHaveBeenCalledTimes(1);
    expect(onCloseA).not.toHaveBeenCalled();

    // the parent responds to onClose by closing b (controlled) — its stack entry is removed
    rerender(
      <>
        {renderNode(a)}
        {renderNode({ ...b, props: { ...b.props, open: false } })}
      </>,
    );

    // b is gone from the stack — Escape now closes a
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCloseA).toHaveBeenCalledTimes(1);
  });

  it("renders no backdrop when backdrop={false}", () => {
    const node: UIDLNode = {
      id: "drawer",
      type: "Drawer",
      testId: "drawer",
      props: { open: true, backdrop: false },
      children: [{ id: "text", type: "Text", props: { value: "No dim" } }],
    };
    const { getByTestId, getByText } = render(<>{renderNode(node)}</>);
    const drawer = getByTestId("drawer");
    expect(drawer.parentElement!.querySelector("[data-overlay-backdrop]")).toBeNull();
    expect(getByText("No dim")).toBeTruthy();
  });

  it("traps Tab/Shift+Tab inside the open drawer and restores focus on close", () => {
    const { rerender } = render(<button data-testid="outside">Outside</button>);
    const outside = screen.getByTestId("outside") as HTMLElement;
    outside.focus();
    expect(document.activeElement).toBe(outside);

    rerender(
      <>
        <button data-testid="outside">Outside</button>
        <Drawer open onClose={() => undefined}>
          <button data-testid="first">First</button>
          <button data-testid="last">Last</button>
        </Drawer>
      </>,
    );

    const dialog = screen.getByRole("dialog");
    expect(document.activeElement).toBe(dialog);

    // Tab from the last focusable wraps to the first
    (screen.getByTestId("last") as HTMLElement).focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByTestId("first"));

    // Shift+Tab from the first wraps to the last
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByTestId("last"));

    // closing restores focus to the previously focused element
    rerender(
      <>
        <button data-testid="outside">Outside</button>
        <Drawer open={false} onClose={() => undefined}>
          <button data-testid="first">First</button>
          <button data-testid="last">Last</button>
        </Drawer>
      </>,
    );
    expect(document.activeElement).toBe(outside);
  });

  it("renders a bare centered panel that closes via backdrop and Escape", () => {
    const onClose = vi.fn();
    const node: UIDLNode = {
      id: "panel",
      type: "Panel",
      testId: "panel",
      props: { open: true, onClose },
      children: [{ id: "text", type: "Text", props: { value: "Panel content" } }],
    };

    const { getByTestId, getByText, unmount } = render(<>{renderNode(node)}</>);
    const panel = getByTestId("panel");
    expect(panel.getAttribute("role")).toBe("dialog");
    for (const expected of ["fixed", "inset-0", "flex", "items-center", "justify-center", "pointer-events-auto"]) {
      expect(panel.className).toContain(expected);
    }
    // no forced title/close button — bare shell
    expect(screen.queryByText("Close")).toBeNull();
    expect(getByText("Panel content")).toBeTruthy();

    fireEvent.click(panel.parentElement!.querySelector("[data-overlay-backdrop]")!);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
    unmount();
  });

  it("end to end: a state-bound drawer opens from document state and closes via onClose -> setState", async () => {
    const document: UIDLDocument = {
      version: "1.0.0",
      id: "overlay-page",
      name: "Overlay Page",
      state: { overlays: { sidebar: true } },
      root: {
        id: "root",
        type: "Container",
        children: [
          {
            id: "drawer",
            type: "Drawer",
            testId: "drawer",
            props: {
              title: "Filters",
              open: { $bind: "state.overlays.sidebar" },
            },
            events: {
              onClose: [{ setState: { path: "overlays.sidebar", value: false } }],
            },
            children: [{ id: "text", type: "Text", props: { value: "Filter options" } }],
          },
        ],
      },
    };

    const stateStore = createDocumentState({ overlays: { sidebar: true } }).getState();
    const { getByTestId, queryByTestId, getByText } = render(
      <UIDocumentRenderer document={document} stateStore={stateStore} theme={defaultLightTheme} />,
    );

    // opens from the initial state snapshot via the $bind
    const drawer = getByTestId("drawer");
    expect(drawer.getAttribute("role")).toBe("dialog");
    expect(getByText("Filter options")).toBeTruthy();

    // backdrop click -> onClose event -> setState action -> store update -> subscription
    // re-render -> drawer unmounts (proves the full state-bound overlay loop)
    const backdrop = drawer.parentElement!.querySelector("[data-overlay-backdrop]")!;
    fireEvent.click(backdrop);

    await waitFor(() => {
      expect(queryByTestId("drawer")).toBeNull();
    });
    expect(stateStore.getValue("overlays.sidebar")).toBe(false);
  });

  it("animates in: drawer slides from its edge, panel fades, from an off-screen start state", async () => {
    const drawer: UIDLNode = { id: "d", type: "Drawer", testId: "d", props: { open: true, side: "right" } };
    const panel: UIDLNode = { id: "p", type: "Panel", testId: "p", props: { open: true } };
    const { getByTestId } = render(
      <>
        {renderNode(drawer)}
        {renderNode(panel)}
      </>,
    );

    // first paint is the start state: off-screen translate, fully transparent
    const drawerEl = getByTestId("d");
    expect(drawerEl.className).toContain("translate-x-full");
    expect(drawerEl.className).toContain("transition-transform");
    expect(drawerEl.className).toContain("duration-300"); // entrance is longer than the exit
    expect(getByTestId("p").className).toContain("opacity-0");

    // after the double-frame sequencing the end state applies and the CSS transition runs
    await waitFor(() => {
      expect(drawerEl.className).toContain("translate-x-0");
      expect(getByTestId("p").className).toContain("opacity-100");
    });
  });

  it("stays mounted through the exit transition (slide back out, fade out), then unmounts", async () => {
    const drawer: UIDLNode = { id: "d", type: "Drawer", testId: "d", props: { open: true, side: "right" } };
    const panel: UIDLNode = { id: "p", type: "Panel", testId: "p", props: { open: true } };
    const { getByTestId, rerender } = render(
      <>
        {renderNode(drawer)}
        {renderNode(panel)}
      </>,
    );
    await waitFor(() => {
      expect(getByTestId("d").className).toContain("translate-x-0");
    });

    // the parent closes them (controlled) — both stay mounted in the start state
    rerender(
      <>
        {renderNode({ ...drawer, props: { ...drawer.props, open: false } })}
        {renderNode({ ...panel, props: { ...panel.props, open: false } })}
      </>,
    );
    const drawerEl = getByTestId("d");
    expect(drawerEl).toBeTruthy(); // still mounted, animating out
    expect(drawerEl.className).toContain("translate-x-full");
    expect(drawerEl.className).toContain("duration-200"); // exit is shorter than the entrance
    expect(drawerEl.className).toContain("pointer-events-none"); // inert while fading out
    expect(getByTestId("p").className).toContain("opacity-0");

    // once the exit transition has played, the DOM is gone
    await waitFor(() => {
      expect(screen.queryByTestId("d")).toBeNull();
      expect(screen.queryByTestId("p")).toBeNull();
    });
  });

  it("re-opening mid-exit cancels the pending unmount and re-enters", async () => {
    const base: UIDLNode = { id: "d", type: "Drawer", testId: "d", props: { open: true } };
    const { getByTestId, rerender } = render(<>{renderNode(base)}</>);
    await waitFor(() => {
      expect(getByTestId("d").className).toContain("translate-x-0");
    });

    rerender(<>{renderNode({ ...base, props: { ...base.props, open: false } })}</>);
    expect(getByTestId("d").className).toContain("translate-x-full");

    // reopen while the exit transition is still playing — must never unmount
    rerender(<>{renderNode(base)}</>);
    const drawer = getByTestId("d");
    expect(drawer).toBeTruthy();
    expect(drawer.className).toContain("translate-x-full"); // start state again
    expect(drawer.className).not.toContain("pointer-events-none"); // interactive again
    expect(drawer.className).toContain("duration-300"); // entrance motion

    // and it completes the entrance
    await waitFor(() => {
      expect(drawer.className).toContain("translate-x-0");
    });
  });

  it("prefers-reduced-motion: mounts and closes instantly, straight to the rest state", () => {
    const originalMatchMedia = window.matchMedia;
    (window as { matchMedia?: typeof window.matchMedia }).matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList);

    try {
      const drawer: UIDLNode = { id: "d", type: "Drawer", testId: "d", props: { open: true } };
      const panel: UIDLNode = { id: "p", type: "Panel", testId: "p", props: { open: true } };
      const { getByTestId, rerender } = render(
        <>
          {renderNode(drawer)}
          {renderNode(panel)}
        </>,
      );

      // entered immediately — no start state, no waiting for frames
      expect(getByTestId("d").className).toContain("translate-x-0");
      expect(getByTestId("d").className).not.toContain("translate-x-full");
      expect(getByTestId("p").className).toContain("opacity-100");

      // closing is instant too — unmounted on the same commit
      rerender(
        <>
          {renderNode({ ...drawer, props: { ...drawer.props, open: false } })}
          {renderNode({ ...panel, props: { ...panel.props, open: false } })}
        </>,
      );
      expect(screen.queryByTestId("d")).toBeNull();
      expect(screen.queryByTestId("p")).toBeNull();
    } finally {
      if (originalMatchMedia) {
        window.matchMedia = originalMatchMedia;
      } else {
        delete (window as { matchMedia?: typeof window.matchMedia }).matchMedia;
      }
    }
  });
});
