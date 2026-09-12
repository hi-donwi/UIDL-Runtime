import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { defaultRegistry } from "../../registry/registry";
import { DocumentSchema } from "../../schemas/document";
import { createDocumentState } from "../../state/createDocumentState";
import { renderNode } from "../RenderNode";
import { renderUIDocument } from "../renderDocument";
import { defaultLightTheme } from "../../theme/presets";
import type { UIDLDocument, UIDLNode } from "../../types";
import rbacNavigationDocument from "../../../../../packages/templates/src/catalog/patterns/rbac-navigation.json";

/**
 * Roadmap step 4 (see .notes/notes.md): Sidebar/Navbar/Toolbar are semantic, styled
 * containers registered in defaultWidgets — no behavior, no editor-UI changes.
 */
describe("chrome widgets: Sidebar/Navbar/Toolbar", () => {
  it("are registered in defaultRegistry under the navigation category, accepting children", () => {
    for (const type of ["Sidebar", "Navbar", "Toolbar"]) {
      const manifest = defaultRegistry.get(type);
      expect(manifest).toBeDefined();
      expect(manifest?.category).toBe("navigation");
      expect(manifest?.acceptsChildren).toBe(true);
    }
  });

  it("renders Sidebar as a semantic <aside> with a sensible default layout and children", () => {
    const node: UIDLNode = {
      id: "sidebar",
      type: "Sidebar",
      testId: "sidebar",
      children: [
        { id: "sidebar-text", type: "Text", props: { value: "Nav item" } },
      ],
    };

    const { getByTestId, getByText } = render(<>{renderNode(node)}</>);
    const el = getByTestId("sidebar");
    expect(el.tagName).toBe("ASIDE");
    expect(el.className).toContain("flex");
    expect(el.className).toContain("flex-col");
    expect(getByText("Nav item")).toBeTruthy();
  });

  it("renders Navbar as a semantic <nav> with a sensible default layout", () => {
    const node: UIDLNode = {
      id: "navbar",
      type: "Navbar",
      testId: "navbar",
    };

    const { getByTestId } = render(<>{renderNode(node)}</>);
    const el = getByTestId("navbar");
    expect(el.tagName).toBe("NAV");
    expect(el.className).toContain("flex");
    expect(el.className).toContain("items-center");
  });

  it("renders Toolbar as a div with role=\"toolbar\" and a sensible default layout", () => {
    const node: UIDLNode = {
      id: "toolbar",
      type: "Toolbar",
      testId: "toolbar",
    };

    const { getByTestId } = render(<>{renderNode(node)}</>);
    const el = getByTestId("toolbar");
    expect(el.tagName).toBe("DIV");
    expect(el.getAttribute("role")).toBe("toolbar");
    expect(el.className).toContain("flex");
    expect(el.className).toContain("items-center");
    expect(el.className).toContain("gap-2");
  });

  it("lets JSON style override the hardcoded default layout (twMerge conflict resolution)", () => {
    const navbar: UIDLNode = {
      id: "navbar",
      type: "Navbar",
      testId: "navbar",
      style: { flexDirection: "column", alignItems: "start" },
    };
    const sidebar: UIDLNode = {
      id: "sidebar",
      type: "Sidebar",
      testId: "sidebar",
      style: { flexDirection: "row" },
    };

    const { getByTestId } = render(
      <>
        {renderNode(navbar)}
        {renderNode(sidebar)}
      </>,
    );

    const nav = getByTestId("navbar");
    expect(nav.className).toContain("flex-col");
    expect(nav.className).toContain("items-start");
    expect(nav.className).not.toContain("items-center");

    const aside = getByTestId("sidebar");
    expect(aside.className).toContain("flex-row");
    expect(aside.className).not.toContain("flex-col");
  });

  it("end to end: a fixed sidebar document renders with default + positioning classes in the DOM", () => {
    const document: UIDLDocument = {
      version: "1.0.0",
      id: "layout-page",
      name: "Layout Page",
      root: {
        id: "root",
        type: "Container",
        style: { minHeight: "min-h-screen" },
        children: [
          {
            id: "sidebar",
            type: "Sidebar",
            testId: "sidebar",
            style: {
              position: "fixed",
              top: "top-0",
              left: "left-0",
              bottom: "bottom-0",
              zIndex: 40,
              width: "w-64",
            },
            children: [
              { id: "sidebar-title", type: "Text", props: { value: "Menu" } },
            ],
          },
          {
            id: "navbar",
            type: "Navbar",
            testId: "navbar",
            style: { justifyContent: "space-between", padding: "px-4 py-2" },
            children: [
              { id: "brand", type: "Text", props: { value: "Brand" } },
            ],
          },
        ],
      },
    };

    const { getByTestId, getByText } = render(
      <>{renderUIDocument(document, { theme: defaultLightTheme })}</>,
    );

    const aside = getByTestId("sidebar");
    expect(aside.tagName).toBe("ASIDE");
    for (const expected of ["flex", "flex-col", "fixed", "top-0", "left-0", "bottom-0", "z-40", "w-64"]) {
      expect(aside.className).toContain(expected);
    }
    expect(getByText("Menu")).toBeTruthy();

    const nav = getByTestId("navbar");
    expect(nav.tagName).toBe("NAV");
    for (const expected of ["flex", "items-center", "justify-between", "px-4", "py-2"]) {
      expect(nav.className).toContain(expected);
    }
    expect(getByText("Brand")).toBeTruthy();
  });

  it("supports schema-defined RBAC navigation via session visibility and route actions", () => {
    const document: UIDLDocument = {
      version: "1.0.0",
      id: "rbac-nav",
      name: "RBAC Navigation",
      definitions: {
        navShell: {
          id: "nav-shell-template",
          type: "Container",
          style: { display: "flex", minHeight: "min-h-screen" },
          slots: { sidebar: [], main: [], drawer: [] },
        },
      },
      root: {
        id: "root",
        type: "Container",
        componentId: "navShell",
        slots: {
          sidebar: [
            {
              id: "sidebar",
              type: "Sidebar",
              children: [
                { id: "nav-home", type: "Button", props: { label: "Home" }, events: { onClick: [{ navigate: { route: "/home" } }] } },
                {
                  id: "nav-finance",
                  type: "Button",
                  props: { label: "Finance" },
                  visibility: { condition: { path: "session.permissions.finance" } },
                  events: { onClick: [{ navigate: { route: "/finance" } }] },
                },
                {
                  id: "nav-payroll",
                  type: "Button",
                  props: { label: "Payroll" },
                  visibility: { condition: { path: "session.permissions.payroll" } },
                  events: { onClick: [{ navigate: { route: "/payroll" } }] },
                },
              ],
            },
          ],
          main: [
            {
              id: "navbar",
              type: "Navbar",
              children: [
                { id: "user-label", type: "Text", props: { value: { "$expr": { path: "session.user.name" } } } },
              ],
            },
          ],
          drawer: [
            {
              id: "finance-drawer",
              type: "Drawer",
              props: { open: true, title: "Finance Drawer" },
              visibility: { condition: { path: "session.permissions.finance" } },
              children: [{ id: "drawer-copy", type: "Text", props: { value: "Finance-only quick actions" } }],
            },
          ],
        },
      },
    };

    const onRouteChange = vi.fn();
    const { getByText, queryByText } = render(<>{renderUIDocument(document, {
      theme: defaultLightTheme,
      session: {
        user: { id: "usr_1", name: "Finance Manager" },
        roles: ["Finance Manager"],
        permissions: { finance: true, payroll: false },
      },
      onRouteChange,
    })}</>);

    expect(getByText("Finance Manager")).toBeTruthy();
    expect(getByText("Finance")).toBeTruthy();
    expect(queryByText("Payroll")).toBeNull();
    expect(getByText("Finance Drawer")).toBeTruthy();
    expect(getByText("Finance-only quick actions")).toBeTruthy();

    fireEvent.click(getByText("Finance"));
    expect(onRouteChange).toHaveBeenCalledWith("/finance");
  });

  it("parses and renders the reusable RBAC navigation catalog example", () => {
    const document = DocumentSchema.parse(rbacNavigationDocument);
    const stateStore = createDocumentState({ overlays: { financeDrawer: true } }).getState();
    const { getAllByText, getByText, queryByText } = render(<>{renderUIDocument(document, {
      theme: defaultLightTheme,
      stateStore,
      session: {
        user: { name: "Finance Manager" },
        permissions: { finance: true, payroll: false },
      },
    })}</>);

    expect(getByText("Finance Manager")).toBeTruthy();
    expect(getAllByText("Finance").length).toBeGreaterThan(0);
    expect(queryByText("Payroll")).toBeNull();
    expect(getByText("Finance page content")).toBeTruthy();
    expect(getByText("Finance-only shortcuts")).toBeTruthy();
  });
});
