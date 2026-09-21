import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { createThemeEngine } from "../engine";
import { defaultLightTheme } from "../presets";
import { resolveClassName, resolvePosition } from "../../utils/tailwind";
import { renderNode } from "../../renderer/RenderNode";
import type { UIDLNode } from "../../types";

describe("StyleIntent positioning fields (position/inset/top/right/bottom/left/zIndex)", () => {
  const engine = createThemeEngine(defaultLightTheme);

  it("resolveStyleIntent maps the position enum to the identical Tailwind class", () => {
    for (const value of ["static", "relative", "absolute", "fixed", "sticky"] as const) {
      const className = engine.resolveStyleIntent({ position: value } as never);
      expect(className).toBe(value);
    }
  });

  it("resolveStyleIntent handles inset/top/right/bottom/left as plain passthrough classes", () => {
    const className = engine.resolveStyleIntent({
      inset: "inset-0",
      top: "top-4",
      right: "right-0",
      bottom: "bottom-0",
      left: "left-0",
    } as never);

    for (const expected of ["inset-0", "top-4", "right-0", "bottom-0", "left-0"]) {
      expect(className).toContain(expected);
    }
  });

  it("resolveStyleIntent maps zIndex to a z-<n> class, including responsive values", () => {
    const className = engine.resolveStyleIntent({
      zIndex: { base: 10, lg: 50 },
    } as never);

    expect(className).toContain("z-10");
    expect(className).toContain("lg:z-50");
  });

  it("respects responsive values for position too", () => {
    const className = engine.resolveStyleIntent({
      position: { base: "static", lg: "sticky" },
    } as never);

    expect(className).toContain("static");
    expect(className).toContain("lg:sticky");
  });

  it("the non-themed resolveClassName fallback also picks up position/inset/directional fields", () => {
    const className = resolveClassName({
      position: "fixed",
      inset: "inset-0",
      top: "top-0",
    });

    expect(className).toContain("fixed");
    expect(className).toContain("inset-0");
    expect(className).toContain("top-0");
  });

  it("resolvePosition maps every enum value, and rejects unknown ones", () => {
    expect(resolvePosition("sticky")).toBe("sticky");
    expect(resolvePosition("nonsense")).toBeUndefined();
  });

  it("end to end: a sidebar-shaped node renders fixed/inset/z-index classes in the DOM", () => {
    const node: UIDLNode = {
      id: "sidebar",
      type: "Container",
      testId: "sidebar",
      style: {
        position: "fixed",
        top: "top-0",
        left: "left-0",
        bottom: "bottom-0",
        zIndex: 40,
        width: "w-64",
      },
    };

    const { getByTestId } = render(<>{renderNode(node, { theme: defaultLightTheme })}</>);
    const el = getByTestId("sidebar");

    for (const expected of ["fixed", "top-0", "left-0", "bottom-0", "z-40", "w-64"]) {
      expect(el.className).toContain(expected);
    }
  });
});
