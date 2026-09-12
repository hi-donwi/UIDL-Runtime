import { describe, it, expect } from "vitest";
import { instantiateComponent } from "../instantiateComponent";
import type { UIDLNode } from "../../types";

describe("instantiateComponent", () => {
  const definition: UIDLNode = {
    id: "template-root",
    type: "Container",
    props: { variant: "default" },
    style: { padding: "p-6", background: "bg-surface" },
    children: [
      { id: "template-title", type: "Text", props: { value: "Default title" } },
    ],
    slots: {
      footer: [{ id: "template-footer", type: "Text", props: { value: "Default footer" } }],
    },
  };

  it("gives the instantiated root the instance's own id", () => {
    const instance: UIDLNode = { id: "card-1", type: "Container", componentId: "card" };
    const result = instantiateComponent(instance, definition);
    expect(result.id).toBe("card-1");
  });

  it("namespaces descendant ids with the instance id, so two instances never collide", () => {
    const instanceA: UIDLNode = { id: "card-a", type: "Container", componentId: "card" };
    const instanceB: UIDLNode = { id: "card-b", type: "Container", componentId: "card" };

    const resultA = instantiateComponent(instanceA, definition);
    const resultB = instantiateComponent(instanceB, definition);

    expect(resultA.children?.[0].id).toBe("card-a__template-title");
    expect(resultB.children?.[0].id).toBe("card-b__template-title");
    expect(resultA.children?.[0].id).not.toBe(resultB.children?.[0].id);
  });

  it("clears componentId on the result, so it doesn't try to re-instantiate itself", () => {
    const instance: UIDLNode = { id: "card-1", type: "Container", componentId: "card" };
    const result = instantiateComponent(instance, definition);
    expect(result.componentId).toBeUndefined();
  });

  it("instance props/style override the definition's, shallow-merged", () => {
    const instance: UIDLNode = {
      id: "card-1",
      type: "Container",
      componentId: "card",
      props: { variant: "highlighted" },
      style: { background: "bg-accent" },
    };

    const result = instantiateComponent(instance, definition);

    expect(result.props).toEqual({ variant: "highlighted" });
    // padding wasn't overridden, so the definition's own value survives the merge.
    expect(result.style).toEqual({ padding: "p-6", background: "bg-accent" });
  });

  it("instance children replace the definition's entirely when provided", () => {
    const instance: UIDLNode = {
      id: "card-1",
      type: "Container",
      componentId: "card",
      children: [{ id: "custom", type: "Text", props: { value: "Custom content" } }],
    };

    const result = instantiateComponent(instance, definition);

    expect(result.children).toHaveLength(1);
    expect(result.children?.[0].id).toBe("custom");
  });

  it("falls back to the definition's own children when the instance provides none", () => {
    const instance: UIDLNode = { id: "card-1", type: "Container", componentId: "card" };
    const result = instantiateComponent(instance, definition);

    expect(result.children).toHaveLength(1);
    expect(result.children?.[0].id).toBe("card-1__template-title");
  });

  it("instance slots merge with the definition's by name, instance wins per key", () => {
    const instance: UIDLNode = {
      id: "card-1",
      type: "Container",
      componentId: "card",
      slots: { footer: [{ id: "custom-footer", type: "Text", props: { value: "Custom footer" } }] },
    };

    const result = instantiateComponent(instance, definition);

    expect(result.slots?.footer).toHaveLength(1);
    expect(result.slots?.footer[0].id).toBe("custom-footer");
  });

  it("a slot name the instance doesn't mention keeps the definition's default content", () => {
    const definitionWithTwoSlots: UIDLNode = {
      ...definition,
      slots: {
        header: [{ id: "template-header", type: "Text", props: { value: "Default header" } }],
        footer: [{ id: "template-footer", type: "Text", props: { value: "Default footer" } }],
      },
    };
    const instance: UIDLNode = {
      id: "card-1",
      type: "Container",
      componentId: "card",
      slots: { footer: [{ id: "custom-footer", type: "Text", props: { value: "Custom footer" } }] },
    };

    const result = instantiateComponent(instance, definitionWithTwoSlots);

    expect(result.slots?.header[0].id).toBe("card-1__template-header");
    expect(result.slots?.footer[0].id).toBe("custom-footer");
  });
});
