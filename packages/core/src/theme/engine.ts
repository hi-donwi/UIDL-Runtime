import type { Theme, StyleIntent, ComponentVariant, TypographyToken, ResponsiveValue } from "../types/theme";

export interface ThemeEngine {
  resolveToken(path: string): unknown;
  resolveStyleIntent(style: StyleIntent): string;
  resolveInlineStyle(style: StyleIntent): Record<string, string>;
  resolveComponentVariant(type: string, variantName: string): ComponentVariant | undefined;
  resolveTypography(token: TypographyToken): string;
}

const CSS_VAR_CATEGORIES = new Set(["color", "spacing", "radius", "shadow", "font", "border"]);

/** Style fields that just pass their (responsive) value straight through as a Tailwind class. */
const PASSTHROUGH_STYLE_FIELDS = [
  "gap",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "inset",
  "top",
  "right",
  "bottom",
  "left",
  "background",
  "color",
  "fontSize",
  "lineHeight",
  "letterSpacing",
  "borderRadius",
  "borderWidth",
  "borderColor",
  "shadow",
] as const satisfies readonly (keyof StyleIntent)[];

function isTokenRef(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("{") && value.endsWith("}");
}

/** Turns a `{primitives.color.primary}` token reference into `var(--color-primary)`. */
function tokenRefToCssVar(ref: string): string | undefined {
  const path = ref.slice(1, -1);
  const parts = path.split(".");
  if (parts[0] !== "primitives" || parts.length < 3) return undefined;

  const category = parts[1];
  const key = parts.slice(2).join("-");
  if (!CSS_VAR_CATEGORIES.has(category)) return undefined;

  return `var(--${category}-${key})`;
}

function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

