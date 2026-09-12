import { describe, it, expect, beforeEach } from "vitest";
import { createEditorStore } from "../editor/store";
import { buildFlatNodeMap, findParentId, getNodeDepth, findNodePath, isNodeVisible } from "../editor/document";
import { DocumentSchema } from "../schemas/document";
import type { UIDLDocument } from "../types";

const sampleDocument: UIDLDocument = {
  version: "1.0.0",
  id: "test-doc",
  name: "Test",
  root: {
    id: "root",
    type: "Container",
    props: {},
    style: {},
    children: [
      {
        id: "child-1",
        type: "Text",
        props: { value: "Hello" },
        style: {},
        children: [],
      },
      {
        id: "child-2",
        type: "Column",
        props: {},
        style: {},
        children: [
          {
            id: "grandchild-1",
            type: "Button",
            props: { label: "Click" },
            style: {},
            children: [],
          },
        ],
      },
    ],
  },
};

describe("editor store", () => {
  let store: ReturnType<typeof createEditorStore>;

  beforeEach(() => {
    store = createEditorStore(sampleDocument);
  });

  it("initializes with document state", () => {
    const state = store.getState();
    expect(state.document.id).toBe("test-doc");
    expect(state.selectedNodeId).toBeNull();
    expect(state.themeMode).toBe("light");
    expect(state.isDirty).toBe(false);
  });

  it("selectNode updates selectedNodeId", () => {
    store.getState().selectNode("child-1");
    expect(store.getState().selectedNodeId).toBe("child-1");
  });

  it("hoverNode updates hoveredNodeId", () => {
    store.getState().hoverNode("child-2");
    expect(store.getState().hoveredNodeId).toBe("child-2");
  });

  it("updateNode modifies node in document and flat map", () => {
    store.getState().updateNode("child-1", { name: "Updated Text" });
    const state = store.getState();
    expect(state.flatNodeMap.get("child-1")?.name).toBe("Updated Text");
    expect(state.isDirty).toBe(true);
  });

  it("addChild adds child to parent", () => {
    store.getState().addChild("child-2", "Text");
    const state = store.getState();
    const parent = state.flatNodeMap.get("child-2");
    expect(parent?.children?.length).toBe(2);
    expect(parent?.children?.[1].type).toBe("Text");
    expect(state.selectedNodeId).toBe(parent?.children?.[1].id);
  });

  it("deleteNode removes child and updates selection", () => {
    store.getState().selectNode("child-1");
    store.getState().deleteNode("child-1");
    const state = store.getState();
    expect(state.flatNodeMap.has("child-1")).toBe(false);
    expect(state.selectedNodeId).toBe("root");
  });

  it("setThemeMode updates theme mode", () => {
    store.getState().setThemeMode("dark");
    expect(store.getState().themeMode).toBe("dark");
  });

  it("setBreakpoint updates active breakpoint", () => {
    store.getState().setBreakpoint("md");
    expect(store.getState().activeBreakpoint).toBe("md");
  });

  it("togglePanel toggles panel visibility", () => {
    store.getState().togglePanel("palette");
    expect(store.getState().panelVisibility.palette).toBe(false);
    store.getState().togglePanel("palette");
    expect(store.getState().panelVisibility.palette).toBe(true);
  });

  it("setValidationErrors updates errors", () => {
    store.getState().setValidationErrors([{ path: "root", message: "test", severity: "error" }]);
    expect(store.getState().validationErrors).toHaveLength(1);
  });

  it("markClean resets isDirty", () => {
    store.getState().updateNode("child-1", { name: "Test" });
    expect(store.getState().isDirty).toBe(true);
    store.getState().markClean();
    expect(store.getState().isDirty).toBe(false);
  });
});

