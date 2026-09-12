import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { renderNode } from "../RenderNode";
import type { UIDLNode } from "../../types";

describe("visibility.breakpoints wiring (RenderNode)", () => {
  it("applies the resolved breakpoint-visibility classes to the rendered element", () => {
    const node: UIDLNode = {
      id: "sidebar",
      type: "Container",
      testId: "sidebar",
      visibility: { breakpoints: ["desktop"] },
    };

    const { getByTestId } = render(<>{renderNode(node)}</>);
    const el = getByTestId("sidebar");

    expect(el.className).toContain("hidden");
    expect(el.className).toContain("lg:block");
    expect(el.className).toContain("xl:hidden");
  });

  it("does not add any visibility class when visible at every breakpoint", () => {
    const node: UIDLNode = {
      id: "always",
      type: "Container",
      testId: "always",
      visibility: { breakpoints: ["mobile", "tablet", "desktop", "wide"] },
    };

    const { getByTestId } = render(<>{renderNode(node)}</>);
    expect(getByTestId("always").className).toBe("");
  });

  it("condition-based visibility (removes from DOM) still works independently of breakpoint visibility", () => {
    const node: UIDLNode = {
      id: "conditional",
      type: "Container",
      testId: "conditional",
      visibility: { condition: { literal: false } },
    };

    const { queryByTestId } = render(<>{renderNode(node)}</>);
    expect(queryByTestId("conditional")).not.toBeInTheDocument();
  });
});
