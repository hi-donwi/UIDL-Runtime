import type { Theme, ThemePreset } from "../types/theme";
import { ThemeSchema, ThemePresetSchema } from "../schemas/theme";

const themeRegistry = new Map<string, Theme>();
const presetRegistry = new Map<string, ThemePreset>();

export function registerTheme(theme: Theme) {
  const parsed = ThemeSchema.parse(theme);
  themeRegistry.set(parsed.id, parsed);
}

export function registerThemePreset(preset: ThemePreset) {
  const parsed = ThemePresetSchema.parse(preset);
  presetRegistry.set(parsed.id, parsed);
  themeRegistry.set(parsed.theme.id, parsed.theme);
}

export function getTheme(id: string): Theme | undefined {
  return themeRegistry.get(id);
}

export function getThemePreset(id: string): ThemePreset | undefined {
  return presetRegistry.get(id);
}

export function listThemes(): Theme[] {
  return Array.from(themeRegistry.values());
}

export function listPresets(): ThemePreset[] {
  return Array.from(presetRegistry.values());
}

export function createThemeRegistry() {
  return {
    registerTheme,
    registerThemePreset,
    getTheme,
    getThemePreset,
    listThemes,
    listPresets,
  };
}
