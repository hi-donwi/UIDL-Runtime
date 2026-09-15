import { useEffect, useMemo, useRef, useState } from "react";
import type { UIDLDocument } from "../types";
import type { RenderOptions } from "./renderDocument";
import { createRenderContext, withThemeCssVariables } from "./renderDocument";
import { renderNode } from "./RenderNode";
import { Dialog, Snackbar } from "../components/primitives";
import { runDataSources, serializeResolvedQueries } from "../state/dataSources";

export interface UIDocumentRendererProps extends RenderOptions {
  document: UIDLDocument;
}

interface DialogState {
  title: string;
  content: string;
}

interface SnackbarState {
  message: string;
  duration?: number;
}

/**
 * The stateful counterpart to `renderUIDocument`: a real component that stays subscribed to the
 * document's event bus for its whole lifetime, so `showDialog`/`showSnackbar` actions actually
 * render something instead of firing an event nobody listens to. Use this (not the plain
 * `renderUIDocument` function) whenever a document's actions may include `showDialog` or
 * `showSnackbar`.
 */
export function UIDocumentRenderer({
  document,
  theme,
  stateStore,
  session,
  dataSources,
  dataAdapter,
  mutationHandler,
  commandHandler,
  downloadHandler,
  onRouteChange,
  registry,
  apiAllowlist,
  apiMaxResponseBytes,
  apiMaxConcurrentCalls,
  route,
}: UIDocumentRendererProps) {
  // Re-render when the document state store changes, so `state.*` bindings (e.g. an overlay's
  // `open: { "$bind": "state.overlays.x" }` closed by an onClose setState action) stay live.
  // Without this, state-bound props would resolve once against the initial snapshot and never
  // update — a broken path exactly like the Dialog/Snackbar one round 8 fixed.
  const [stateVersion, setStateVersion] = useState(0);

  useEffect(() => {
    if (!stateStore) return;
    return stateStore.subscribe(() => setStateVersion((v) => v + 1));
  }, [stateStore]);

  // Drives "$query" dataSources (see state/dataSources.ts): re-resolves each entry's $bind
  // params on every state change and only actually refetches the ones whose *resolved* query
  // changed — an unrelated state mutation (opening a Dialog, say) must not abort an in-flight
  // fetch or refire a query whose filters/sort/page didn't move. The subscription is set up once
  // per (adapter, store, dataSources, session) identity, not per stateVersion tick, precisely so
  // an in-flight request only gets aborted when *this* effect decides to supersede it.
  const lastResolvedQueriesRef = useRef<Record<string, string>>({});
  const dataFetchAbortRef = useRef<AbortController | null>(null);

  const effectiveDataSources = dataSources ?? document.dataSources;

  useEffect(() => {
    if (!dataAdapter || !stateStore || !effectiveDataSources) return;

    const maybeRefetch = () => {
      const scope = { state: stateStore.getValue() as Record<string, unknown>, session };
      const resolved = serializeResolvedQueries(effectiveDataSources, scope);
      const changed = Object.keys(resolved).some((name) => lastResolvedQueriesRef.current[name] !== resolved[name]);
      if (!changed) return;
      lastResolvedQueriesRef.current = resolved;

      dataFetchAbortRef.current?.abort();
      const controller = new AbortController();
      dataFetchAbortRef.current = controller;
      void runDataSources(effectiveDataSources, { adapter: dataAdapter, stateStore, session, signal: controller.signal });
    };

    maybeRefetch();
    const unsubscribe = stateStore.subscribe(maybeRefetch);

    return () => {
      unsubscribe();
      dataFetchAbortRef.current?.abort();
      // The abort above cancels whatever fetch is in flight, so the fingerprint recorded for
      // it no longer describes fetched data — forget it. Otherwise React StrictMode's dev-mode
      // mount/cleanup/remount (or any real effect teardown mid-fetch) leaves the remount
      // comparing against a fingerprint for a request that was killed, sees "unchanged", and
      // skips refetching — the query is then stuck forever on a fetch that never landed. Only
      // an adapter with non-zero latency exposes this: InMemoryAdapter's default 0ms resolves
      // before cleanup can even run.
      lastResolvedQueriesRef.current = {};
    };
  }, [dataAdapter, stateStore, effectiveDataSources, session]);

  const context = useMemo(
    () => {
      // stateVersion is deliberately referenced only as a cache-busting dep: the store's
      // subscribe() bumps it after every setState, forcing this memo to re-read the fresh
      // snapshot inside createRenderContext even though every other dep is unchanged.
      void stateVersion;
      return createRenderContext(document, {
        theme,
        stateStore,
        session,
        route,
        dataSources: effectiveDataSources,
        dataAdapter,
        mutationHandler,
        commandHandler,
        downloadHandler,
        onRouteChange,
        registry,
        apiAllowlist,
        apiMaxResponseBytes,
        apiMaxConcurrentCalls,
      });
    },
    [
      document,
      theme,
      stateStore,
      session,
      effectiveDataSources,
      dataAdapter,
      mutationHandler,
      commandHandler,
      downloadHandler,
      onRouteChange,
      registry,
      apiAllowlist,
      apiMaxResponseBytes,
      apiMaxConcurrentCalls,
      route,
      stateVersion,
    ],
  );

  const [dialog, setDialog] = useState<DialogState | null>(null);
  // A new showSnackbar replaces the current one rather than stacking — Snackbar itself is
  // pinned to a single fixed position (bottom-4 left-1/2), so rendering more than one at once
  // would just overlap. Stacking would need Snackbar to support a vertical offset per instance.
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);

  useEffect(() => {
    const offDialog = context.eventBus.on("dialog", (payload) => {
      setDialog(payload as DialogState);
    });
    const offSnackbar = context.eventBus.on("snackbar", (payload) => {
      setSnackbar(payload as SnackbarState);
    });

    return () => {
      offDialog();
      offSnackbar();
    };
  }, [context.eventBus]);

  const rendered = renderNode(document.root, {
    theme: context.theme,
    state: context.stateSnapshot,
    session: context.session,
    route: context.route,
    data: context.data,
    actionInterpreter: context.interpreter,
    registry,
    definitions: document.definitions,
  });

  return (
    <>
      {withThemeCssVariables(rendered, context.theme)}
      <Dialog
        open={dialog !== null}
        title={dialog?.title}
        content={dialog?.content}
        onClose={() => setDialog(null)}
      />
      <Snackbar
        message={snackbar?.message}
        duration={snackbar?.duration}
        onClose={() => setSnackbar(null)}
      />
    </>
  );
}
