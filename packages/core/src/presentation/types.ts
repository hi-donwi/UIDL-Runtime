import { z } from "zod";
import type { ThemePreset } from "../types/theme";
import { ThemePresetSchema } from "../schemas/theme";
import type { UIDLDocument } from "../types";

export type { PresentationPresetReference } from "../types";

export const PRESENTATION_TARGETS = ["react", "flutter", "android"] as const;
export type PresentationTarget = (typeof PRESENTATION_TARGETS)[number];

export const PRESENTATION_THEME_MODES = ["light", "dark"] as const;
export type PresentationThemeMode = (typeof PRESENTATION_THEME_MODES)[number];

export const PRESENTATION_RECIPES = ["shell", "list", "form", "report", "print"] as const;
export type PresentationRecipe = (typeof PRESENTATION_RECIPES)[number];

export const PRESENTATION_CAPABILITIES = ["data-adapter", "host-actions"] as const;
export type PresentationCapability = (typeof PRESENTATION_CAPABILITIES)[number];

export interface PresentationPresetManifest {
  id: string;
  version: string;
  kind: "presentation-preset";
  targets: readonly PresentationTarget[];
  themes: readonly PresentationThemeMode[];
  recipes: readonly PresentationRecipe[];
  requiredWidgets: readonly string[];
  capabilities: readonly PresentationCapability[];
  provenance: {
    source: string;
  };
}

export interface PresentationPreset extends PresentationPresetManifest {
  themePresets: Readonly<Partial<Record<PresentationThemeMode, ThemePreset>>>;
}

export const PresentationPresetManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  version: z.string().min(1),
  kind: z.literal("presentation-preset"),
  targets: z.array(z.enum(PRESENTATION_TARGETS)).min(1),
  themes: z.array(z.enum(PRESENTATION_THEME_MODES)).min(1),
  recipes: z.array(z.enum(PRESENTATION_RECIPES)).min(1),
  requiredWidgets: z.array(z.string().min(1)),
  capabilities: z.array(z.enum(PRESENTATION_CAPABILITIES)),
  provenance: z.object({ source: z.string().min(1) }).strict(),
}).strict();

export function validatePresentationPresetManifest(value: unknown): PresentationPresetManifest {
  return PresentationPresetManifestSchema.parse(value);
}

export function validatePresentationPreset(value: unknown): PresentationPreset {
  if (!value || typeof value !== "object") {
    throw new Error("Presentation preset must be an object");
  }

  const candidate = value as PresentationPreset;
  const { themePresets, ...manifestValue } = candidate;
  const manifest = validatePresentationPresetManifest(manifestValue);

  if (!themePresets || typeof themePresets !== "object") {
    throw new Error(`Presentation preset "${manifest.id}" must provide theme presets`);
  }

  for (const mode of manifest.themes) {
    const preset = themePresets[mode];
    if (!preset) {
      throw new Error(`Presentation preset "${manifest.id}" is missing its ${mode} theme`);
    }
    const parsed = ThemePresetSchema.parse(preset);
    if (parsed.mode !== mode) {
      throw new Error(`Presentation preset "${manifest.id}" has a ${mode} theme with mode ${parsed.mode}`);
    }
  }

  return { ...manifest, themePresets };
}

export interface PresentationPresetCatalog {
  list(): PresentationPreset[];
  get(id: string): PresentationPreset | undefined;
}

export function applyPresentationPreset(
  document: UIDLDocument,
  preset: PresentationPreset,
  mode: PresentationThemeMode = "light",
): UIDLDocument {
  validatePresentationPreset(preset);
  if (!preset.themes.includes(mode)) {
    throw new Error(`Presentation preset "${preset.id}" does not support the ${mode} theme`);
  }

  const theme = preset.themePresets[mode];
  if (!theme) {
    throw new Error(`Presentation preset "${preset.id}" is missing its ${mode} theme`);
  }

  return {
    ...document,
    theme: theme.theme.id,
    presentationPreset: { id: preset.id, version: preset.version },
  };
}
