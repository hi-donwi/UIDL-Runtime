/**
 * Public tree recipe — free of demo, company, and host-specific code.
 *
 * Tree must not fall back to generic list; must use TreeView with
 * hierarchical nodes, not a flat DataTable.
 */

import type { UIDLDocument, UIDLNode } from "../types";
import type { Language } from "../utils/i18n";
import { validateHostCapabilities, type HostCapabilities, type RoutePolicy, type TreePageMeta, type UiPolicy } from "./types.js";

export interface CompileTreeOptions {
  hostCapabilities: HostCapabilities;
  uiPolicy?: UiPolicy;
  routePolicy?: RoutePolicy;
  docId?: string;
  extraHeaderActions?: UIDLNode[];
}

const BORDER_COLOR = "{primitives.color.border}";

function pageHeader(title: string, actions: UIDLNode[]): UIDLNode {
  return {
    id: "tree-header",
    type: "Navbar",
    style: { justifyContent: "space-between", alignItems: "center", padding: "px-4", height: "h-row-large", borderWidth: "border-b", borderColor: BORDER_COLOR },
    children: [
      { id: "tree-header-title", type: "Text", props: { value: title, heading: 1 }, style: { fontSize: "text-xl", fontWeight: 600 } },
      { id: "tree-header-actions", type: "Toolbar", style: { display: "flex", gap: "gap-2" }, children: actions },
    ],
  };
}



export function compileTreePage(meta: TreePageMeta, options: CompileTreeOptions): UIDLDocument {
  const gate = validateHostCapabilities({ recipe: "tree", meta: meta as unknown as never, hostCapabilities: options.hostCapabilities } as never);
  if (gate.length > 0) throw new Error(`compileTreePage: hostCapabilities rejected: ${gate.map((i) => i.message).join("; ")}`);

  const lang: Language = options.uiPolicy?.lang ?? "id";
  const docId = options.docId ?? `tree-${meta.name.toLowerCase()}`;
  const title = meta.label[lang] ?? meta.name;

  // Build TreeView data — hierarchical nodes as-is, plus state for selected key
  const state: Record<string, unknown> = { selectedKey: "", search: "" };

  const createButton: UIDLNode = {
    id: "tree-create-btn",
    type: "Button",
    props: { label: lang === "id" ? `+ ${meta.label.id}` : `+ New ${meta.label.en}`, variant: "primary" },
    events: { onClick: [{ navigate: { route: `${options.routePolicy?.formBase ?? "/app/edit"}/${meta.name}/new`.replace("//", "/") } }] },
  };

  const searchNode: UIDLNode = {
    id: "tree-search",
    type: "TextField",
    style: { width: "w-64" },
    props: { placeholder: lang === "id" ? "Cari…" : "Search…", value: { $bind: "state.search" } },
    events: { onChange: [{ setState: { path: "search", value: null } }] },
  };

  // TreeView expects nodes as hierarchical array; we pass meta.nodes directly as dataSource rows or inline
  // For public compiler, we inline nodes as dataSource for preview; host adapter can replace via $query if needed
  // Map TreePageMeta nodes (key/label/children) to TreeNodeItem (id/label/children) for the TreeView component
  const toTreeItem = (node: TreePageMeta["nodes"][number]): Record<string, unknown> => ({
    id: node.key,
    label: node.label[lang] ?? node.key,
    children: node.children?.map(toTreeItem),
  });
  const treeItems = meta.nodes.map(toTreeItem);

  const treeViewNode: UIDLNode = {
    id: "tree-view",
    type: "TreeView",
    props: {
      title,
      items: treeItems,
    },
    events: {
      onNodeClick: [{ setState: { path: "selectedKey", value: { $bind: "event.id" } } }],
    },
    style: { width: "w-full", padding: "p-4" },
  };

  const detailPanel: UIDLNode = {
    id: "tree-detail",
    type: "Column",
    style: { padding: "p-4", gap: "gap-2", borderWidth: "border", borderColor: BORDER_COLOR, borderRadius: "{primitives.radius.md}" },
    children: [
      { id: "tree-detail-title", type: "Text", props: { value: { $bind: "state.selectedKey" } }, style: { fontSize: "text-lg", fontWeight: 600 } },
      { id: "tree-detail-placeholder", type: "Text", props: { value: lang === "id" ? "Pilih node untuk melihat detail" : "Select a node to view details" }, style: { color: "{primitives.color.text-secondary}", fontSize: "text-sm" } },
    ],
  };

  return {
    version: "1.0.0",
    id: docId,
    name: title,
    state,
    dataSources: { nodes: treeItems },
    root: {
      id: "page",
      type: "Column",
      style: { fontSize: "text-base", width: "w-full" },
      children: [
        pageHeader(title, [createButton, ...(options.extraHeaderActions ?? [])]),
        {
          id: "tree-toolbar",
          type: "Toolbar",
          style: { display: "flex", gap: "gap-3", padding: "p-4", borderWidth: "border-b", borderColor: BORDER_COLOR },
          children: [searchNode],
        },
        {
          id: "tree-layout",
          type: "Row",
          style: { display: "flex", gap: "gap-4", padding: "p-4" },
          children: [
            { id: "tree-pane", type: "Container", style: { width: "w-1/3", borderWidth: "border", borderColor: BORDER_COLOR, borderRadius: "{primitives.radius.md}" }, children: [treeViewNode] },
            { id: "detail-pane", type: "Container", style: { width: "w-2/3" }, children: [detailPanel] },
          ],
        },
      ],
    },
  };
}
