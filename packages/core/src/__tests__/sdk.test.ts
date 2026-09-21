import { describe, it, expect, vi } from "vitest";
import { createRegistry, defaultRegistry } from "../registry/registry";
import type { WidgetManifest } from "../types";
import { renderNode } from "../renderer/RenderNode";
import { renderUIDocument } from "../renderer/renderDocument";
import { createDocumentState } from "../state/createDocumentState";
import { ActionInterpreter } from "../actions/interpreter";
import { Snackbar, Dialog } from "../components/primitives";
import { DocumentSchema, DesignTokensSchema, ThemePresetsSchema } from "../schemas/document";
import { resolveClassName, resolveVisibility } from "../utils/tailwind";
import { flattenResponsive, normalizeNodeResponsive } from "../utils/responsive";
import {
  createThemeEngine,
  registerTheme,
  registerThemePreset,
  getTheme,
  getThemePreset,
  listThemes,
  listPresets,
  defaultLightTheme,
  defaultDarkTheme,
  defaultLightPreset,
  defaultDarkPreset,
  serializeTheme,
  serializeThemePreset,
  deserializeTheme,
  deserializeThemePreset,
} from "../theme";
import { themeToCssVariables, themeToTailwindV4, themeToTailwindV3 } from "../theme/tailwind";
import { ThemeSchema, StyleIntentSchema, TypographyTokenSchema } from "../schemas/theme";
import { validateResponsiveValue, validateResponsiveStyle } from "../validate/validateResponsive";

function makeManifest(overrides: Partial<WidgetManifest> = {}): WidgetManifest {
  const MockComponent = () => null;
  return {
    type: "TestWidget",
    component: MockComponent,
    category: "base",
    acceptsChildren: false,
    defaultProps: {},
    ...overrides,
  };
}

describe("registry", () => {
  it("get returns undefined for unknown type", () => {
    const registry = createRegistry();
    expect(registry.get("Unknown")).toBeUndefined();
  });

  it("register and get returns manifest", () => {
    const registry = createRegistry();
    const manifest = makeManifest({ type: "Custom" });
    registry.register(manifest);
    expect(registry.get("Custom")).toBe(manifest);
  });

  it("has returns true after register", () => {
    const registry = createRegistry();
    const manifest = makeManifest({ type: "Foo" });
    registry.register(manifest);
    expect(registry.has("Foo")).toBe(true);
  });

  it("list returns all registered widgets", () => {
    const registry = createRegistry();
    registry.register(makeManifest({ type: "A" }));
    registry.register(makeManifest({ type: "B" }));
    expect(registry.list().length).toBeGreaterThanOrEqual(2);
  });

  it("defaultRegistry contains built-in widgets", () => {
    expect(defaultRegistry.has("Container")).toBe(true);
    expect(defaultRegistry.has("Button")).toBe(true);
    expect(defaultRegistry.has("TextField")).toBe(true);
  });
});

describe("tailwind resolvers", () => {
  it("resolveClassName merges style props", () => {
    const classes = resolveClassName(
      { gap: "gap-4", padding: "p-2", flexDirection: "row" },
      {},
    );
    expect(classes).toContain("gap-4");
    expect(classes).toContain("p-2");
    expect(classes).toContain("flex-row");
  });

  it("resolveVisibility returns hidden class for missing mobile", () => {
    const vis = resolveVisibility({ breakpoints: ["tablet", "desktop"] });
    expect(vis).toBe("hidden md:block xl:hidden");
  });

  it("resolveVisibility returns undefined when no breakpoints specified", () => {
    const vis = resolveVisibility({});
    expect(vis).toBeUndefined();
  });

  it("resolveVisibility returns hidden classes for missing breakpoints", () => {
    const vis = resolveVisibility({ breakpoints: ["mobile"] });
    // Only the transition is emitted (hidden from md up) — no redundant lg:hidden/xl:hidden,
    // since nothing turns visibility back on after md.
    expect(vis).toBe("md:hidden");
  });

  it("resolveVisibility never emits contradictory classes at the same breakpoint", () => {
    // Regression test: the old implementation independently decided each category's classes,
    // which for breakpoints: ["desktop"] produced both "md:block" and "md:hidden" (from the
    // missing-tablet and missing-desktop checks respectively) — a contradiction whose winner
    // depended on unrelated CSS declaration order, and never actually re-showed the node at lg.
    const vis = resolveVisibility({ breakpoints: ["desktop"] });
    expect(vis).toBe("hidden lg:block xl:hidden");
  });

  it("resolveVisibility returns undefined when visible at every breakpoint", () => {
    const vis = resolveVisibility({ breakpoints: ["mobile", "tablet", "desktop", "wide"] });
    expect(vis).toBeUndefined();
  });
});

