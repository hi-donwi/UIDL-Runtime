import type { ComponentRegistry, WidgetManifest } from "../types";
import { defaultWidgets } from "./defaults";

export function createRegistry(): ComponentRegistry {
  const registry = new Map<string, WidgetManifest>();

  for (const widget of defaultWidgets) {
    registry.set(widget.type, widget);
  }

  return {
    get(type: string) {
      return registry.get(type);
    },
    register(manifest: WidgetManifest) {
      registry.set(manifest.type, manifest);
    },
    has(type: string) {
      return registry.has(type);
    },
    list() {
      return Array.from(registry.values());
    },
  };
}

export const defaultRegistry = createRegistry();

export function registerComponent(manifest: WidgetManifest) {
  defaultRegistry.register(manifest);
}
