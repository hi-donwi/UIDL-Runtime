/*
 * Meridian as a theme.
 *
 * Documents reference colors indirectly — `{primitives.color.border}`,
 * `{primitives.color.surface}` and so on — and the theme decides what those resolve to. The
 * default light/dark themes resolve them to a generic indigo-accented palette, which is what
 * made a Meridian-shaped document still read as "some admin panel". This preset points the same
 * token names at the Meridian palette, so a document written once
 * renders as Meridian without changing a single node.
 *
 * Typography tokens use the same `text-*` class names as the default theme; inside a
 * `.meridian-ui` subtree those classes resolve to Meridian's 11/12/13/14/18/20/24/28px scale
 * (src/meridian-theme.css), so the scale swap needs no separate token vocabulary.
 */

import type { PrimitiveTokens, SemanticTokens, Theme, ThemePreset } from "../types/theme";
import { defaultLightTheme } from "./presets";

/** colors.json */
const gray = {
  25: "#FBFBFB",
  50: "#F8F8F8",
  100: "#F3F3F3",
  200: "#EDEDED",
  300: "#E2E2E2",
  400: "#C7C7C7",
  500: "#999999",
  600: "#7C7C7C",
  700: "#525252",
  800: "#383838",
  850: "#282828",
  875: "#212121",
  890: "#1C1C1C",
  900: "#171717",
} as const;

const meridianLightPrimitives: PrimitiveTokens = {
  ...defaultLightTheme.primitives,
  color: {
    // Meridian's "primary" is its near-black button fill (Button: `bg-black`), not a hue.
    primary: "#1E293B",
    secondary: gray[200],
    tertiary: "#EDBA13",
    error: "#E03636",
    success: "#30A66D",
    warning: "#EDBA13",
    // Desk sits on white; the sidebar and form gutters are the gray-25/gray-50 steps.
    background: "#FFFFFF",
    surface: gray[25],
    "surface-elevated": "#FFFFFF",
    border: gray[200],
    "border-hover": gray[300],
    "text-primary": "#1E293B",
    "text-secondary": gray[600],
    "text-muted": gray[500],
    "text-inverse": "#FFFFFF",
    accent: "#33A1FF",
    "accent-hover": "#007BE0",
    "accent-subtle": "#EDF6FD",
  },
  radius: {
    none: "0px",
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    "2xl": "1rem",
    full: "9999px",
  },
  shadow: {
    none: "none",
    sm: "0 0.5px 0 0 rgba(0, 0, 0, 0.08)",
    md: "0 2px 4px 0 rgba(0, 0, 0, 0.05)",
    lg: "0 0 2px 0 rgba(0, 0, 0, 0.10), 0 2px 4px 0 rgba(0, 0, 0, 0.08)",
    xl: "0 0 2px 0 rgba(0, 0, 0, 0.10), 0 4px 8px 0 rgba(0, 0, 0, 0.10)",
  },
  font: {
    ...defaultLightTheme.primitives.font,
    sans: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
};

const meridianDarkPrimitives: PrimitiveTokens = {
  ...meridianLightPrimitives,
  color: {
    ...meridianLightPrimitives.color,
    primary: gray[300],
    secondary: gray[900],
    background: gray[875],
    surface: gray[900],
    "surface-elevated": gray[890],
    border: gray[800],
    "border-hover": gray[700],
    "text-primary": gray[25],
    "text-secondary": gray[400],
    "text-muted": gray[500],
    "text-inverse": gray[900],
    accent: "#007BE0",
    "accent-hover": "#33A1FF",
    "accent-subtle": "#004880",
  },
};

/** Same mapping as the default theme — only the primitives underneath differ. */
const meridianSemantics: SemanticTokens = defaultLightTheme.semantics;

export const meridianLightTheme: Theme = {
  ...defaultLightTheme,
  id: "theme-meridian-light",
  name: "Meridian Light",
  mode: "light",
  primitives: meridianLightPrimitives,
  semantics: meridianSemantics,
  variants: {
    ...defaultLightTheme.variants,
    // Meridian has exactly two button treatments (Button): a near-black primary and a
    // gray-200 secondary, both `h-8 rounded-md text-sm` with `px-6`/`px-3` padding.
    button: [
      {
        name: "primary",
        props: { variant: "primary" },
        style: { padding: "px-6", borderRadius: "{primitives.radius.md}", fontSize: "text-sm" },
      },
      {
        name: "secondary",
        props: { variant: "secondary" },
        style: { padding: "px-6", borderRadius: "{primitives.radius.md}", fontSize: "text-sm" },
      },
      {
        name: "icon",
        props: { variant: "secondary", icon: true },
        style: { padding: "px-3", borderRadius: "{primitives.radius.md}", fontSize: "text-sm" },
      },
    ],
  },
};

export const meridianDarkTheme: Theme = {
  ...meridianLightTheme,
  id: "theme-meridian-dark",
  name: "Meridian Dark",
  mode: "dark",
  primitives: meridianDarkPrimitives,
};

export const meridianLightPreset: ThemePreset = {
  id: "preset-meridian-light",
  label: "Meridian Light",
  mode: "light",
  theme: meridianLightTheme,
};

export const meridianDarkPreset: ThemePreset = {
  id: "preset-meridian-dark",
  label: "Meridian Dark",
  mode: "dark",
  theme: meridianDarkTheme,
};
