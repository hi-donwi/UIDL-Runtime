import { create } from "zustand";
import type { UIDLDocument, UIDLNode } from "../types";
import { buildFlatNodeMap, findParentId, removeChildFromNode } from "./document";

export interface EditorStore {
  document: UIDLDocument;
  flatNodeMap: Map<string, UIDLNode>;
  history: { past: UIDLDocument[]; future: UIDLDocument[] };
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  activeBreakpoint: string;
  themeMode: "light" | "dark";
  panelVisibility: {
    palette: boolean;
    layers: boolean;
    properties: boolean;
    style: boolean;
  };
  validationErrors: Array<{ path: string; message: string; severity: "error" | "warning" }>;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;

  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  updateNode: (nodeId: string, changes: Partial<UIDLNode>) => void;
  addChild: (parentId: string, childType: string, index?: number) => void;
  deleteNode: (nodeId: string) => void;
  moveNode: (nodeId: string, targetParentId: string, index?: number) => void;
  setBreakpoint: (breakpoint: string) => void;
  setThemeMode: (mode: "light" | "dark") => void;
  togglePanel: (panel: keyof EditorStore["panelVisibility"]) => void;
  setDocument: (document: UIDLDocument) => void;
  setValidationErrors: (errors: Array<{ path: string; message: string; severity: "error" | "warning" }>) => void;
  markClean: () => void;
  undo: () => void;
  redo: () => void;
}

export function createEditorStore(initialDocument?: UIDLDocument) {
  const initialFlatNodeMap = initialDocument ? buildFlatNodeMap(initialDocument.root) : new Map();

  return create<EditorStore>()((set, get) => ({
    document: initialDocument ?? createEmptyDocument(),
    flatNodeMap: initialFlatNodeMap,
    history: { past: [], future: [] },
    selectedNodeId: null,
    hoveredNodeId: null,
    activeBreakpoint: "base",
    themeMode: "light",
    panelVisibility: {
      palette: true,
      layers: true,
      properties: true,
      style: true,
    },
    validationErrors: [],
    isDirty: false,
    canUndo: false,
    canRedo: false,

    selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

    hoverNode: (nodeId) => set({ hoveredNodeId: nodeId }),

    updateNode: (nodeId, changes) => {
      const { flatNodeMap, document, history } = get();
      const node = flatNodeMap.get(nodeId);
      if (!node) return;

      const updatedNode = { ...node, ...changes };
      const newFlatNodeMap = new Map(flatNodeMap);
      newFlatNodeMap.set(nodeId, updatedNode);

      const newRoot = updateNodeInTree(document.root, nodeId, updatedNode);
      const newDocument = { ...document, root: newRoot };

      set({
        document: newDocument,
        flatNodeMap: newFlatNodeMap,
        history: { past: [...history.past, document], future: [] },
        isDirty: true,
        canUndo: true,
        canRedo: false,
      });
    },

    addChild: (parentId, childType, _index) => {
      const { flatNodeMap, document, history } = get();
      const parent = flatNodeMap.get(parentId);
      if (!parent) return;

      const newChild: UIDLNode = {
        id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: childType,
        props: {},
        style: {},
        children: [],
      };

      const newFlatNodeMap = new Map(flatNodeMap);
      newFlatNodeMap.set(newChild.id, newChild);

      const updatedParent = {
        ...parent,
        children: [...(parent.children ?? []), newChild],
      };
      newFlatNodeMap.set(parentId, updatedParent);

      const newRoot = updateNodeInTree(document.root, parentId, updatedParent);
      const newDocument = { ...document, root: newRoot };

      set({
        document: newDocument,
        flatNodeMap: newFlatNodeMap,
        selectedNodeId: newChild.id,
        history: { past: [...history.past, document], future: [] },
        isDirty: true,
        canUndo: true,
        canRedo: false,
      });
    },

    deleteNode: (nodeId) => {
      const { flatNodeMap, document, selectedNodeId, history } = get();
      if (nodeId === document.root.id) return;

      const parentId = findParentId(flatNodeMap, nodeId);
      if (!parentId) return;

      const parent = flatNodeMap.get(parentId);
      if (!parent) return;

      const newFlatNodeMap = new Map(flatNodeMap);
      newFlatNodeMap.delete(nodeId);

      const updatedParent = removeChildFromNode(parent, nodeId);
      newFlatNodeMap.set(parentId, updatedParent);

      const newRoot = updateNodeInTree(document.root, parentId, updatedParent);
      const newDocument = { ...document, root: newRoot };

      set({
        document: newDocument,
        flatNodeMap: newFlatNodeMap,
        selectedNodeId: selectedNodeId === nodeId ? parentId : selectedNodeId,
        history: { past: [...history.past, document], future: [] },
        isDirty: true,
        canUndo: true,
        canRedo: false,
      });
    },

    moveNode: (nodeId, targetParentId, _index) => {
      const { flatNodeMap, document, history } = get();
      const node = flatNodeMap.get(nodeId);
      if (!node) return;

      const currentParentId = findParentId(flatNodeMap, nodeId);
      if (!currentParentId) return;

      const currentParent = flatNodeMap.get(currentParentId);
      const targetParent = flatNodeMap.get(targetParentId);
      if (!currentParent || !targetParent) return;

      const newFlatNodeMap = new Map(flatNodeMap);

      const updatedCurrentParent = removeChildFromNode(currentParent, nodeId);
      newFlatNodeMap.set(currentParentId, updatedCurrentParent);

      const effectiveTargetParent = currentParentId === targetParentId ? updatedCurrentParent : targetParent;
      const targetChildren = [...(effectiveTargetParent.children ?? [])];
      const insertIndex = _index ?? targetChildren.length;
      targetChildren.splice(insertIndex, 0, node);
      const updatedTargetParent = {
        ...effectiveTargetParent,
        children: targetChildren,
      };
      newFlatNodeMap.set(targetParentId, updatedTargetParent);

      const newRoot = rebuildTreeFromFlatMap(newFlatNodeMap, document.root.id);
      const newDocument = { ...document, root: newRoot };

      set({
        document: newDocument,
        flatNodeMap: newFlatNodeMap,
        history: { past: [...history.past, document], future: [] },
        isDirty: true,
        canUndo: true,
        canRedo: false,
      });
    },

    setBreakpoint: (breakpoint) => set({ activeBreakpoint: breakpoint }),

    setThemeMode: (mode) => set({ themeMode: mode }),

    togglePanel: (panel) =>
      set((state) => ({
        panelVisibility: {
          ...state.panelVisibility,
          [panel]: !state.panelVisibility[panel],
        },
      })),

    setDocument: (document) => {
      const flatNodeMap = buildFlatNodeMap(document.root);
      set({
        document,
        flatNodeMap,
        history: { past: [], future: [] },
        isDirty: false,
        selectedNodeId: null,
        canUndo: false,
        canRedo: false,
      });
    },

    setValidationErrors: (errors) => set({ validationErrors: errors }),

    markClean: () => set({ isDirty: false }),

    undo: () => {
      const { history, document } = get();
      const previous = history.past[history.past.length - 1];
      if (!previous) return;

      const newPast = history.past.slice(0, -1);
      const newFlatNodeMap = buildFlatNodeMap(previous.root);

      set({
        document: previous,
        flatNodeMap: newFlatNodeMap,
        history: { past: newPast, future: [document, ...history.future] },
        selectedNodeId: null,
        isDirty: true,
        canUndo: newPast.length > 0,
        canRedo: true,
      });
    },

    redo: () => {
      const { history, document } = get();
      const [next, ...restFuture] = history.future;
      if (!next) return;

      const newFlatNodeMap = buildFlatNodeMap(next.root);

      set({
        document: next,
        flatNodeMap: newFlatNodeMap,
        history: { past: [...history.past, document], future: restFuture },
        selectedNodeId: null,
        isDirty: true,
        canUndo: true,
        canRedo: restFuture.length > 0,
      });
    },
  }));
}

