import React from "react";
import type { ComponentRegistry, UIDLDocument, Theme } from "../types";
import { renderNode } from "./RenderNode";
import { getTheme } from "../theme/registry";
import { themeToCssVariablesMap } from "../theme/tailwind";
import type { DocumentStateStore } from "../state/createDocumentState";
import { isQueryDataSource } from "../state/dataSources";
import { createEventBus, type EventBus } from "../actions/eventBus";
import { ActionInterpreter, type ApiAllowlist } from "../actions/interpreter";
import type { DataAdapter } from "../data/types";
import type { CommandHandler, MutationHandler } from "../types/actions";

export interface RenderOptions {
  theme?: Theme;
  stateStore?: DocumentStateStore;
  session?: Record<string, unknown>;
  dataSources?: Record<string, unknown>;
  /**
   * A `DataAdapter` to resolve `{"$query": {...}}` entries in `dataSources` against. Only
   * `<UIDocumentRenderer />` actually issues the fetches (it owns the effect loop that reruns a
   * query when its `$bind`-resolved params change); passing this to `renderUIDocument` still
   * lets its single pass render the `state.$data.<name>.status === "loading"` placeholder
   * correctly, but nothing will ever resolve it — see the `$query`-without-Renderer warning
   * below.
   */
  dataAdapter?: DataAdapter;
  /**
   * Host-owned handler for UIDL `mutate` actions. Wire this to an adapter-backed domain service
   * in demos, and later to the same HTTP contract, so business writes stay outside components.
   */
  mutationHandler?: MutationHandler;
  /** Host-owned handler for UIDL `command` actions. Unset means commands are disabled. */
  commandHandler?: CommandHandler;
  onRouteChange?: (route: string | Record<string, unknown>) => void;
  registry?: ComponentRegistry;
  /**
   * Hosts a document's `api` actions are allowed to call. `api` actions refuse to run unless
   * this is set — see `ActionInterpreter`'s constructor for why the default is fail-closed.
   */
  apiAllowlist?: ApiAllowlist;
  /** Max `api` response body size in bytes before the request is aborted. Default 5MB. */
  apiMaxResponseBytes?: number;
  /** Max number of `api` actions to run concurrently; further calls fail fast. Default 6. */
  apiMaxConcurrentCalls?: number;
}

export interface RenderContext {
  theme: Theme | undefined;
  data: Record<string, unknown>;
  stateSnapshot: Record<string, unknown> | undefined;
  session: Record<string, unknown> | undefined;
  eventBus: EventBus;
  interpreter: ActionInterpreter;
}

/**
 * Builds everything renderNode needs (theme, resolved data sources, an ActionInterpreter wired
 * to a fresh EventBus) without rendering anything. Shared by `renderUIDocument` (a plain,
 * single-pass function — has no way to react to further events after it returns) and
 * `UIDocumentRenderer` (a real component that stays subscribed to the event bus, so `showDialog`/
 * `showSnackbar` actions can actually show something — see UIDocumentRenderer.tsx).
 */
export function createRenderContext(document: UIDLDocument, options: RenderOptions = {}): RenderContext {
  const theme = options.theme ?? getTheme(document.theme ?? "");
  const stateStore = options.stateStore;
  const dataSources = options.dataSources ?? document.dataSources;

  const data: Record<string, unknown> = {};

  if (dataSources) {
    for (const [name, config] of Object.entries(dataSources)) {
      if (Array.isArray(config)) {
        data[name] = config;
      } else if (isQueryDataSource(config)) {
        // The actual fetch is driven by <UIDocumentRenderer />'s effect loop (see
        // runDataSources/serializeResolvedQueries in state/dataSources.ts) — this only surfaces
        // whatever has already landed in state.$data.<name>.rows, or [] before the first
        // resolution, so widgets bound via props.dataSource never see `undefined`.
        const resolvedRows = stateStore?.getValue(`$data.${name}.rows`);
        data[name] = Array.isArray(resolvedRows) ? resolvedRows : [];
      }
    }
  }

  const stateSnapshot = stateStore?.getValue() as Record<string, unknown> | undefined;

  const eventBus = createEventBus();
  if (options.onRouteChange) {
    eventBus.on("route-change", (route) => {
      options.onRouteChange!(route as string | Record<string, unknown>);
    });
  }

  const interpreter = new ActionInterpreter({
    stateStore,
    session: options.session,
    data,
    eventBus,
    mutationHandler: options.mutationHandler,
    commandHandler: options.commandHandler,
    apiAllowlist: options.apiAllowlist,
    apiMaxResponseBytes: options.apiMaxResponseBytes,
    apiMaxConcurrentCalls: options.apiMaxConcurrentCalls,
  });

  return { theme, data, stateSnapshot, session: options.session, eventBus, interpreter };
}

/**
 * Renders a document to React elements once. Does not render anything for `showDialog`/
 * `showSnackbar` actions — those still fire their events on an internal event bus (so
 * `setState`/`navigate`/etc keep working), but nothing is listening to actually show a dialog
 * or snackbar, since this function returns a static tree with no ongoing subscription. Use
 * `UIDocumentRenderer` instead when a document's dialog/snackbar actions need to visibly do
 * something.
 */
let warnedAboutUnresolvedQuery = false;

/**
 * `renderUIDocument` is a single pass with no way to react to a promise settling later, so a
 * `$query` data source it encounters will render its `loading` placeholder and then simply never
 * resolve. Warn once (not per document) so this doesn't drown out other console output the same
 * way the existing showDialog/showSnackbar warning does in README.
 */
function warnIfUnresolvedQuery(document: UIDLDocument): void {
  if (warnedAboutUnresolvedQuery || !document.dataSources) return;
  const hasQuery = Object.values(document.dataSources).some(isQueryDataSource);
  if (!hasQuery) return;
  warnedAboutUnresolvedQuery = true;
  console.warn(
    '[uidl-runtime] renderUIDocument() found a "$query" dataSource but has no way to resolve it — ' +
      "it renders a single, static pass and never re-renders when a promise settles. Use " +
      "<UIDocumentRenderer document={...} dataAdapter={...} /> instead for any document with a " +
      '"$query" dataSource, the same way it\'s already required for showDialog/showSnackbar actions.',
  );
}

export function renderUIDocument(
  document: UIDLDocument,
  options: RenderOptions = {},
): React.ReactNode {
  warnIfUnresolvedQuery(document);
  const { theme, data, stateSnapshot, session, interpreter } = createRenderContext(document, options);

  const rendered = renderNode(document.root, {
    theme,
    state: stateSnapshot,
    session,
    data,
    actionInterpreter: interpreter,
    registry: options.registry,
    definitions: document.definitions,
  });

  return withThemeCssVariables(rendered, theme);
}

/**
 * CSS custom properties for the theme's tokens are set once on the root element so
 * `var(--color-primary)`-style references (from ThemeEngine.resolveInlineStyle) resolve for
 * every descendant, without needing a global stylesheet or build-time Tailwind support.
 */
export function withThemeCssVariables(rendered: React.ReactNode, theme: Theme | undefined): React.ReactNode {
  if (theme && React.isValidElement(rendered)) {
    const cssVariables = themeToCssVariablesMap(theme);
    const existingStyle = (rendered.props as { style?: Record<string, unknown> }).style;
    return React.cloneElement(rendered as React.ReactElement<{ style?: Record<string, unknown> }>, {
      style: { ...cssVariables, ...existingStyle },
    });
  }

  return rendered;
}
