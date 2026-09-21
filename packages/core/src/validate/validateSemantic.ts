import { RENDER_SCOPE_PREFIXES, isBindPath } from "../state/bindings";
import { ActionSchema } from "../schemas/actions";
import type { UIDLDocument, UIDLNode } from "../types";

export interface SemanticIssue {
  code:
    | "DUPLICATE_NODE_ID"
    | "EMPTY_NODE_ID"
    | "TREE_DEPTH_EXCEEDED"
    | "NODE_COUNT_EXCEEDED"
    | "UNDECLARED_DATASOURCE"
    | "INVALID_BINDING_SCOPE"
    | "MALFORMED_BINDING"
    | "UNKNOWN_ACTION_TYPE"
    | "INVALID_ACTION"
    | "UNKNOWN_COMPONENT_TYPE";
  message: string;
  path?: string;
  nodeId?: string;
}

export interface SemanticValidationOptions {
  maxDepth?: number;
  maxNodeCount?: number;
  knownComponents?: ReadonlySet<string>;
  strictComponents?: boolean;
}

export interface SemanticValidationResult {
  valid: boolean;
  issues: SemanticIssue[];
  nodeCount: number;
  maxDepth: number;
}

const DEFAULT_MAX_DEPTH = 32;
const DEFAULT_MAX_NODE_COUNT = 500;

const DEFAULT_KNOWN_COMPONENTS = new Set([
  // Layout
  "column", "row", "container", "stack", "spacer", "divider", "card",
  // Form / Inputs
  "text", "heading", "paragraph", "button", "input", "textfield", "textarea",
  "select", "checkbox", "switch", "slider", "radiogroup", "datepicker",
  // Data / Visuals
  "datatable", "table", "badge", "icon", "avatar", "image",
  "qrcodesvg", "barcodesvg", "datamatrixsvg",
  "meridianbarchart", "meridianlinechart", "meridiandonutchart",
  // Modals / Overlays
  "dialog", "drawer", "snackbar",
]);

/**
 * Normalizes a component name to lowercase alphanumeric for robust matching across
 * PascalCase, kebab-case, and lowercase variants (e.g. "DataTable" -> "datatable").
 */
function normalizeComponentName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Validates a UIDLDocument for semantic integrity, structural safety, and bounds limits.
 * Fail-closed: returns valid=false if any rule violation is detected.
 */
