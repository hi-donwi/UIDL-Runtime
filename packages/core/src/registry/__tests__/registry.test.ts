import { describe, it, expect } from "vitest";
import { createRegistry, defaultRegistry, registerComponent } from "../registry";
import { defaultWidgets } from "../defaults";

describe("createRegistry", () => {
  it("isolates widgets registered on one instance from another", () => {
    const a = createRegistry();
    const b = createRegistry();

    a.register({ type: "OnlyOnA", component: (() => null) as never, category: "base", acceptsChildren: false });

    expect(a.has("OnlyOnA")).toBe(true);
    expect(b.has("OnlyOnA")).toBe(false);
    expect(defaultRegistry.has("OnlyOnA")).toBe(false);
  });

  it("still seeds every new registry with the default widgets", () => {
    const registry = createRegistry();
    expect(registry.has("Container")).toBe(true);
    expect(registry.has("Button")).toBe(true);
  });

  it("registerComponent only affects defaultRegistry", () => {
    const isolated = createRegistry();
    registerComponent({ type: "GlobalOnly", component: (() => null) as never, category: "base", acceptsChildren: false });

    expect(defaultRegistry.has("GlobalOnly")).toBe(true);
    expect(isolated.has("GlobalOnly")).toBe(false);
  });

  it("describes props and events for every default widget", () => {
    for (const manifest of defaultWidgets) {
      expect(manifest.propDescriptors, `${manifest.type} prop descriptors`).toBeDefined();
      expect(manifest.propDescriptors!.length, `${manifest.type} prop descriptors`).toBeGreaterThan(0);

      const eventNames = manifest.events ?? [];
      const descriptorNames = new Set((manifest.eventDescriptors ?? []).map((descriptor) => descriptor.name));
      for (const eventName of eventNames) {
        expect(descriptorNames.has(eventName), `${manifest.type}.${eventName} descriptor`).toBe(true);
      }
    }
  });

  it("describes the runtime prop names used by generated UIDL", () => {
    const textProps = new Set(defaultRegistry.get("Text")!.propDescriptors!.map((descriptor) => descriptor.name));
    expect(textProps.has("value")).toBe(true);
    expect(textProps.has("content")).toBe(false);

    const tableProps = new Set(defaultRegistry.get("DataTable")!.propDescriptors!.map((descriptor) => descriptor.name));
    expect(tableProps.has("rows")).toBe(true);
    expect(tableProps.has("dataSource")).toBe(true);
    expect(tableProps.has("data")).toBe(false);

    const fieldProps = new Set(defaultRegistry.get("TextField")!.propDescriptors!.map((descriptor) => descriptor.name));
    expect(fieldProps.has("inputType")).toBe(false);
  });
});
