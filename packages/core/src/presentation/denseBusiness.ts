import { defaultLightTheme } from "../theme/presets";
import type { PrimitiveTokens, SemanticTokens, Theme, ThemePreset } from "../types/theme";
import type { PresentationPreset } from "./types";

const denseLightPrimitives: PrimitiveTokens = {
  ...defaultLightTheme.primitives,
  color: {
    primary: "#1F4B7A",
    secondary: "#D7E0EA",
    tertiary: "#C98910",
    error: "#B42318",
    success: "#16794C",
    warning: "#B54708",
    background: "#F5F7FA",
    "surface-container-low": "#F8FAFC",
    "surface-container": "#FBFCFD",
    "surface-container-high": "#FDFEFF",
    surface: "#FFFFFF",
    "surface-elevated": "#FFFFFF",
    border: "#D7DEE8",
    "border-hover": "#B8C4D1",
    "text-primary": "#172033",
    "text-secondary": "#526176",
    "text-muted": "#778397",
    "text-inverse": "#FFFFFF",
    accent: "#2563EB",
    "accent-hover": "#1D4ED8",
    "accent-subtle": "#EAF2FF",
  },
  radius: {
    none: "0px",
    sm: "0.125rem",
    md: "0.25rem",
    lg: "0.375rem",
    xl: "0.5rem",
    "2xl": "0.75rem",
    full: "9999px",
  },
  font: {
    ...defaultLightTheme.primitives.font,
    sans: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
};

const denseDarkPrimitives: PrimitiveTokens = {
  ...denseLightPrimitives,
  color: {
    ...denseLightPrimitives.color,
    primary: "#A8C7ED",
    secondary: "#334155",
    background: "#101722",
    "surface-container-low": "#172131",
    "surface-container": "#1C2738",
    "surface-container-high": "#253348",
    surface: "#1C2738",
    "surface-elevated": "#26364B",
    border: "#34445A",
    "border-hover": "#4A607A",
    "text-primary": "#F5F7FA",
    "text-secondary": "#B4C0D0",
    "text-muted": "#8493A7",
    "text-inverse": "#101722",
    accent: "#7DB2FF",
    "accent-hover": "#A8C7ED",
    "accent-subtle": "#203A5E",
  },
};

function semanticsFor(): SemanticTokens {
  return {
    ...defaultLightTheme.semantics,
    color: {
      ...defaultLightTheme.semantics.color,
      "bg-accent": "{primitives.color.accent}",
      "text-on-accent": "{primitives.color.text-inverse}",
      "focus-ring": "{primitives.color.accent}",
      "focus-ring-offset": "{primitives.color.background}",
    },
    radius: {
      ...defaultLightTheme.semantics.radius,
      control: "{primitives.radius.md}",
      panel: "{primitives.radius.lg}",
    },
  };
}

const denseBusinessVariants = {
  ...defaultLightTheme.variants,
  button: [
    {
      name: "primary",
      props: { variant: "primary" },
      style: {
        background: "{primitives.color.primary}",
        color: "{primitives.color.text-inverse}",
        padding: "px-3 py-1.5",
        borderRadius: "{primitives.radius.md}",
        fontSize: "text-sm",
        fontWeight: 600,
      },
    },
    {
      name: "secondary",
      props: { variant: "secondary" },
      style: {
        background: "{primitives.color.surface}",
        color: "{primitives.color.text-primary}",
        padding: "px-3 py-1.5",
        borderRadius: "{primitives.radius.md}",
        borderWidth: "{primitives.border.width-thin}",
        borderColor: "{primitives.color.border}",
        fontSize: "text-sm",
        fontWeight: 600,
      },
    },
  ],
  textfield: [
    {
      name: "default",
      props: { variant: "default" },
      style: {
        padding: "px-3 py-1.5",
        borderRadius: "{primitives.radius.md}",
        borderWidth: "{primitives.border.width-thin}",
        borderColor: "{primitives.color.border}",
        background: "{primitives.color.surface}",
      },
    },
  ],
};

function createTheme(
  id: string,
  name: string,
  mode: "light" | "dark",
  primitives: PrimitiveTokens,
): Theme {
  return {
    ...defaultLightTheme,
    id,
    name,
    mode,
    primitives,
    semantics: semanticsFor(),
    variants: denseBusinessVariants,
  };
}

export const denseBusinessLightTheme = createTheme(
  "theme-dense-business-light",
  "Dense Business Light",
  "light",
  denseLightPrimitives,
);

export const denseBusinessDarkTheme = createTheme(
  "theme-dense-business-dark",
  "Dense Business Dark",
  "dark",
  denseDarkPrimitives,
);

export const denseBusinessLightPreset: ThemePreset = {
  id: "preset-dense-business-light",
  label: "Dense Business Light",
  mode: "light",
  theme: denseBusinessLightTheme,
};

export const denseBusinessDarkPreset: ThemePreset = {
  id: "preset-dense-business-dark",
  label: "Dense Business Dark",
  mode: "dark",
  theme: denseBusinessDarkTheme,
};

export const denseBusinessPreset: PresentationPreset = {
  id: "dense-business",
  version: "0.1.0",
  kind: "presentation-preset",
  targets: ["react"],
  themes: ["light", "dark"],
  recipes: ["shell", "list", "form", "report", "print"],
  requiredWidgets: ["Column", "Row", "Text", "TextField", "Select", "DataTable", "Button"],
  capabilities: ["data-adapter", "host-actions"],
  provenance: { source: "uidl-runtime" },
  themePresets: {
    light: denseBusinessLightPreset,
    dark: denseBusinessDarkPreset,
  },
};