describe("editor document utilities", () => {
  let flatMap: ReturnType<typeof buildFlatNodeMap>;

  beforeEach(() => {
    flatMap = buildFlatNodeMap(sampleDocument.root);
  });

  it("buildFlatNodeMap includes all nodes", () => {
    expect(flatMap.size).toBe(4);
    expect(flatMap.has("root")).toBe(true);
    expect(flatMap.has("child-1")).toBe(true);
    expect(flatMap.has("child-2")).toBe(true);
    expect(flatMap.has("grandchild-1")).toBe(true);
  });

  it("findParentId returns parent of node", () => {
    expect(findParentId(flatMap, "child-1")).toBe("root");
    expect(findParentId(flatMap, "grandchild-1")).toBe("child-2");
    expect(findParentId(flatMap, "root")).toBeUndefined();
  });

  it("getNodeDepth returns correct depth", () => {
    expect(getNodeDepth(flatMap, "root")).toBe(0);
    expect(getNodeDepth(flatMap, "child-1")).toBe(1);
    expect(getNodeDepth(flatMap, "grandchild-1")).toBe(2);
  });

  it("findNodePath returns path from root to node", () => {
    expect(findNodePath(flatMap, "grandchild-1")).toEqual(["root", "child-2", "grandchild-1"]);
  });
});

describe("isNodeVisible", () => {
  it("returns true when node has no visibility", () => {
    const node = { id: "1", type: "Text", props: {}, style: {}, children: [] };
    expect(isNodeVisible(node)).toBe(true);
  });

  it("returns true when visibility has no condition", () => {
    const node = { id: "1", type: "Text", props: {}, style: {}, children: [], visibility: {} };
    expect(isNodeVisible(node)).toBe(true);
  });

  it("returns true for truthy condition", () => {
    const node = {
      id: "1",
      type: "Text",
      props: {},
      style: {},
      children: [],
      visibility: { condition: { "==": [{ path: "state.show" }, true] } },
    };
    expect(isNodeVisible(node, { state: { show: true } })).toBe(true);
  });

  it("returns false for falsy condition", () => {
    const node = {
      id: "1",
      type: "Text",
      props: {},
      style: {},
      children: [],
      visibility: { condition: { "==": [{ path: "state.show" }, false] } },
    };
    expect(isNodeVisible(node, { state: { show: true } })).toBe(false);
  });

  it("returns false when condition path is missing", () => {
    const node = {
      id: "1",
      type: "Text",
      props: {},
      style: {},
      children: [],
      visibility: { condition: { path: "state.missing" } },
    };
    expect(isNodeVisible(node, { state: {} })).toBe(false);
  });
});

describe("Drag and drop, undo/redo, save/load", () => {
  it("moveNode reorders children within same parent", () => {
    const store = createEditorStore(sampleDocument);
    store.getState().moveNode("child-1", "root", 1);
    const state = store.getState();
    const rootChildren = state.flatNodeMap.get("root")?.children ?? [];
    expect(rootChildren[0].id).toBe("child-2");
    expect(rootChildren[1].id).toBe("child-1");
  });

  it("moveNode reparents child to another parent", () => {
    const store = createEditorStore(sampleDocument);
    store.getState().moveNode("child-1", "child-2", 0);
    const state = store.getState();
    const newParent = state.flatNodeMap.get("child-2");
    expect(newParent?.children?.some((c) => c.id === "child-1")).toBe(true);
  });

  it("undo sets canUndo to false and canRedo to true", () => {
    const store = createEditorStore(sampleDocument);
    store.getState().addChild("child-2", "Text");
    expect(store.getState().canUndo).toBe(true);
    store.getState().undo();
    expect(store.getState().canUndo).toBe(false);
    expect(store.getState().canRedo).toBe(true);
  });

  it("redo sets canUndo to true and canRedo to false", () => {
    const store = createEditorStore(sampleDocument);
    store.getState().addChild("child-2", "Text");
    store.getState().undo();
    store.getState().redo();
    expect(store.getState().canUndo).toBe(true);
    expect(store.getState().canRedo).toBe(false);
  });

  it("save/load round-trip preserves document", () => {
    const store = createEditorStore(sampleDocument);
    const json = JSON.stringify(store.getState().document);
    const parsed = JSON.parse(json);
    const result = DocumentSchema.safeParse(parsed);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("test-doc");
    }
  });
});
