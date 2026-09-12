import type { Theme } from "../types/theme";

/**
 * Flat `--category-key: value` map (no selector wrapper) for the primitive tokens a theme
 * exposes. Meant to be merged directly onto a React element's inline `style` prop so
 * `var(--color-primary)` references produced by `ThemeEngine.resolveInlineStyle` resolve
 * without requiring a global stylesheet or Tailwind to see anything built at runtime.
 */
export function themeToCssVariablesMap(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const [key, value] of Object.entries(theme.primitives.color)) {
    vars[`--color-${key}`] = value;
  }
  for (const [key, value] of Object.entries(theme.primitives.spacing)) {
    vars[`--spacing-${key}`] = value;
  }
  for (const [key, value] of Object.entries(theme.primitives.radius)) {
    vars[`--radius-${key}`] = value;
  }
  for (const [key, value] of Object.entries(theme.primitives.shadow)) {
    vars[`--shadow-${key}`] = value;
  }
  for (const [key, value] of Object.entries(theme.primitives.font)) {
    vars[`--font-${key}`] = value;
  }
  for (const [key, value] of Object.entries(theme.primitives.border)) {
    vars[`--border-${key}`] = value;
  }

  return vars;
}

export function themeToCssVariables(theme: Theme): string {
  const lines: string[] = [];

  if (theme.mode === "dark") {
    lines.push(".dark {");
  } else {
    lines.push(":root {");
  }

  for (const [key, value] of Object.entries(theme.primitives.color)) {
    lines.push(`  --color-${key}: ${value};`);
  }
  for (const [key, value] of Object.entries(theme.primitives.spacing)) {
    lines.push(`  --spacing-${key}: ${value};`);
  }
  for (const [key, value] of Object.entries(theme.primitives.radius)) {
    lines.push(`  --radius-${key}: ${value};`);
  }
  for (const [key, value] of Object.entries(theme.primitives.shadow)) {
    lines.push(`  --shadow-${key}: ${value};`);
  }
  for (const [key, value] of Object.entries(theme.primitives.font)) {
    lines.push(`  --font-${key}: ${value};`);
  }

  lines.push("}");

  return lines.join("\n");
}

export function themeToTailwindV4(theme: Theme): string {
  const lines: string[] = ["@import \"tailwindcss\";", ""];

  lines.push("@theme {");

  for (const [key, value] of Object.entries(theme.primitives.color)) {
    lines.push(`  --color-${key}: ${value};`);
  }
  for (const [key, value] of Object.entries(theme.primitives.spacing)) {
    lines.push(`  --spacing-${key}: ${value};`);
  }
  for (const [key, value] of Object.entries(theme.primitives.radius)) {
    lines.push(`  --radius-${key}: ${value};`);
  }
  for (const [key, value] of Object.entries(theme.primitives.shadow)) {
    lines.push(`  --shadow-${key}: ${value};`);
  }
  for (const [key, value] of Object.entries(theme.primitives.font)) {
    lines.push(`  --font-${key}: ${value};`);
  }

  for (const [name, token] of Object.entries(theme.semantics.typography)) {
    if (token.fontFamily) lines.push(`  --font-${name}: ${token.fontFamily};`);
    if (token.fontSize) lines.push(`  --text-${name}: ${token.fontSize};`);
  }

  lines.push("}");

  return lines.join("\n");
}

export function themeToTailwindV3(theme: Theme): Record<string, unknown> {
  const extend: Record<string, unknown> = {
    colors: { ...theme.primitives.color },
    spacing: Object.fromEntries(
      Object.entries(theme.primitives.spacing).map(([k, v]) => [k, v]),
    ),
    borderRadius: Object.fromEntries(
      Object.entries(theme.primitives.radius).map(([k, v]) => [k, v]),
    ),
    boxShadow: Object.fromEntries(
      Object.entries(theme.primitives.shadow).map(([k, v]) => [k, v]),
    ),
    fontFamily: Object.fromEntries(
      Object.entries(theme.primitives.font).map(([k, v]) => [k, v]),
    ),
  };

  const typography: Record<string, unknown> = {};
  for (const [name, token] of Object.entries(theme.semantics.typography)) {
    typography[name] = {
      fontFamily: token.fontFamily,
      fontSize: token.fontSize,
      fontWeight: token.fontWeight,
      lineHeight: token.lineHeight,
      letterSpacing: token.letterSpacing,
    };
  }

  return { extend: { ...extend, typography } };
}
