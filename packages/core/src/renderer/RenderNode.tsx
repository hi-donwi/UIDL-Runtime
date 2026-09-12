import React from "react";
import type { ComponentRegistry, ComponentVariant, UIDLNode, Theme } from "../types";
import { defaultRegistry } from "../registry/registry";
import { createThemeEngine } from "../theme/engine";
import { normalizeNodeResponsive } from "../utils/responsive";
import { resolveClassName, resolveVisibility as resolveBreakpointVisibility } from "../utils/tailwind";
import { cn } from "../utils/cn";
import { evaluate, type RenderScope as ExprRenderScope } from "../expr/evaluate";
import type { ActionInterpreter } from "../actions/interpreter";
import type { Action } from "../types/actions";
import { instantiateComponent } from "./instantiateComponent";

interface RenderScope extends ExprRenderScope {
  theme?: Theme;
  local?: Record<string, unknown>;
  index?: number;
  actionInterpreter?: ActionInterpreter;
  registry?: ComponentRegistry;
  definitions?: Record<string, UIDLNode>;
  /** componentIds currently being expanded, ancestor-first — used to detect circular references. */
  componentStack?: string[];
}

const FORM_WIDGETS = new Set(["TextField", "Checkbox", "Switch", "Slider", "Select", "Textarea", "RadioGroup"]);

/**
 * Events whose handler is called with the value itself, not a DOM event. Named rather than
 * inferred from the widget so a document's `{ setState: { value: null } }` keeps one meaning:
 * "whatever this event carried".
 */
const VALUE_EVENTS = new Set(["onPageChange", "onPageSizeChange"]);

export function renderNode(node: UIDLNode, scope: RenderScope = {}): React.ReactNode {
  if (node.componentId) {
    if (scope.componentStack?.includes(node.componentId)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[uidl-runtime] Circular componentId reference detected: ${[...scope.componentStack, node.componentId].join(" -> ")}`,
        );
      }
      return null;
    }

    const definition = scope.definitions?.[node.componentId];
    if (!definition) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[uidl-runtime] Unknown componentId: ${node.componentId}`);
      }
      return null;
    }

    const instance = instantiateComponent(node, definition);
    return renderNode(instance, {
      ...scope,
      componentStack: [...(scope.componentStack ?? []), node.componentId],
    });
  }

  const registry = scope.registry ?? defaultRegistry;
  const entry = registry.get(node.type);

  if (!entry) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[uidl-runtime] Unknown node type: ${node.type}`);
    }
    return null;
  }

  const normalized = normalizeNodeResponsive(node);

  const visibility = resolveVisibility(normalized, scope);
  if (!visibility) {
    return null;
  }

  if (normalized.repeat) {
    let dataSource: unknown[] | undefined;

    if (Array.isArray(normalized.repeat.dataSource)) {
      dataSource = normalized.repeat.dataSource;
    } else if (typeof normalized.repeat.dataSource === "string" && scope.data) {
      const resolved = scope.data[normalized.repeat.dataSource];
      if (Array.isArray(resolved)) {
        dataSource = resolved;
      }
    }

    if (dataSource) {
      const itemName = (normalized.repeat.itemName as string) ?? "item";
      return dataSource.map((item, index) => {
        const itemId = `${normalized.id}-repeat-${index}`;
        return (
          <React.Fragment key={itemId}>
            {renderNode(
              {
                ...normalized,
                id: itemId,
                repeat: undefined,
                props: {
                  ...normalized.props,
                  [itemName]: item,
                },
              },
              {
                ...scope,
                local: { ...scope.local, [itemName]: item, index },
              },
            )}
          </React.Fragment>
        );
      });
    }
  }

  const themeEngine = scope.theme ? createThemeEngine(scope.theme) : undefined;

  let variant: ComponentVariant | undefined;
  if (normalized.themeRef && themeEngine) {
    variant = themeEngine.resolveComponentVariant(normalized.type, normalized.themeRef);
  }

  const mergedStyle = { ...variant?.style, ...(normalized.style ?? {}) };
  const mergedProps = { ...variant?.props, ...(normalized.props ?? {}) };

  const props = resolveDataSourceProps(resolveProps(mergedProps, scope), scope);
  const styleClassName = themeEngine
    ? themeEngine.resolveStyleIntent(mergedStyle as never)
    : resolveClassName(mergedStyle);
  const inlineStyle = themeEngine ? themeEngine.resolveInlineStyle(mergedStyle as never) : {};
  const handlers = resolveEvents(normalized.events ?? {}, scope.actionInterpreter, normalized.type);

  const breakpointVisibilityClassName = resolveBreakpointVisibility(normalized.visibility);

  const className = cn(
    variant?.className,
    styleClassName,
    breakpointVisibilityClassName,
    props.className as string | undefined,
  );

  const propsStyle = typeof props.style === "object" && props.style !== null ? props.style : undefined;
  const finalStyle = { ...inlineStyle, ...propsStyle };

  const Component = entry.component;

  return (
    <Component
      {...props}
      data-node-id={normalized.id}
      data-testid={normalized.testId}
      className={className || undefined}
      style={Object.keys(finalStyle).length > 0 ? finalStyle : undefined}
      {...handlers}
    >
      {normalized.children?.map((child) => (
        <React.Fragment key={child.id}>
          {renderNode(child, scope)}
        </React.Fragment>
      ))}
      {normalized.slots &&
        Object.entries(normalized.slots).map(([slotName, slotNodes]) => (
          <React.Fragment key={slotName}>
            {slotNodes.map((slotNode) => (
              <React.Fragment key={slotNode.id}>
                {renderNode(slotNode, scope)}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
    </Component>
  );
}

function resolveProps(
  props: Record<string, unknown>,
  scope: RenderScope,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (value && typeof value === "object" && "$bind" in value) {
      const bindPath = (value as { $bind: string }).$bind;
      resolved[key] = resolveBinding(bindPath, scope);
    } else if (value && typeof value === "object" && "$expr" in value) {
      resolved[key] = evaluate((value as { $expr: unknown }).$expr, scope);
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

function resolveDataSourceProps(
  props: Record<string, unknown>,
  scope: RenderScope,
): Record<string, unknown> {
  if (typeof props.dataSource !== "string" || props.rows !== undefined) {
    return props;
  }

  const rows = scope.data?.[props.dataSource];
  if (!Array.isArray(rows)) {
    return props;
  }

  return { ...props, rows };
}

function resolveBinding(path: string, scope: RenderScope): unknown {
  if (path.startsWith("local.") && scope.local) {
    const localKey = path.replace("local.", "");
    return getByPath(scope.local, localKey);
  }
  if (path.startsWith("state.") && scope.state) {
    const stateKey = path.replace("state.", "");
    return getByPath(scope.state, stateKey);
  }
  if (path.startsWith("session.") && scope.session) {
    const sessionKey = path.replace("session.", "");
    return getByPath(scope.session, sessionKey);
  }
  if (path.startsWith("route.") && scope.route) {
    const routeKey = path.replace("route.", "");
    return getByPath(scope.route, routeKey);
  }
  if (path.startsWith("data.") && scope.data) {
    const dataKey = path.replace("data.", "");
    return getByPath(scope.data, dataKey);
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[uidl-runtime] Unrecognized binding prefix in path: ${path}`);
  }
  return undefined;
}

