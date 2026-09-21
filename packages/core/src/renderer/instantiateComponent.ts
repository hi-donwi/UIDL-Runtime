import type { UIDLNode } from "../types";

/**
 * Recursively re-namespaces every id in a definition sub-tree so that using the same
 * `componentId` more than once in a document doesn't produce duplicate `data-node-id`s in the
 * DOM. The sub-tree's own root gets the instance's own id (so click-to-select and `data-testid`
 * queries against the instance node keep working); every descendant becomes
 * `${instanceId}__${originalId}` (same separator convention as the `repeat` id scheme in
 * RenderNode.tsx).
 */
function namespaceDefinitionIds(node: UIDLNode, instanceId: string, isRoot: boolean): UIDLNode {
  return {
    ...node,
    id: isRoot ? instanceId : `${instanceId}__${node.id}`,
    children: node.children?.map((child) => namespaceDefinitionIds(child, instanceId, false)),
    slots: node.slots
      ? Object.fromEntries(
          Object.entries(node.slots).map(([slotName, slotNodes]) => [
            slotName,
            slotNodes.map((slotNode) => namespaceDefinitionIds(slotNode, instanceId, false)),
          ]),
        )
      : undefined,
  };
}

/**
 * Merges an instance node (a node with `componentId` set, plus whatever `props`/`style`/etc it
 * carries) onto its definition (the named sub-tree from `document.definitions`), producing the
 * node to actually render. The instance always wins on conflicts — same "instance overrides
 * template" convention as `variant.style`/`node.style` for `themeRef` in RenderNode.tsx.
 *
 * - `props`/`style`/`events`/`bindings`: shallow-merged, instance keys win.
 * - `slots`: shallow-merged by slot name, instance's slot content replaces the definition's
 *   default content for that name; slot names the instance doesn't mention keep the
 *   definition's own content. (Slots always render after children, in whatever position
 *   RenderNode.tsx already renders them — this does not add interleaved/positioned slots.)
 * - `children`: the instance's children *replace* the definition's entirely when the instance
 *   provides any; otherwise the definition's own (default/example) children are used.
 * - Everything else the instance doesn't specify (type, responsive, repeat, themeRef, testId,
 *   visibility) falls back to the definition's value.
 */
export function instantiateComponent(instanceNode: UIDLNode, definition: UIDLNode): UIDLNode {
  const namespaced = namespaceDefinitionIds(definition, instanceNode.id, true);

  const slots =
    namespaced.slots || instanceNode.slots
      ? { ...namespaced.slots, ...instanceNode.slots }
      : undefined;

  return {
    ...namespaced,
    id: instanceNode.id,
    name: instanceNode.name ?? namespaced.name,
    componentId: undefined,
    props: { ...namespaced.props, ...instanceNode.props },
    style: { ...namespaced.style, ...instanceNode.style },
    events: { ...namespaced.events, ...instanceNode.events },
    bindings: { ...namespaced.bindings, ...instanceNode.bindings },
    responsive: instanceNode.responsive ?? namespaced.responsive,
    visibility: instanceNode.visibility ?? namespaced.visibility,
    repeat: instanceNode.repeat ?? namespaced.repeat,
    themeRef: instanceNode.themeRef ?? namespaced.themeRef,
    testId: instanceNode.testId ?? namespaced.testId,
    children: instanceNode.children ?? namespaced.children,
    slots,
  };
}