export function validateUidlSemantic(
  doc: UIDLDocument,
  options?: SemanticValidationOptions
): SemanticValidationResult {
  const issues: SemanticIssue[] = [];
  const maxAllowedDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxAllowedNodes = options?.maxNodeCount ?? DEFAULT_MAX_NODE_COUNT;
  const strictComponents = options?.strictComponents ?? false;
  const knownComponents = options?.knownComponents;

  const declaredDataSources = new Set<string>(
    doc.dataSources ? Object.keys(doc.dataSources) : []
  );

  const seenNodeIds = new Set<string>();
  let totalNodeCount = 0;
  let observedMaxDepth = 0;

  function checkBindings(value: unknown, currentPath: string, inActionContext = false) {
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        checkBindings(value[i], `${currentPath}[${i}]`, inActionContext);
      }
      return;
    }

    const obj = value as Record<string, unknown>;
    if ("$bind" in obj) {
      const bindTarget = obj.$bind;
      if (typeof bindTarget !== "string" || bindTarget.trim() === "") {
        issues.push({
          code: "MALFORMED_BINDING",
          message: `$bind value must be a non-empty string, received: ${JSON.stringify(bindTarget)}`,
          path: currentPath,
        });
      } else {
        const trimmed = bindTarget.trim();
        const hasValidRenderPrefix = isBindPath(trimmed);
        const hasValidActionPrefix = inActionContext && /^(event)(\..+)?$/.test(trimmed);

        if (!hasValidRenderPrefix && !hasValidActionPrefix) {
          issues.push({
            code: "INVALID_BINDING_SCOPE",
            message: `Binding path "${trimmed}" must start with a valid scope (${
              inActionContext
                ? [...RENDER_SCOPE_PREFIXES, "event"].join(", ")
                : RENDER_SCOPE_PREFIXES.join(", ")
            })`,
            path: currentPath,
          });
        }
      }
    }

    for (const [k, v] of Object.entries(obj)) {
      if (k !== "$bind") {
        checkBindings(v, `${currentPath}.${k}`, inActionContext);
      }
    }
  }

  function validateAction(action: unknown, actionPath: string, nodeId: string) {
    if (!action || typeof action !== "object") {
      issues.push({
        code: "INVALID_ACTION",
        message: `Action at ${actionPath} must be an object`,
        path: actionPath,
        nodeId,
      });
      return;
    }

    const parsed = ActionSchema.safeParse(action);
    if (!parsed.success) {
      issues.push({
        code: "UNKNOWN_ACTION_TYPE",
        message: `Invalid or unknown action at ${actionPath}: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
        path: actionPath,
        nodeId,
      });
    }

    // Check $bind inside action payloads with inActionContext=true (allows "event.*")
    checkBindings(action, actionPath, true);
  }

  function checkEvents(events: Record<string, unknown>, basePath: string, nodeId: string) {
    for (const [eventName, eventPayload] of Object.entries(events)) {
      const eventPath = `${basePath}.${eventName}`;
      if (Array.isArray(eventPayload)) {
        for (let i = 0; i < eventPayload.length; i++) {
          validateAction(eventPayload[i], `${eventPath}[${i}]`, nodeId);
        }
      } else if (eventPayload && typeof eventPayload === "object") {
        validateAction(eventPayload, eventPath, nodeId);
      }
    }
  }

  function walkNode(node: UIDLNode, currentDepth: number, nodePath: string) {
    totalNodeCount++;
    if (currentDepth > observedMaxDepth) {
      observedMaxDepth = currentDepth;
    }

    if (currentDepth > maxAllowedDepth) {
      issues.push({
        code: "TREE_DEPTH_EXCEEDED",
        message: `Tree depth of ${currentDepth} exceeds maximum allowed depth of ${maxAllowedDepth}`,
        path: nodePath,
        nodeId: node.id,
      });
    }

    if (totalNodeCount > maxAllowedNodes) {
      issues.push({
        code: "NODE_COUNT_EXCEEDED",
        message: `Total node count exceeds maximum allowed limit of ${maxAllowedNodes}`,
        path: nodePath,
        nodeId: node.id,
      });
      // Early return to prevent pathological recursion
      return;
    }

    // 1. Unique ID check
    if (!node.id || typeof node.id !== "string" || node.id.trim() === "") {
      issues.push({
        code: "EMPTY_NODE_ID",
        message: `Node at ${nodePath} has an empty or missing id`,
        path: nodePath,
      });
    } else if (seenNodeIds.has(node.id)) {
      issues.push({
        code: "DUPLICATE_NODE_ID",
        message: `Duplicate node ID "${node.id}" detected at ${nodePath}`,
        path: nodePath,
        nodeId: node.id,
      });
    } else {
      seenNodeIds.add(node.id);
    }

    // 2. Component type validation (if strict)
    if (strictComponents && node.type) {
      const normalized = normalizeComponentName(node.type);
      const isKnown = knownComponents
        ? knownComponents.has(normalized)
        : DEFAULT_KNOWN_COMPONENTS.has(normalized);

      if (!isKnown) {
        issues.push({
          code: "UNKNOWN_COMPONENT_TYPE",
          message: `Component type "${node.type}" is not recognized in component catalog`,
          path: `${nodePath}.type`,
          nodeId: node.id,
        });
      }
    }

    // 3. DataSource reference check
    if (node.props && typeof node.props === "object") {
      const dsRef = node.props.dataSource;
      if (typeof dsRef === "string" && dsRef.trim() !== "") {
        if (!declaredDataSources.has(dsRef)) {
          issues.push({
            code: "UNDECLARED_DATASOURCE",
            message: `Node "${node.id}" references dataSource "${dsRef}" which is not declared in document.dataSources`,
            path: `${nodePath}.props.dataSource`,
            nodeId: node.id,
          });
        }
      }
    }

    if (node.repeat?.dataSource) {
      const repeatDs = node.repeat.dataSource;
      if (typeof repeatDs === "string" && repeatDs.trim() !== "") {
        if (!declaredDataSources.has(repeatDs)) {
          issues.push({
            code: "UNDECLARED_DATASOURCE",
            message: `Node "${node.id}" repeat references dataSource "${repeatDs}" which is not declared in document.dataSources`,
            path: `${nodePath}.repeat.dataSource`,
            nodeId: node.id,
          });
        }
      }
    }

    // 4. Bindings check in props, style, bindings
    if (node.props) {
      checkBindings(node.props, `${nodePath}.props`);
    }
    if (node.style) {
      checkBindings(node.style, `${nodePath}.style`);
    }
    if (node.bindings) {
      checkBindings(node.bindings, `${nodePath}.bindings`);
    }

    // 5. Events / actions check
    if (node.events) {
      checkEvents(node.events, `${nodePath}.events`, node.id);
    }

    // Walk children
    if (Array.isArray(node.children)) {
      for (let i = 0; i < node.children.length; i++) {
        walkNode(node.children[i], currentDepth + 1, `${nodePath}.children[${i}]`);
      }
    }

    // Walk slots
    if (node.slots && typeof node.slots === "object") {
      for (const [slotName, slotNodes] of Object.entries(node.slots)) {
        if (Array.isArray(slotNodes)) {
          for (let i = 0; i < slotNodes.length; i++) {
            walkNode(slotNodes[i], currentDepth + 1, `${nodePath}.slots.${slotName}[${i}]`);
          }
        }
      }
    }
  }

  // Walk root
  if (doc.root && typeof doc.root === "object") {
    walkNode(doc.root, 1, "root");
  }

  // Walk definitions (templates/reusable nodes)
  if (doc.definitions && typeof doc.definitions === "object") {
    for (const [defKey, defNode] of Object.entries(doc.definitions)) {
      if (defNode && typeof defNode === "object") {
        walkNode(defNode, 1, `definitions.${defKey}`);
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    nodeCount: totalNodeCount,
    maxDepth: observedMaxDepth,
  };
}