function createEmptyDocument(): UIDLDocument {
  return {
    version: "1.0.0",
    id: "empty-document",
    name: "Untitled",
    root: {
      id: "root",
      type: "Container",
      props: {},
      style: {},
      children: [],
    },
  };
}

function updateNodeInTree(node: UIDLNode, targetId: string, updatedNode: UIDLNode): UIDLNode {
  if (node.id === targetId) {
    return updatedNode;
  }

  return {
    ...node,
    children: node.children?.map((child) => updateNodeInTree(child, targetId, updatedNode)),
    slots: node.slots
      ? Object.fromEntries(
          Object.entries(node.slots).map(([slotName, slotNodes]) => [
            slotName,
            slotNodes.map((slotNode) => updateNodeInTree(slotNode, targetId, updatedNode)),
          ]),
        )
      : undefined,
  };
}

function rebuildTreeFromFlatMap(flatNodeMap: Map<string, UIDLNode>, rootId: string): UIDLNode {
  const root = flatNodeMap.get(rootId);
  if (!root) throw new Error(`Root node ${rootId} not found`);

  return {
    ...root,
    children: (root.children ?? []).map((child) => rebuildTreeFromFlatMap(flatNodeMap, child.id)),
    slots: root.slots
      ? Object.fromEntries(
          Object.entries(root.slots).map(([slotName, slotNodes]) => [
            slotName,
            slotNodes.map((slotNode) => rebuildTreeFromFlatMap(flatNodeMap, slotNode.id)),
          ]),
        )
      : undefined,
  };
}
