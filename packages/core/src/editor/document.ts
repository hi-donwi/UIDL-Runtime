import type { UIDLNode } from "../types";
import { evaluate, type RenderScope } from "../expr/evaluate";

export function buildFlatNodeMap(root: UIDLNode): Map<string, UIDLNode> {
  const map = new Map<string, UIDLNode>();

  function traverse(node: UIDLNode): void {
    map.set(node.id, node);

    for (const child of node.children ?? []) {
      traverse(child);
    }

    for (const slotNodes of Object.values(node.slots ?? {})) {
      for (const slotNode of slotNodes) {
        traverse(slotNode);
      }
    }
  }

  traverse(root);
  return map;
}

export function buildNestedTree(flatMap: Map<string, UIDLNode>, rootId: string): UIDLNode {
  const root = flatMap.get(rootId);
  if (!root) {
    throw new Error(`Root node ${rootId} not found in flat map`);
  }

  return {
    ...root,
    children: (root.children ?? []).map((child) => buildNestedTree(flatMap, child.id)),
    slots: root.slots
      ? Object.fromEntries(
          Object.entries(root.slots).map(([slotName, slotNodes]) => [
            slotName,
            slotNodes.map((slotNode) => buildNestedTree(flatMap, slotNode.id)),
          ]),
        )
      : undefined,
  };
}

export function findNodeById(flatMap: Map<string, UIDLNode>, nodeId: string): UIDLNode | undefined {
  return flatMap.get(nodeId);
}

export function findParentId(flatMap: Map<string, UIDLNode>, nodeId: string): string | undefined {
  for (const [id, node] of flatMap.entries()) {
    if ((node.children ?? []).some((child) => child.id === nodeId)) {
      return id;
    }
    if (node.slots) {
      for (const slotNodes of Object.values(node.slots)) {
        if (slotNodes.some((child) => child.id === nodeId)) {
          return id;
        }
      }
    }
  }
  return undefined;
}

export function removeChildFromNode(parent: UIDLNode, nodeId: string): UIDLNode {
  if (parent.children?.some((child) => child.id === nodeId)) {
    return {
      ...parent,
      children: parent.children.filter((child) => child.id !== nodeId),
    };
  }

  if (parent.slots) {
    for (const [slotName, slotNodes] of Object.entries(parent.slots)) {
      if (slotNodes.some((child) => child.id === nodeId)) {
        return {
          ...parent,
          slots: {
            ...parent.slots,
            [slotName]: slotNodes.filter((child) => child.id !== nodeId),
          },
        };
      }
    }
  }

  return parent;
}

export function findNodePath(flatMap: Map<string, UIDLNode>, nodeId: string): string[] {
  const path: string[] = [];
  let currentId: string | undefined = nodeId;

  while (currentId) {
    path.unshift(currentId);
    const parentId = findParentId(flatMap, currentId);
    currentId = parentId;
  }

  return path;
}

export function getNodeDepth(flatMap: Map<string, UIDLNode>, nodeId: string): number {
  return findNodePath(flatMap, nodeId).length - 1;
}

export function isNodeVisible(node: UIDLNode, scope?: RenderScope): boolean {
  if (!node.visibility) return true;
  const condition = node.visibility.condition;
  if (!condition) return true;
  const result = evaluate(condition, scope ?? {});
  return Boolean(result);
}
