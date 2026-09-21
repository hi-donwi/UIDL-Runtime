import type { Theme, ThemePreset } from "../types/theme";

export function serializeTheme(theme: Theme): string {
  return JSON.stringify(theme, null, 2);
}

export function serializeThemePreset(preset: ThemePreset): string {
  return JSON.stringify(preset, null, 2);
}

export function deserializeTheme(json: string): Theme {
  const parsed = JSON.parse(json);
  return parsed as Theme;
}

export function deserializeThemePreset(json: string): ThemePreset {
  const parsed = JSON.parse(json);
  return parsed as ThemePreset;
}
