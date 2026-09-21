import { describe, it, expect } from "vitest";
import { createThemeEngine } from "../engine";
import { defaultLightTheme } from "../presets";

describe("ThemeEngine.resolveInlineStyle", () => {
  const engine = createThemeEngine(defaultLightTheme);

  it("resolves a primitive token reference to a CSS custom property", () => {
    const style = engine.resolveInlineStyle({ background: "{primitives.color.primary}" } as never);
    expect(style.backgroundColor).toBe("var(--color-primary)");
  });

  it("resolves multi-segment token paths (dashed primitive keys) correctly", () => {
    const style = engine.resolveInlineStyle({ color: "{primitives.color.text-inverse}" } as never);
    expect(style.color).toBe("var(--color-text-inverse)");
  });

  it("resolves border tokens too", () => {
    const style = engine.resolveInlineStyle({ borderWidth: "{primitives.border.width-thin}" } as never);
    expect(style.borderWidth).toBe("var(--border-width-thin)");
  });

  it("dash-joins extra path segments, so the dotted refs already used in presets.ts resolve", () => {
    // theme/presets.ts writes card/textfield variant borderWidth as "{primitives.border.width.thin}"
    // (dots), while the actual primitives.border key is "width-thin" (dash). Multi-segment paths
    // are joined with "-", so this still resolves correctly without needing to edit the preset data.
    const style = engine.resolveInlineStyle({ borderWidth: "{primitives.border.width.thin}" } as never);
    expect(style.borderWidth).toBe("var(--border-width-thin)");
  });

  it("always inlines fontWeight instead of producing a font-[value] class", () => {
    const style = engine.resolveInlineStyle({ fontWeight: 700 } as never);
    expect(style.fontWeight).toBe("700");
  });

  it("leaves non-token literal values out of the inline style", () => {
    const style = engine.resolveInlineStyle({ background: "bg-primary" } as never);
    expect(style.backgroundColor).toBeUndefined();
  });

  it("resolveStyleIntent no longer emits a class for token-referenced values", () => {
    const className = engine.resolveStyleIntent({ background: "{primitives.color.primary}" } as never);
    expect(className).not.toContain("{primitives");
    expect(className).toBe("");
  });

  it("resolveStyleIntent no longer emits a font-[value] class for fontWeight", () => {
    const className = engine.resolveStyleIntent({ fontWeight: 700 } as never);
    expect(className).not.toContain("font-[");
  });
});