function isResponsiveValue(value: unknown): value is ResponsiveValue<unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function createThemeEngine(theme: Theme): ThemeEngine {
  const primitiveColorMap = new Map(
    Object.entries(theme.primitives.color).map(([key, value]) => [key, value]),
  );
  const primitiveSpacingMap = new Map(
    Object.entries(theme.primitives.spacing).map(([key, value]) => [key, value]),
  );
  const primitiveRadiusMap = new Map(
    Object.entries(theme.primitives.radius).map(([key, value]) => [key, value]),
  );
  const primitiveShadowMap = new Map(
    Object.entries(theme.primitives.shadow).map(([key, value]) => [key, value]),
  );
  const primitiveFontMap = new Map(
    Object.entries(theme.primitives.font).map(([key, value]) => [key, value]),
  );
  const primitiveBorderMap = new Map(
    Object.entries(theme.primitives.border).map(([key, value]) => [key, value]),
  );

  const semanticColorMap = new Map(
    Object.entries(theme.semantics.color).map(([key, value]) => [key, value]),
  );
  const semanticSpacingMap = new Map(
    Object.entries(theme.semantics.spacing).map(([key, value]) => [key, value]),
  );
  const semanticRadiusMap = new Map(
    Object.entries(theme.semantics.radius).map(([key, value]) => [key, value]),
  );
  const semanticShadowMap = new Map(
    Object.entries(theme.semantics.shadow).map(([key, value]) => [key, value]),
  );

  function resolveToken(path: string): unknown {
    if (path.startsWith("primitives.")) {
      const rest = path.slice("primitives.".length);
      const [category, key] = rest.split(".");
      switch (category) {
        case "color":
          return primitiveColorMap.get(key);
        case "spacing":
          return primitiveSpacingMap.get(key);
        case "radius":
          return primitiveRadiusMap.get(key);
        case "shadow":
          return primitiveShadowMap.get(key);
        case "font":
          return primitiveFontMap.get(key);
        case "border":
          return primitiveBorderMap.get(key);
        default:
          return undefined;
      }
    }

    if (path.startsWith("semantics.")) {
      const rest = path.slice("semantics.".length);
      const [category, key] = rest.split(".");
      switch (category) {
        case "color":
          return semanticColorMap.get(key);
        case "spacing":
          return semanticSpacingMap.get(key);
        case "radius":
          return semanticRadiusMap.get(key);
        case "shadow":
          return semanticShadowMap.get(key);
        case "typography":
          return theme.semantics.typography[key];
        default:
          return undefined;
      }
    }

    return getValueByPath(
      {
        primitives: theme.primitives,
        semantics: theme.semantics,
      } as Record<string, unknown>,
      path,
    );
  }

  function resolveValue(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    // Token references (e.g. "{primitives.color.primary}") resolve to CSS custom
    // properties via resolveInlineStyle, not Tailwind classes — never emit them here.
    if (isTokenRef(value)) return undefined;
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return undefined;
  }

  function resolveStyleIntent(style: StyleIntent): string {
    const classes: string[] = [];

    if (style.display) {
      classes.push(...resolveResponsive(style.display));
    }
    if (style.flexDirection) {
      classes.push(...resolveResponsiveEnum(style.flexDirection, {
        row: "flex-row",
        "row-reverse": "flex-row-reverse",
        column: "flex-col",
        "column-reverse": "flex-col-reverse",
      }));
    }
    if (style.justifyContent) {
      classes.push(...resolveResponsiveEnum(style.justifyContent, {
        start: "justify-start",
        center: "justify-center",
        end: "justify-end",
        "space-between": "justify-between",
        "space-around": "justify-around",
        "space-evenly": "justify-evenly",
      }));
    }
    if (style.alignItems) {
      classes.push(...resolveResponsiveEnum(style.alignItems, {
        start: "items-start",
        center: "items-center",
        end: "items-end",
        stretch: "items-stretch",
        baseline: "items-baseline",
      }));
    }
    if (style.position) {
      classes.push(...resolveResponsiveEnum(style.position, {
        static: "static",
        relative: "relative",
        absolute: "absolute",
        fixed: "fixed",
        sticky: "sticky",
      }));
    }
    for (const field of PASSTHROUGH_STYLE_FIELDS) {
      const value = style[field];
      if (value) classes.push(...resolveResponsive(value).filter(Boolean));
    }
    if (style.opacity !== undefined) {
      classes.push(...resolveResponsiveSuffix(style.opacity, "opacity-").filter(Boolean));
    }
    if (style.zIndex !== undefined) {
      classes.push(...resolveResponsiveSuffix(style.zIndex, "z-").filter(Boolean));
    }
    if (style.typography) {
      const token = resolveTypographyToken(style.typography);
      if (token) classes.push(resolveTypography(token));
    }

    return classes.join(" ");
  }

  const INLINE_STYLE_PROPERTIES: Record<string, string> = {
    background: "backgroundColor",
    color: "color",
    borderColor: "borderColor",
    borderRadius: "borderRadius",
    borderWidth: "borderWidth",
    shadow: "boxShadow",
  };

  /**
   * Token-referenced values (e.g. "{primitives.color.primary}") can't become responsive
   * Tailwind classes — they're resolved to CSS custom properties (`var(--color-primary)`)
   * and applied as inline styles instead, so consumers never need Tailwind's static scanner
   * to see a runtime-built class name. Numeric fontWeight is always inlined too, since it's
   * effectively unbounded and can't be safelisted as a Tailwind class.
   */
  function resolveInlineStyle(style: StyleIntent): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [field, cssProperty] of Object.entries(INLINE_STYLE_PROPERTIES)) {
      const raw = (style as Record<string, unknown>)[field];
      const value = isResponsiveValue(raw) ? (raw as Record<string, unknown>).base : raw;
      if (isTokenRef(value)) {
        const cssVar = tokenRefToCssVar(value);
        if (cssVar) result[cssProperty] = cssVar;
      }
    }

    if (style.fontWeight !== undefined) {
      const raw = isResponsiveValue(style.fontWeight)
        ? (style.fontWeight as Record<string, unknown>).base
        : style.fontWeight;
      if (raw !== undefined) {
        result.fontWeight = isTokenRef(raw) ? (tokenRefToCssVar(raw) ?? String(raw)) : String(raw);
      }
    }

    if (style.typography) {
      const token = resolveTypographyToken(style.typography);
      if (token) Object.assign(result, resolveTypographyInlineStyle(token));
    }

    return result;
  }

  function resolveResponsiveSuffix<T extends string | number>(
    value: T | ResponsiveValue<T>,
    suffix: string,
  ): string[] {
    if (!isResponsiveValue(value)) {
      return [`${suffix}${resolveValue(value)}`].filter(Boolean);
    }

    const responsive = value as Record<string, T | undefined>;
    const classes: string[] = [];

    if (responsive.base !== undefined) {
      const resolved = resolveValue(responsive.base);
      if (resolved) classes.push(`${suffix}${resolved}`);
    }

    for (const [breakpoint, val] of Object.entries(responsive)) {
      if (breakpoint === "base" || val === undefined) continue;
      const resolved = resolveValue(val);
      if (resolved) classes.push(`${breakpoint}:${suffix}${resolved}`);
    }

    return classes;
  }

  function resolveResponsive<T extends string | number>(
    value: T | ResponsiveValue<T>,
  ): string[] {
    if (!isResponsiveValue(value)) {
      return [resolveValue(value) || ""].filter(Boolean);
    }

    const responsive = value as Record<string, T | undefined>;
    const classes: string[] = [];

    if (responsive.base !== undefined) {
      const resolved = resolveValue(responsive.base);
      if (resolved) classes.push(resolved);
    }

    for (const [breakpoint, val] of Object.entries(responsive)) {
      if (breakpoint === "base" || val === undefined) continue;
      const prefix = `${breakpoint}:`;
      const resolved = resolveValue(val);
      if (resolved) classes.push(`${prefix}${resolved}`);
    }

    return classes;
  }

  function resolveResponsiveEnum<T extends string>(
    value: T | ResponsiveValue<T>,
    map: Record<string, string>,
  ): string[] {
    if (!isResponsiveValue(value)) {
      return [map[value] || ""].filter(Boolean);
    }

    const responsive = value as Record<string, T | undefined>;
    const classes: string[] = [];

    if (responsive.base !== undefined) {
      const mapped = map[responsive.base] || "";
      if (mapped) classes.push(mapped);
    }

    for (const [breakpoint, val] of Object.entries(responsive)) {
      if (breakpoint === "base" || val === undefined) continue;
      const mapped = map[val] || "";
      if (mapped) classes.push(`${breakpoint}:${mapped}`);
    }

    return classes;
  }

  function resolveComponentVariant(
    type: string,
    variantName: string,
  ): ComponentVariant | undefined {
    const variants = theme.variants[type.toLowerCase()];
    return variants?.find((variant) => variant.name === variantName);
  }

  function resolveTypography(token: TypographyToken): string {
    const classes: string[] = [];
    // fontFamily/fontWeight are handled by resolveTypographyInlineStyle instead when they're
    // token refs (or, for fontWeight, always — see resolveInlineStyle's fontWeight handling).
    if (token.fontFamily && !isTokenRef(token.fontFamily)) classes.push(token.fontFamily);
    if (token.fontSize) classes.push(token.fontSize);
    if (token.lineHeight) classes.push(token.lineHeight);
    if (token.letterSpacing) classes.push(token.letterSpacing);
    return classes.filter(Boolean).join(" ");
  }

  function resolveTypographyInlineStyle(token: TypographyToken): Record<string, string> {
    const result: Record<string, string> = {};

    if (token.fontFamily) {
      result.fontFamily = isTokenRef(token.fontFamily)
        ? (tokenRefToCssVar(token.fontFamily) ?? token.fontFamily)
        : token.fontFamily;
    }
    if (token.fontWeight !== undefined) {
      result.fontWeight = isTokenRef(token.fontWeight)
        ? (tokenRefToCssVar(token.fontWeight) ?? String(token.fontWeight))
        : String(token.fontWeight);
    }

    return result;
  }

  /** Resolves a `style.typography` token reference (e.g. "{semantics.typography.headline-medium}"). */
  function resolveTypographyToken(styleTypography: unknown): TypographyToken | undefined {
    if (!isTokenRef(styleTypography)) return undefined;
    const token = resolveToken(styleTypography.slice(1, -1));
    return token && typeof token === "object" ? (token as TypographyToken) : undefined;
  }

  return {
    resolveToken,
    resolveStyleIntent,
    resolveInlineStyle,
    resolveComponentVariant,
    resolveTypography,
  };
}
