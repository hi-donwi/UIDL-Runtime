import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { createThemeEngine } from "../engine";
import { defaultLightTheme } from "../presets";
import { resolveClassName } from "../../utils/tailwind";
import { renderUIDocument } from "../../renderer/renderDocument";
import { sampleDocument } from "../../../../../packages/templates/src/sample-document";

describe("StyleIntent whitelist coverage (minHeight/marginBottom/etc)", () => {
  const engine = createThemeEngine(defaultLightTheme);

  it("resolveStyleIntent no longer drops minHeight and marginBottom", () => {
    const className = engine.resolveStyleIntent({
      minHeight: "min-h-screen",
      marginBottom: "mb-8",
    } as never);

    expect(className).toContain("min-h-screen");
    expect(className).toContain("mb-8");
  });

  it("resolveStyleIntent handles the full set of directional padding/margin and min/max size fields", () => {
    const className = engine.resolveStyleIntent({
      paddingTop: "pt-1",
      paddingRight: "pr-2",
      paddingBottom: "pb-3",
      paddingLeft: "pl-4",
      marginTop: "mt-1",
      marginRight: "mr-2",
      marginLeft: "ml-4",
      minWidth: "min-w-0",
      maxWidth: "max-w-4xl",
      maxHeight: "max-h-screen",
    } as never);

    for (const expected of [
      "pt-1", "pr-2", "pb-3", "pl-4",
      "mt-1", "mr-2", "ml-4",
      "min-w-0", "max-w-4xl", "max-h-screen",
    ]) {
      expect(className).toContain(expected);
    }
  });

  it("respects responsive values for the new fields too", () => {
    const className = engine.resolveStyleIntent({
      minHeight: { base: "min-h-0", lg: "min-h-screen" },
    } as never);

    expect(className).toContain("min-h-0");
    expect(className).toContain("lg:min-h-screen");
  });

  it("the non-themed resolveClassName fallback also picks up the new fields", () => {
    const className = resolveClassName({ minHeight: "min-h-screen", marginBottom: "mb-8" });
    expect(className).toContain("min-h-screen");
    expect(className).toContain("mb-8");
  });

  it("resolveStyleIntent no longer drops lineHeight and letterSpacing", () => {
    // Found while checking the demo document: card-1-text sets lineHeight: "leading-relaxed"
    // directly (not via a typography token), and StyleIntent never had a `lineHeight` field at
    // all — same class of gap as minHeight/marginBottom above, just not caught in that round.
    const className = engine.resolveStyleIntent({
      lineHeight: "leading-relaxed",
      letterSpacing: "tracking-tight",
    } as never);

    expect(className).toContain("leading-relaxed");
    expect(className).toContain("tracking-tight");
  });

  it("the project's own sample document renders minHeight/marginBottom correctly end to end", () => {
    const { container } = render(<>{renderUIDocument(sampleDocument, { theme: defaultLightTheme })}</>);

    const root = container.querySelector('[data-node-id="root"]');
    const header = container.querySelector('[data-node-id="header"]');

    expect(root?.className).toContain("min-h-screen");
    expect(header?.className).toContain("mb-8");
  });

  it("the project's own sample document resolves color/background/radius tokens to the DOCUMENT theme, not literal Tailwind classes that happen to collide with app chrome tokens", () => {
    // Regression test: sample-document.ts used to write color: "text-primary" / "text-secondary"
    // and background: "bg-background" / "bg-surface" as bare literal strings. Those aren't
    // real Tailwind utilities on their own — they only "worked" by accident because the Editor
    // chrome's own @theme (apps/reference/src/style.css) happens to define CSS variables with the
    // same names, so the text silently inherited the chrome's color instead of the document's.
    // Token references ("{primitives.color.text-primary}") resolve via resolveInlineStyle to
    // the DOCUMENT theme's own CSS variables regardless of what the chrome defines.
    const { container } = render(<>{renderUIDocument(sampleDocument, { theme: defaultLightTheme })}</>);

    const title = container.querySelector('[data-node-id="title"]') as HTMLElement;
    const subtitle = container.querySelector('[data-node-id="subtitle"]') as HTMLElement;
    const card = container.querySelector('[data-node-id="card-1"]') as HTMLElement;

    expect(title.style.color).toBe("var(--color-text-primary)");
    expect(subtitle.style.color).toBe("var(--color-text-secondary)");
    // Title and subtitle must resolve to genuinely different CSS variables, not the same one.
    expect(title.style.color).not.toBe(subtitle.style.color);

    expect(card.style.backgroundColor).toBe("var(--color-surface)");
    expect(card.style.borderRadius).toBe("var(--radius-lg)");
  });
});