describe("responsive flattening", () => {
  it("flattens breakpoint overrides into prefixed classes", () => {
    const result = flattenResponsive({
      padding: { base: "p-4", lg: "p-8" },
      flexDirection: { base: "flex-col", md: "flex-row" },
    });
    expect(result).toContain("p-4");
    expect(result).toContain("lg:p-8");
    expect(result).toContain("flex-col");
    expect(result).toContain("md:flex-row");
  });
});

describe("schemas", () => {
  it("DocumentSchema parses valid document", () => {
    const doc = {
      version: "1.0.0",
      id: "test",
      name: "Test",
      root: {
        id: "root",
        type: "Container",
      },
    };
    const result = DocumentSchema.safeParse(doc);
    expect(result.success).toBe(true);
  });

  it("DocumentSchema rejects missing required fields", () => {
    const result = DocumentSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("DesignTokensSchema parses valid tokens", () => {
    const tokens = {
      color: { primary: "#4B39EF" },
      spacing: { md: "1rem" },
    };
    const result = DesignTokensSchema.safeParse(tokens);
    expect(result.success).toBe(true);
  });
});

describe("renderer", () => {
  it("renders known node type", () => {
    const node = {
      id: "1",
      type: "Text",
      props: { value: "Hello" },
    };
    const result = renderNode(node);
    expect(result).not.toBeNull();
  });

  it("returns null for unknown node type and warns", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const node = { id: "1", type: "UnknownWidget" };
    const result = renderNode(node);
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("renders repeat with array data source", () => {
    const node = {
      id: "list",
      type: "Column",
      repeat: {
        dataSource: ["a", "b", "c"],
        itemName: "letter",
      },
      children: [
        {
          id: "item",
          type: "Text",
          props: { value: { $bind: "local.letter" } },
        },
      ],
    };
    const result = renderNode(node);
    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(true);
    expect((result as React.ReactElement[]).length).toBe(3);
  });
});

describe("theme engine", () => {
  it("resolves primitive token by path", () => {
    const engine = createThemeEngine(defaultLightTheme);
    expect(engine.resolveToken("primitives.color.primary")).toBe("#4B39EF");
    expect(engine.resolveToken("primitives.spacing.4")).toBe("1rem");
    expect(engine.resolveToken("primitives.radius.lg")).toBe("0.5rem");
  });

  it("resolves semantic token by path", () => {
    const engine = createThemeEngine(defaultLightTheme);
    expect(engine.resolveToken("semantics.color.bg-primary")).toBe("{primitives.color.primary}");
    expect(engine.resolveToken("semantics.spacing.md")).toBe("{primitives.spacing.4}");
  });

  it("returns undefined for unknown token path", () => {
    const engine = createThemeEngine(defaultLightTheme);
    expect(engine.resolveToken("primitives.color.nonexistent")).toBeUndefined();
    expect(engine.resolveToken("semantics.unknown.key")).toBeUndefined();
  });

  it("resolves style intent to className", () => {
    const engine = createThemeEngine(defaultLightTheme);
    const style = {
      display: "flex",
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      padding: "p-4",
      background: "bg-primary",
    };
    const className = engine.resolveStyleIntent(style);
    expect(className).toContain("flex");
    expect(className).toContain("flex-row");
    expect(className).toContain("justify-between");
    expect(className).toContain("p-4");
    expect(className).toContain("bg-primary");
  });

  it("resolves responsive style intent via resolveStyleIntent", () => {
    const engine = createThemeEngine(defaultLightTheme);
    const style = {
      padding: { base: "p-4", lg: "p-8" },
    };
    const className = engine.resolveStyleIntent(style as never);
    expect(className).toContain("p-4");
    expect(className).toContain("lg:p-8");
  });

  it("resolves component variant", () => {
    const engine = createThemeEngine(defaultLightTheme);
    const variant = engine.resolveComponentVariant("Button", "primary");
    expect(variant).toBeDefined();
    expect(variant?.name).toBe("primary");
  });

  it("returns undefined for unknown component variant", () => {
    const engine = createThemeEngine(defaultLightTheme);
    expect(engine.resolveComponentVariant("Button", "nonexistent")).toBeUndefined();
  });

  it("resolves typography token", () => {
    const engine = createThemeEngine(defaultLightTheme);
    const token = defaultLightTheme.semantics.typography["headline-medium"];
    const className = engine.resolveTypography(token);
    expect(className).toContain("text-2xl");
    // fontWeight is never emitted as a `font-[value]` class (unbounded, unsafelistable) —
    // see src/theme/__tests__/engine.typography.test.tsx for its resolveInlineStyle coverage.
    expect(className).not.toContain("font-[");
  });
});

describe("theme registry", () => {
  it("registerTheme and getTheme returns theme", () => {
    registerTheme(defaultLightTheme);
    expect(getTheme("theme-light")).toBeDefined();
    expect(getTheme("theme-light")?.name).toBe("Light");
  });

  it("registerThemePreset and getThemePreset returns preset", () => {
    registerThemePreset(defaultLightPreset);
    expect(getThemePreset("preset-light")).toBeDefined();
    expect(getThemePreset("preset-light")?.theme.mode).toBe("light");
  });

  it("listThemes returns registered themes", () => {
    registerTheme(defaultDarkTheme);
    const themes = listThemes();
    expect(themes.length).toBeGreaterThanOrEqual(2);
  });

  it("listPresets returns registered presets", () => {
    registerThemePreset(defaultDarkPreset);
    const presets = listPresets();
    expect(presets.length).toBeGreaterThanOrEqual(2);
  });
});

describe("theme tailwind generators", () => {
  it("themeToCssVariables generates CSS variables", () => {
    const css = themeToCssVariables(defaultLightTheme);
    expect(css).toContain("--color-primary");
    expect(css).toContain(":root");
  });

  it("themeToTailwindV4 generates @theme block", () => {
    const css = themeToTailwindV4(defaultLightTheme);
    expect(css).toContain("@import \"tailwindcss\"");
    expect(css).toContain("@theme");
    expect(css).toContain("--color-primary");
  });

  it("themeToTailwindV3 generates extend object", () => {
    const config = themeToTailwindV3(defaultLightTheme);
    expect(config).toHaveProperty("extend");
    expect((config as Record<string, unknown>).extend).toHaveProperty("colors");
  });
});

describe("schemas", () => {
  it("ThemeSchema parses valid theme", () => {
    const result = ThemeSchema.safeParse(defaultLightTheme);
    expect(result.success).toBe(true);
  });

  it("StyleIntentSchema parses valid style intent", () => {
    const result = StyleIntentSchema.safeParse({
      display: "flex",
      padding: "p-4",
      flexDirection: "row",
    });
    expect(result.success).toBe(true);
  });

  it("TypographyTokenSchema parses valid typography token", () => {
    const result = TypographyTokenSchema.safeParse({
      fontFamily: "Inter",
      fontSize: "text-2xl",
      fontWeight: 600,
    });
    expect(result.success).toBe(true);
  });

  it("ThemePresetsSchema parses valid presets array", () => {
    const result = ThemePresetsSchema.safeParse([defaultLightPreset, defaultDarkPreset]);
    expect(result.success).toBe(true);
  });
});

describe("theme serialization", () => {
  it("serializes and deserializes theme round-trip", () => {
    const json = serializeTheme(defaultLightTheme);
    const parsed = deserializeTheme(json);
    expect(parsed.id).toBe(defaultLightTheme.id);
    expect(parsed.primitives.color.primary).toBe("#4B39EF");
  });

  it("serializes and deserializes preset round-trip", () => {
    const json = serializeThemePreset(defaultLightPreset);
    const parsed = deserializeThemePreset(json);
    expect(parsed.id).toBe(defaultLightPreset.id);
    expect(parsed.theme.mode).toBe("light");
  });
});

describe("renderer with theme", () => {
  it("renders node with theme applied", () => {
    const node = {
      id: "1",
      type: "Text",
      props: { value: "Hello" },
      style: { color: "text-primary" },
    };
    const result = renderNode(node, { theme: defaultLightTheme });
    expect(result).not.toBeNull();
  });

  it("renders node with themeRef variant", () => {
    const node = {
      id: "1",
      type: "Button",
      props: { label: "Click" },
      themeRef: "primary",
    };
    const result = renderNode(node, { theme: defaultLightTheme });
    expect(result).not.toBeNull();
  });

  it("renderUIDocument passes theme to root node", () => {
    const doc = {
      version: "1.0.0",
      id: "doc",
      name: "Doc",
      root: {
        id: "root",
        type: "Text",
        props: { value: "Themed" },
      },
    };
    const result = renderUIDocument(doc, { theme: defaultDarkTheme });
    expect(result).not.toBeNull();
  });
});

describe("Responsive values", () => {
  it("resolves primitive style value", () => {
    const engine = createThemeEngine(defaultLightTheme);
    const className = engine.resolveStyleIntent({ padding: "p-4" });
    expect(className).toBe("p-4");
  });

  it("resolves responsive style value with base only", () => {
    const engine = createThemeEngine(defaultLightTheme);
    const className = engine.resolveStyleIntent({ padding: { base: "p-4" } });
    expect(className).toBe("p-4");
  });

  it("resolves responsive style value with multiple breakpoints", () => {
    const engine = createThemeEngine(defaultLightTheme);
    const className = engine.resolveStyleIntent({
      padding: { base: "p-4", md: "p-6", lg: "p-8" },
    });
    expect(className).toBe("p-4 md:p-6 lg:p-8");
  });

  it("resolves responsive style value with missing base", () => {
    const engine = createThemeEngine(defaultLightTheme);
    const className = engine.resolveStyleIntent({
      padding: { md: "p-6", lg: "p-8" },
    });
    expect(className).toBe("md:p-6 lg:p-8");
  });

  it("resolves token references inside responsive values", () => {
    const engine = createThemeEngine(defaultLightTheme);
    const className = engine.resolveStyleIntent({
      padding: { base: "spacing.md", lg: "spacing.xl" },
    });
    expect(className).toBe("spacing.md lg:spacing.xl");
  });

  it("resolves mixed primitive and responsive properties", () => {
    const engine = createThemeEngine(defaultLightTheme);
    const className = engine.resolveStyleIntent({
      display: "flex",
      padding: { base: "p-4", lg: "p-8" },
      gap: "gap-2",
    });
    expect(className).toContain("flex");
    expect(className).toContain("p-4");
    expect(className).toContain("lg:p-8");
    expect(className).toContain("gap-2");
  });

  it("normalizeNodeResponsive merges legacy responsive into style", () => {
    const node = {
      id: "1",
      type: "Container",
      style: { padding: "p-4" },
      responsive: { padding: { lg: "p-8" } },
    };
    const normalized = normalizeNodeResponsive(node);
    expect(normalized.responsive).toBeUndefined();
    expect(normalized.style).toEqual({ padding: { base: "p-4", lg: "p-8" } });
  });

  it("normalizeNodeResponsive merges when style is already responsive", () => {
    const node = {
      id: "1",
      type: "Container",
      style: { padding: { base: "p-4", md: "p-6" } },
      responsive: { padding: { lg: "p-8" } },
    };
    const normalized = normalizeNodeResponsive(node);
    expect(normalized.style).toEqual({ padding: { base: "p-4", md: "p-6", lg: "p-8" } });
  });

  it("normalizeNodeResponsive handles responsive base override", () => {
    const node = {
      id: "1",
      type: "Container",
      style: { padding: "p-4" },
      responsive: { padding: { base: "p-6", lg: "p-8" } },
    };
    const normalized = normalizeNodeResponsive(node);
    expect(normalized.style).toEqual({ padding: { base: "p-6", lg: "p-8" } });
  });

  it("normalizeNodeResponsive leaves node unchanged when no responsive", () => {
    const node = {
      id: "1",
      type: "Container",
      style: { padding: "p-4" },
    };
    const normalized = normalizeNodeResponsive(node);
    expect(normalized).toBe(node);
  });

  it("renderer outputs responsive classes from embedded style", () => {
    const node = {
      id: "1",
      type: "Container",
      style: { padding: { base: "p-4", lg: "p-8" } },
      children: [
        {
          id: "2",
          type: "Text",
          props: { value: "Hello" },
        },
      ],
    };
    const result = renderNode(node, { theme: defaultLightTheme });
    expect(result).not.toBeNull();
  });

  it("renderer renders legacy node.responsive by normalizing it", () => {
    const node = {
      id: "1",
      type: "Column",
      responsive: { padding: { md: "p-6" } },
      children: [
        {
          id: "2",
          type: "Text",
          props: { value: "Legacy" },
        },
      ],
    };
    const result = renderNode(node, { theme: defaultLightTheme });
    expect(result).not.toBeNull();
  });

  it("validateResponsiveValue detects unknown breakpoint", () => {
    const errors = validateResponsiveValue({ unknown: "p-4" }, defaultLightTheme);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].path).toBe("unknown");
  });

  it("validateResponsiveValue passes for valid breakpoints", () => {
    const errors = validateResponsiveValue({ md: "p-4" }, defaultLightTheme);
    expect(errors).toHaveLength(0);
  });

  it("validateResponsiveStyle detects errors in style object", () => {
    const errors = validateResponsiveStyle(
      { padding: { unknown: "p-4" } },
      defaultLightTheme,
    );
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });

  it("ThemeSchema requires breakpoints", () => {
    const result = ThemeSchema.safeParse({
      ...defaultLightTheme,
      breakpoints: undefined,
    } as never);
    expect(result.success).toBe(false);
  });

  it("theme serialization preserves breakpoints", () => {
    const json = serializeTheme(defaultLightTheme);
    const parsed = deserializeTheme(json);
    expect(parsed.breakpoints).toEqual(defaultLightTheme.breakpoints);
  });

  it("resolveStyleIntent handles responsive enum values", () => {
    const engine = createThemeEngine(defaultLightTheme);
    const className = engine.resolveStyleIntent({
      flexDirection: { base: "column", md: "row" },
    });
    expect(className).toBe("flex-col md:flex-row");
  });

  it("resolveStyleIntent handles responsive number values", () => {
    const engine = createThemeEngine(defaultLightTheme);
    const className = engine.resolveStyleIntent({
      opacity: { base: 0.5, md: 1 },
    });
    expect(className).toBe("opacity-0.5 md:opacity-1");
  });
});

describe("State and binding", () => {
  it("resolveBinding resolves state.* path", () => {
    const node = {
      id: "1",
      type: "Text",
      props: { value: { $bind: "state.count" } },
    };
    const result = renderNode(node, { state: { count: 7 } });
    expect(result).not.toBeNull();
  });

  it("resolveBinding resolves route.* path", () => {
    const node = {
      id: "1",
      type: "Text",
      props: { value: { $bind: "route.id" } },
    };
    const result = renderNode(node, { route: { id: "99" } });
    expect(result).not.toBeNull();
  });

  it("resolveBinding resolves data.* path", () => {
    const node = {
      id: "1",
      type: "Text",
      props: { value: { $bind: "data.items" } },
    };
    const result = renderNode(node, { data: { items: [1, 2, 3] } });
    expect(result).not.toBeNull();
  });

  it("resolveBinding returns undefined for unknown prefix", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const node = {
      id: "1",
      type: "Text",
      props: { value: { $bind: "props.foo" } },
    };
    const result = renderNode(node, {});
    expect(result).not.toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("resolveProps evaluates $expr", () => {
    const node = {
      id: "1",
      type: "Text",
      props: { value: { $expr: { literal: "hello" } } },
    };
    const result = renderNode(node);
    expect(result).not.toBeNull();
  });

  it("resolveProps evaluates $expr with path", () => {
    const node = {
      id: "1",
      type: "Text",
      props: { value: { $expr: { path: "state.greeting" } } },
    };
    const result = renderNode(node, { state: { greeting: "hi" } });
    expect(result).not.toBeNull();
  });

  it("resolveVisibility hides node when condition is falsy", () => {
    const node = {
      id: "1",
      type: "Text",
      props: { value: "hidden" },
      visibility: { condition: { "==": [{ path: "state.show" }, false] } },
    };
    const result = renderNode(node, { state: { show: true } });
    expect(result).toBeNull();
  });

  it("resolveVisibility renders node when condition is truthy", () => {
    const node = {
      id: "1",
      type: "Text",
      props: { value: "visible" },
      visibility: { condition: { "==": [{ path: "state.show" }, true] } },
    };
    const result = renderNode(node, { state: { show: true } });
    expect(result).not.toBeNull();
  });

  it("renderNode renders when visibility is absent", () => {
    const node = {
      id: "1",
      type: "Text",
      props: { value: "always" },
    };
    const result = renderNode(node);
    expect(result).not.toBeNull();
  });

  it("renderUIDocument passes stateStore option to renderer", () => {
    const store = createDocumentState({ count: 3 });
    const doc = {
      version: "1.0.0",
      id: "doc",
      name: "Doc",
      root: {
        id: "root",
        type: "Text",
        props: { value: { $bind: "state.count" } },
      },
    };
    const result = renderUIDocument(doc, { stateStore: store.getState() });
    expect(result).not.toBeNull();
  });

  it("renderUIDocument passes inline dataSources", () => {
    const doc = {
      version: "1.0.0",
      id: "doc",
      name: "Doc",
      root: {
        id: "list",
        type: "Column",
        repeat: {
          dataSource: "items",
          itemName: "item",
        },
        children: [
          {
            id: "item-text",
            type: "Text",
            props: { value: { $bind: "local.item" } },
          },
        ],
      },
      dataSources: {
        items: ["a", "b", "c"],
      },
    };
    const result = renderUIDocument(doc, { dataSources: doc.dataSources });
    expect(result).not.toBeNull();
  });

  it("renderNode repeat resolves data source by name", () => {
    const node = {
      id: "list",
      type: "Column",
      repeat: {
        dataSource: "letters",
        itemName: "letter",
      },
      children: [
        {
          id: "item",
          type: "Text",
          props: { value: { $bind: "local.letter" } },
        },
      ],
    };
    const result = renderNode(node, { data: { letters: ["x", "y"] } });
    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(true);
    expect((result as React.ReactElement[]).length).toBe(2);
  });
});

describe("Actions and forms", () => {
  it("renderNode attaches event handlers when interpreter is provided", () => {
    const node = {
      id: "1",
      type: "Button",
      props: { label: "Click" },
      events: {
        onClick: [
          {
            setState: { path: "state.clicked", value: true },
          },
        ],
      },
    };
    const result = renderNode(node, {
      state: {},
      actionInterpreter: new ActionInterpreter({
        stateStore: createDocumentState().getState(),
      }),
    });
    expect(result).not.toBeNull();
  });

  it("renderNode does not attach handlers when interpreter is missing", () => {
    const node = {
      id: "1",
      type: "Button",
      props: { label: "Click" },
      events: {
        onClick: [
          {
            setState: { path: "state.clicked", value: true },
          },
        ],
      },
    };
    const result = renderNode(node, {});
    expect(result).not.toBeNull();
  });

  it("renderUIDocument calls onRouteChange on navigate action", () => {
    const onRouteChange = vi.fn();
    const doc = {
      version: "1.0.0",
      id: "doc",
      name: "Doc",
      root: {
        id: "root",
        type: "Button",
        props: { label: "Go" },
        events: {
          onClick: [
            {
              navigate: { route: "/next" },
            },
          ],
        },
      },
    };
    const result = renderUIDocument(doc, {
      onRouteChange,
    });
    expect(result).not.toBeNull();
  });

  it("Snackbar is importable", () => {
    expect(Snackbar).toBeDefined();
  });

  it("Dialog is importable", () => {
    expect(Dialog).toBeDefined();
  });
});
