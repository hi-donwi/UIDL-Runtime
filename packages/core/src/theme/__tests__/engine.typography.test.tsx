import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { createThemeEngine } from "../engine";
import { defaultLightTheme } from "../presets";
import { renderNode } from "../../renderer/RenderNode";
import type { UIDLNode } from "../../types";

describe("style.typography token wiring", () => {
  const engine = createThemeEngine(defaultLightTheme);

  it("resolveStyleIntent applies the referenced typography token's literal classes", () => {
    const className = engine.resolveStyleIntent({
      typography: "{semantics.typography.headline-medium}",
    } as never);

    // headline-medium: fontSize "text-2xl", lineHeight "leading-snug", letterSpacing "tracking-tight"
    expect(className).toContain("text-2xl");
    expect(className).toContain("leading-snug");
    expect(className).toContain("tracking-tight");
  });

  it("resolveInlineStyle resolves the token's fontFamily (a token ref) to a CSS var, and always inlines fontWeight", () => {
    const style = engine.resolveInlineStyle({
      typography: "{semantics.typography.headline-medium}",
    } as never);

    expect(style.fontFamily).toBe("var(--font-sans)");
    expect(style.fontWeight).toBe("600");
  });

  it("resolveStyleIntent no longer emits a font-[value] class for typography-token fontWeight", () => {
    const className = engine.resolveStyleIntent({
      typography: "{semantics.typography.headline-medium}",
    } as never);
    expect(className).not.toContain("font-[");
  });

  it("an unknown typography token reference resolves to nothing, without throwing", () => {
    const className = engine.resolveStyleIntent({ typography: "{semantics.typography.nope}" } as never);
    const style = engine.resolveInlineStyle({ typography: "{semantics.typography.nope}" } as never);
    expect(className).toBe("");
    expect(style).toEqual({});
  });

  it("renders end to end: a Text node with style.typography gets both the class and the inline style", () => {
    const node: UIDLNode = {
      id: "heading",
      type: "Text",
      testId: "heading",
      props: { value: "Section title" },
      style: { typography: "{semantics.typography.headline-medium}" },
    };

    const { getByTestId } = render(<>{renderNode(node, { theme: defaultLightTheme })}</>);
    const el = getByTestId("heading");

    expect(el.className).toContain("text-2xl");
    expect(el).toHaveStyle({ fontFamily: "var(--font-sans)", fontWeight: "600" });
  });
});
