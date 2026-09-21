import React, { useCallback, useMemo } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { UIDLNode } from "../types";

export interface LayerTreeProps {
  root: UIDLNode;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onHoverNode: (nodeId: string | null) => void;
  onMoveNode?: (nodeId: string, targetParentId: string, index?: number) => void;
  className?: string;
}

export function LayerTree({
  root,
  selectedNodeId,
  hoveredNodeId,
  onSelectNode,
  onHoverNode,
  onMoveNode,
  className,
}: LayerTreeProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const flattenedNodes = useMemo(() => {
    const nodes: Array<{ id: string; node: UIDLNode; level: number }> = [];
    function traverse(node: UIDLNode, level: number) {
      nodes.push({ id: node.id, node, level });
      for (const child of node.children ?? []) {
        traverse(child, level + 1);
      }
    }
    traverse(root, 0);
    return nodes;
  }, [root]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      const activeItem = flattenedNodes.find((n) => n.id === active.id);
      if (!activeItem) return;

      const overItem = flattenedNodes.find((n) => n.id === over.id);
      if (!overItem) return;

      const isOverChild = overItem.node.children?.some((child) => child.id === active.id);
      if (isOverChild) return;

      const targetParentId = overItem.node.id;
      const targetIndex = overItem.node.children?.length ?? 0;

      onMoveNode?.(active.id as string, targetParentId, targetIndex);
    },
    [flattenedNodes, onMoveNode],
  );

  return (
    <div className={`flex h-full flex-col border-r border-border ${className ?? ""}`}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">Layers</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={flattenedNodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
            {flattenedNodes.map(({ id, node, level }) => (
              <SortableTreeNode
                key={id}
                id={id}
                node={node}
                level={level}
                selectedNodeId={selectedNodeId}
                hoveredNodeId={hoveredNodeId}
                onSelectNode={onSelectNode}
                onHoverNode={onHoverNode}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <div className="rounded-md bg-accent/10 px-2 py-1.5 text-sm text-accent">
                {flattenedNodes.find((n) => n.id === activeId)?.node.type}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

interface SortableTreeNodeProps {
  id: string;
  node: UIDLNode;
  level: number;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onHoverNode: (nodeId: string | null) => void;
}

function SortableTreeNode({
  id,
  node,
  level,
  selectedNodeId,
  hoveredNodeId,
  onSelectNode,
  onHoverNode,
}: SortableTreeNodeProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const isSelected = selectedNodeId === node.id;
  const isHovered = hoveredNodeId === node.id;

  const style: React.CSSProperties = {
    paddingLeft: `${level * 16 + 8}px`,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectNode(node.id);
    },
    [node.id, onSelectNode],
  );

  const handleMouseEnter = useCallback(
    () => onHoverNode(node.id),
    [node.id, onHoverNode],
  );

  const handleMouseLeave = useCallback(
    () => onHoverNode(null),
    [onHoverNode],
  );

  return (
    <div ref={setNodeRef} style={style}>
      <div
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer
          transition-colors
          ${isSelected ? "bg-accent/10 text-accent" : "text-text-primary hover:bg-surface-hover"}
          ${isHovered && !isSelected ? "bg-surface-hover" : ""}
        `}
        {...attributes}
        {...listeners}
      >
        <span className="text-xs text-text-muted">{node.type}</span>
        {node.name && (
          <span className="truncate text-sm text-text-secondary">{node.name}</span>
        )}
        {!node.name && (
          <span className="truncate text-sm text-text-muted">{node.id}</span>
        )}
      </div>
    </div>
  );
}
