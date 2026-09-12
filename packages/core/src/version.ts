import { defaultRegistry } from "./registry/registry";

export const UIDL_RUNTIME_VERSION = "1.1.0";

export type RegistryVersion = {
  version: string;
  componentCount: number;
  components: string[];
};

export function computeRegistryVersion(): RegistryVersion {
  const widgets = defaultRegistry.list();
  return {
    version: UIDL_RUNTIME_VERSION,
    componentCount: widgets.length,
    components: widgets.map((w) =>
      `${w.type}:${w.propDescriptors?.map((p) => p.name).join(",")}:${w.eventDescriptors?.map((e) => e.name).join(",")}`,
    ),
  };
}

export const REGISTRY_VERSION: RegistryVersion = computeRegistryVersion();

export function getRegistryVersion(): RegistryVersion {
  return REGISTRY_VERSION;
}

export function getRegistryFingerprint(): string {
  return REGISTRY_VERSION.components.join("\n");
}
