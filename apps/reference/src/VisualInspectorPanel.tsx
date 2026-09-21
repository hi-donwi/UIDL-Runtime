import { useEffect, useState } from "react";
import type { UIDLDocument, UIDLNode } from "~/types";
import { Icon } from "~/components/icons";

export interface VisualInspectorPanelProps {
  document: UIDLDocument;
  selectedNodeId: string | null;
  onSelectNodeId: (id: string | null) => void;
  onUpdateNode: (updatedNode: UIDLNode) => void;
  onClose: () => void;
  isDark?: boolean;
}

function findNodeById(node: UIDLNode, id: string): UIDLNode | null {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

function collectAllNodes(node: UIDLNode, depth = 0): { node: UIDLNode; depth: number }[] {
  const result: { node: UIDLNode; depth: number }[] = [{ node, depth }];
  if (node.children) {
    for (const child of node.children) {
      result.push(...collectAllNodes(child, depth + 1));
    }
  }
  return result;
}

export function VisualInspectorPanel({
  document,
  selectedNodeId,
  onSelectNodeId,
  onUpdateNode,
  onClose,
  isDark = false,
}: VisualInspectorPanelProps) {
  const allNodes = collectAllNodes(document.root);
  const activeNodeId = selectedNodeId || document.root.id;
  const activeNode = findNodeById(document.root, activeNodeId);

  const [editLabel, setEditLabel] = useState(() =>
    String(activeNode?.props?.value ?? activeNode?.props?.label ?? activeNode?.props?.title ?? "")
  );
  const [editVariant, setEditVariant] = useState(() =>
    String(activeNode?.props?.variant ?? "")
  );

  useEffect(() => {
    if (activeNode) {
      queueMicrotask(() => {
        setEditLabel(String(activeNode.props?.value ?? activeNode.props?.label ?? activeNode.props?.title ?? ""));
        setEditVariant(String(activeNode.props?.variant ?? ""));
      });
    }
  }, [activeNodeId, activeNode]);

  const handleApplyChanges = () => {
    if (!activeNode) return;
    const updated: UIDLNode = {
      ...activeNode,
      props: {
        ...activeNode.props,
        ...(activeNode.type === "Text" ? { value: editLabel || activeNode.props?.value } : {}),
        ...(activeNode.type === "Button" ? { label: editLabel || activeNode.props?.label, variant: editVariant || activeNode.props?.variant } : {}),
        ...(activeNode.type === "DataTable" ? { title: editLabel || activeNode.props?.title } : {}),
      },
    };
    onUpdateNode(updated);
  };

  const inputClass = `w-full rounded border px-2.5 py-1.5 text-xs outline-none ${
    isDark ? "border-gray-700 bg-gray-900 text-gray-100 focus:border-indigo-500" : "border-gray-300 bg-white text-gray-800 focus:border-indigo-600"
  }`;

  return (
    <aside
      className={`w-80 flex flex-col border-l shadow-lg transition-all ${
        isDark ? "border-gray-800 bg-[#151b23] text-gray-100" : "border-gray-200 bg-white text-gray-900"
      }`}
    >
      {/* Inspector Header */}
      <div className={`flex items-center justify-between border-b px-4 py-3 ${isDark ? "border-gray-800 bg-[#1c2430]" : "border-gray-100 bg-gray-50"}`}>
        <div className="flex items-center gap-2">
          <Icon name="wrench" className="h-4 w-4 text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Visual Inspector</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className={`rounded p-1 text-xs ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-200 text-gray-600"}`}
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      {/* Component Tree View */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Component Hierarchy Tree</label>
        <div className="max-h-36 overflow-y-auto space-y-1">
          {allNodes.map(({ node, depth }) => {
            const isSelected = node.id === activeNodeId;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => {
                  onSelectNodeId(node.id);
                  if (node.type === "Text") setEditLabel(String(node.props?.value ?? ""));
                  if (node.type === "Button") setEditLabel(String(node.props?.label ?? ""));
                  if (node.type === "DataTable") setEditLabel(String(node.props?.title ?? ""));
                }}
                style={{ paddingLeft: `${depth * 12 + 6}px` }}
                className={`flex w-full items-center justify-between rounded py-1 pr-2 text-left text-xs font-mono transition-colors ${
                  isSelected
                    ? "bg-indigo-600 text-white font-bold"
                    : isDark
                    ? "text-gray-300 hover:bg-gray-800/60"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span>&lt;{node.type}&gt;</span>
                <span className="text-[10px] opacity-70 truncate max-w-[90px]">{node.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Property Editor for Active Node */}
      {activeNode ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Node ID & Type</label>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-400">{activeNode.type}</span>
              <span className="font-mono text-xs text-gray-400">{activeNode.id}</span>
            </div>
          </div>

          {(activeNode.type === "Text" || activeNode.type === "Button" || activeNode.type === "DataTable") && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                {activeNode.type === "Text" ? "Text Value" : activeNode.type === "Button" ? "Button Label" : "Table Title"}
              </label>
              <input
                type="text"
                placeholder={String(activeNode.props?.value ?? activeNode.props?.label ?? activeNode.props?.title ?? "")}
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          {activeNode.type === "Button" && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Variant</label>
              <select
                value={editVariant || String(activeNode.props?.variant ?? "primary")}
                onChange={(e) => setEditVariant(e.target.value)}
                className={inputClass}
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="outline">Outline</option>
                <option value="destructive">Destructive</option>
              </select>
            </div>
          )}

          {activeNode.style && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Inline / Tailwind Styles</label>
              <pre className={`rounded p-2 text-[10px] font-mono ${isDark ? "bg-gray-900 text-gray-300" : "bg-gray-100 text-gray-700"}`}>
                {JSON.stringify(activeNode.style, null, 2)}
              </pre>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleApplyChanges}
              className="flex items-center justify-center gap-1.5 w-full rounded bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-indigo-500 transition-colors"
            >
              <Icon name="bolt" className="h-3.5 w-3.5" />
              <span>Sinkronkan ke JSON Editor</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-gray-400">
          Pilih salah satu komponen pada daftar hierarki di atas untuk mengedit properti secara visual.
        </div>
      )}
    </aside>
  );
}
