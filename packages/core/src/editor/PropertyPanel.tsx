import { useCallback } from "react";
import type { UIDLNode } from "../types";

export interface PropertyPanelProps {
  node: UIDLNode | null;
  onUpdateNode: (nodeId: string, changes: Partial<UIDLNode>) => void;
  className?: string;
}

export function PropertyPanel({ node, onUpdateNode, className }: PropertyPanelProps) {
  const handleChange = useCallback(
    (field: keyof UIDLNode, value: unknown) => {
      if (!node) return;
      onUpdateNode(node.id, { [field]: value });
    },
    [node, onUpdateNode],
  );

  if (!node) {
    return (
      <div className={`flex h-full flex-col border-r border-border ${className ?? ""}`}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">Properties</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-text-secondary">Select a node to edit its properties.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col border-r border-border ${className ?? ""}`}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">Properties</h2>
        <p className="mt-1 text-xs text-text-secondary">{node.type}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">ID</label>
          <input
            type="text"
            value={node.id}
            disabled
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-muted"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
          <input
            type="text"
            value={node.type}
            disabled
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-muted"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Name</label>
          <input
            type="text"
            value={node.name ?? ""}
            onChange={(e) => handleChange("name", e.target.value || undefined)}
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
            placeholder="Node name"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Theme Ref</label>
          <input
            type="text"
            value={node.themeRef ?? ""}
            onChange={(e) => handleChange("themeRef", e.target.value || undefined)}
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
            placeholder="variant name"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Test ID</label>
          <input
            type="text"
            value={node.testId ?? ""}
            onChange={(e) => handleChange("testId", e.target.value || undefined)}
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
            placeholder="data-testid"
          />
        </div>
      </div>
    </div>
  );
}