function resolveVisibility(node: UIDLNode, scope: RenderScope): boolean {
  const condition = node.visibility?.condition;
  if (!condition) return true;
  return Boolean(evaluate(condition, scope));
}

function resolveEvents(
  events: Record<string, unknown>,
  interpreter?: ActionInterpreter,
  nodeType?: string,
): Record<string, unknown> {
  const handlers: Record<string, unknown> = {};

  // DataTable row actions are matched by name (DataTableAction.event) against this same `events`
  // map, not by native DOM event name — the generic loop below only understands onClick/onChange/
  // etc. shaped handlers, so DataTable is handled separately and returns early: running the
  // generic loop too would also attach e.g. `handlers.onOpen` as a literal prop, which React
  // warns about as an unrecognized DOM event handler on the underlying <section>.
  if (nodeType === "DataTable") {
    if (interpreter) {
      handlers.onRowAction = (row: Record<string, unknown>, action: { label: string; event?: string }) => {
        const eventKey = action.event ?? (events["onRowAction"] ? "onRowAction" : action.label);
        const actionPayload = events[eventKey] ?? events["onRowAction"] ?? events[action.label];
        if (!actionPayload) return;
        const sequence = Array.isArray(actionPayload) ? (actionPayload as Action[]) : [actionPayload as Action];
        interpreter.execute({ sequence }, row);
      };
      // Meridian opens a document by clicking its row, not a per-row button, so `onOpen` has to
      // reach the widget as a row handler too — the same event key either affordance fires.
      if (Array.isArray(events["onOpen"])) {
        handlers.onRowOpen = (row: Record<string, unknown>) => {
          interpreter.execute({ sequence: events["onOpen"] as Action[] }, row);
        };
      }
    }
    return handlers;
  }

  for (const [event, action] of Object.entries(events)) {
    if (!interpreter || !Array.isArray(action)) {
      continue;
    }

    const createHandler = (actionPayload: Action[], extractValue?: (e: React.ChangeEvent) => unknown) => {
      return (e: React.ChangeEvent) => {
        const value = extractValue?.(e);
        interpreter.execute({ sequence: actionPayload }, value);
      };
    };

    if (event === "onChange" && nodeType && FORM_WIDGETS.has(nodeType)) {
      const extractValue = getValueExtractor(nodeType);
      handlers[event] = createHandler(action, extractValue);
    } else if (VALUE_EVENTS.has(event)) {
      // Widgets that hand their handler a plain value rather than a DOM event — PageBar's
      // page number, for instance. Without this the value never reaches `setState`'s
      // `value: null` ("use what the event carried") and the action wrote undefined.
      handlers[event] = createHandler(action, (value) => value as unknown);
    } else {
      handlers[event] = createHandler(action);
    }
  }

  return handlers;
}

function getValueExtractor(nodeType: string): ((e: React.ChangeEvent) => unknown) | undefined {
  switch (nodeType) {
    case "TextField":
      return (e) => (e.target as HTMLInputElement).value;
    case "Checkbox":
      return (e) => (e.target as HTMLInputElement).checked;
    case "Switch":
      return () => undefined;
    case "Slider":
      return (e) => Number((e.target as HTMLInputElement).value);
    case "Select":
      return (e) => (e.target as HTMLSelectElement).value;
    case "Textarea":
      return (e) => (e.target as HTMLTextAreaElement).value;
    case "RadioGroup":
      return (e) => (e.target as HTMLInputElement).value;
    default:
      return undefined;
  }
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return current;
}
