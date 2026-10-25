import { denseBusinessPreset } from "./denseBusiness";
import { validatePresentationPreset, type PresentationPreset, type PresentationPresetCatalog } from "./types";

export function createPresentationPresetCatalog(
  presets: readonly PresentationPreset[],
): PresentationPresetCatalog {
  const entries = presets.map((preset) => validatePresentationPreset(preset));
  const byId = new Map<string, PresentationPreset>();

  for (const preset of entries) {
    if (byId.has(preset.id)) {
      throw new Error(`Presentation preset "${preset.id}" is registered more than once`);
    }
    byId.set(preset.id, preset);
  }

  return {
    list: () => [...byId.values()],
    get: (id) => byId.get(id),
  };
}

export const presentationPresetCatalog = createPresentationPresetCatalog([denseBusinessPreset]);
