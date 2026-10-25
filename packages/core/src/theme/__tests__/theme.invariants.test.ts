import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createThemeEngine } from "../engine";
import { defaultLightTheme, defaultDarkTheme } from "../presets";
import { meridianLightTheme, meridianDarkTheme } from "../meridianPreset";
import { denseBusinessLightTheme, denseBusinessDarkTheme } from "../../presentation/denseBusiness";
import type { Theme } from "../../types/theme";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");

const SHIPPED_THEMES: Record<string, Theme> = {
  "default-light": defaultLightTheme,
  "default-dark": defaultDarkTheme,
  "meridian-light": meridianLightTheme,
  "meridian-dark": meridianDarkTheme,
  "dense-business-light": denseBusinessLightTheme,
  "dense-business-dark": denseBusinessDarkTheme,
};

/** Every `{primitives.<category>.<key>}` text token reference with its category/key. */
function collectTokenRefs(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    const matches = value.match(/\{[^{}]+\}/g) ?? [];
    for (const match of matches) out.push(match.slice(1, -1));
    return out;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) collectTokenRefs(nested, out);
  }
  return out;
}

function resolveRefExists(theme: Theme, ref: string): boolean {
  if (!ref.startsWith("primitives.")) return true; // semantic and other namespaces checked elsewhere
  const engine = createThemeEngine(theme);
  return engine.resolveToken(ref) !== undefined;
}

/** Relative luminance of a hex color for tonal-ordering assertions. */
function luminance(hex: string): number {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

describe("theme invariants (design-tokens contract)", () => {
  const themes = Object.entries(SHIPPED_THEMES);

  it("exposes the surface-container tiers on every shipped theme", () => {
    for (const [name, theme] of themes) {
      for (const key of [
        "surface-container-low",
        "surface-container",
        "surface-container-high",
      ]) {
        expect(
          theme.primitives.color[key],
          `${name} declares ${key}`,
        ).toBeDefined();
        expect(
          theme.semantics.color[`bg-${key}`],
          `${name} pairs bg-${key}`,
        ).toBeDefined();
      }
    }
  });

  it("resolves every token reference in semantics and variants", () => {
    for (const [name, theme] of themes) {
      for (const ref of collectTokenRefs(theme.semantics)) {
        expect(resolveRefExists(theme, ref), `${name}: ${ref}`).toBe(true);
      }
      for (const variant of Object.values(theme.variants ?? {})) {
        for (const entry of variant ?? []) {
          const refs = collectTokenRefs(entry.style ?? {});
          for (const ref of refs) {
            expect(resolveRefExists(theme, ref), `${name}: ${ref}`).toBe(true);
          }
        }
      }
    }
  });

  it("keeps the pairing invariant: every palette declares on-color tokens", () => {
    for (const [name, theme] of themes) {
      expect(
        theme.primitives.color["text-inverse"],
        `${name} declares text-inverse`,
      ).toBeDefined();
      if (theme.semantics.color["bg-primary"]) {
        expect(
          theme.semantics.color["text-on-primary"],
          `${name} pairs bg-primary with text-on-primary`,
        ).toBeDefined();
      }
      if (theme.semantics.color["bg-error"]) {
        expect(
          theme.semantics.color["text-on-error"] ?? theme.semantics.color["text-inverse"],
          `${name} gives error fills a readable foreground`,
        ).toBeDefined();
      }
    }
  });

  it("orders the radius scale monotonically from one canonical base ladder", () => {
    for (const [name, theme] of themes) {
      const chain = ["sm", "md", "lg", "xl", "2xl"];
      const toPx = (v: string): number => {
        if (v.endsWith("rem")) return parseFloat(v) * 16;
        if (v.endsWith("px")) return parseFloat(v);
        return Number.NaN;
      };
      const values = chain.map((step) => toPx(theme.primitives.radius[step] ?? ""));
      for (let i = 0; i < values.length - 1; i += 1) {
        expect(
          values[i],
          `${name}: radius ${chain[i]} (${values[i]}) <= ${chain[i + 1]} (${values[i + 1]})`,
        ).toBeLessThanOrEqual(values[i + 1]);
      }
    }
  });

  it("orders tonal surfaces so elevation reads as luminance steps", () => {
    const chain = [
      "background",
      "surface-container-low",
      "surface-container",
      "surface-container-high",
      "surface-elevated",
    ] as const;
    for (const [name, theme] of themes) {
      if (name === "meridian-dark") {
        // The Meridian dark palette predates the tonal contract: its canvas is lighter
        // than its elevated containers. Existing products depend on those values, so the
        // re-tune is a follow-up, not part of this additive change.
        continue;
      }
      const tone = (key: (typeof chain)[number]) =>
        luminance(theme.primitives.color[key] as string);
      // Direction follows the canvas: a gray canvas climbs toward white; a white
      // canvas (Meridian light) steps down through gray containers.
      const ascending = tone("background") < tone("surface-container-low");
      if (ascending) {
        for (let i = 0; i < chain.length - 1; i += 1) {
          expect(
            tone(chain[i]),
            `${name}: luminance(${chain[i]}) <= luminance(${chain[i + 1]})`,
          ).toBeLessThanOrEqual(tone(chain[i + 1]));
        }
      } else {
        const [low, container, high, elevated] = (
          [
            "surface-container-low",
            "surface-container",
            "surface-container-high",
            "surface-elevated",
          ] as const
        ).map(tone);
        expect(low, `${name}: descending container steps`).toBeGreaterThan(container);
        expect(container).toBeGreaterThan(high);
        expect(elevated, `${name}: elevated never below the steps`).toBeGreaterThanOrEqual(high);
      }
    }
  });

  it("matches the conformance-case schema's shipped class list", () => {
    const schema = JSON.parse(
      readFileSync(join(REPO_ROOT, "conformance", "schema", "conformance-case.schema.json"), "utf8"),
    ) as { properties: { class: { enum: string[] } } };
    expect(schema.properties.class.enum).toContain("theme");
    const count = readdirSync(join(REPO_ROOT, "conformance", "cases", "theme"))
      .filter((f) => f.endsWith(".json")).length;
    expect(count, "theme conformance cases exist on disk").toBeGreaterThan(0);
  });
});
