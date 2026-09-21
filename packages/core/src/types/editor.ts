import type { UIDLDocument, UIDLNode } from "./index";

export interface EditorDocument {
  document: UIDLDocument;
  flatNodeMap: Map<string, UIDLNode>;
}

export interface EditorState {
  document: EditorDocument;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  activeBreakpoint: BreakpointId;
  themeMode: "light" | "dark";
  panelVisibility: PanelVisibility;
  validationErrors: ValidationError[];
  isDirty: boolean;
}

export type BreakpointId = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface PanelVisibility {
  palette: boolean;
  layers: boolean;
  properties: boolean;
  style: boolean;
}

export interface ValidationError {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface EditorAction {
  type:
    | "selectNode"
    | "hoverNode"
    | "updateNode"
    | "addChild"
    | "deleteNode"
    | "moveNode"
    | "setBreakpoint"
    | "setThemeMode"
    | "togglePanel"
    | "setDocument"
    | "setValidationErrors"
    | "markClean";
  payload?: unknown;
}

export interface UpdateNodePayload {
  nodeId: string;
  changes: Partial<UIDLNode>;
}

export interface AddChildPayload {
  parentId: string;
  childType: string;
  index?: number;
}

export interface MoveNodePayload {
  nodeId: string;
  targetParentId: string;
  index?: number;
}
