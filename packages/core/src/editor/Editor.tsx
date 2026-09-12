import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import type { UIDLDocument } from "../types";
import { DocumentSchema } from "../schemas/document";
import { createEditorStore } from "./store";
import { createDocumentState } from "../state/createDocumentState";
import { Canvas } from "./Canvas";
import { WidgetPalette } from "./WidgetPalette";
import { LayerTree } from "./LayerTree";
import { PropertyPanel } from "./PropertyPanel";
import { StylePanel } from "./StylePanel";
import { ValidationStatus } from "./ValidationStatus";
import { defaultRegistry } from "../registry/registry";
import type { ApiAllowlist } from "../actions/interpreter";
import type { CommandHandler, MutationHandler } from "../types/actions";

export interface EditorProps {
  initialDocument?: UIDLDocument;
  /** Host-owned handler for live-preview `mutate` actions; unset means mutations are disabled. */
  mutationHandler?: MutationHandler;
  /** Host-owned handler for live-preview `command` actions; unset means commands are disabled. */
  commandHandler?: CommandHandler;
  /** Hosts the live preview's `api` actions are allowed to call; unset means they're disabled. */
  apiAllowlist?: ApiAllowlist;
  /** Max `api` response body size in bytes before the request is aborted. Default 5MB. */
  apiMaxResponseBytes?: number;
  /** Max number of `api` actions to run concurrently; further calls fail fast. Default 6. */
  apiMaxConcurrentCalls?: number;
  className?: string;
}

export function Editor({
  initialDocument,
  mutationHandler,
  commandHandler,
  apiAllowlist,
  apiMaxResponseBytes,
  apiMaxConcurrentCalls,
  className,
}: EditorProps) {
  const useStore = useMemo(() => createEditorStore(initialDocument), [initialDocument]);
  const state = useStore();
  const [activeTab, setActiveTab] = useState<"properties" | "style">("properties");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const document = state.document;
  const selectedNode = useMemo(() => {
    if (!state.selectedNodeId) return null;
    return state.flatNodeMap.get(state.selectedNodeId) ?? null;
  }, [state.flatNodeMap, state.selectedNodeId]);

  const useDocumentState = useMemo(
    () => createDocumentState(document.state),
    [document.state],
  );
  const documentState = useDocumentState();

  const validateDocument = useCallback(() => {
    const { document: currentDocument, setValidationErrors } = useStore.getState();
    const result = DocumentSchema.safeParse(currentDocument);
    if (!result.success) {
      const errors = (result.error as { issues: Array<{ path: (string | number)[]; message: string }> }).issues.map((err) => ({
        path: err.path.join("."),
        message: err.message,
        severity: "error" as const,
      }));
      setValidationErrors(errors);
    } else {
      setValidationErrors([]);
    }
  }, [useStore]);

  useEffect(() => {
    const unsubscribe = useStore.subscribe((current, previous) => {
      if (current.document !== previous.document) {
        validateDocument();
      }
    });
    validateDocument();
    return unsubscribe;
  }, [useStore, validateDocument]);

  const handleSelectWidget = useCallback(
    (widgetType: string) => {
      if (!state.selectedNodeId) return;
      const selectedNode = state.flatNodeMap.get(state.selectedNodeId);
      if (!selectedNode) return;

      const widget = defaultRegistry.get(selectedNode.type);
      const acceptsChildren = widget?.acceptsChildren ?? true;

      if (acceptsChildren) {
        state.addChild(state.selectedNodeId, widgetType);
      }
    },
    [state],
  );

  const handleSave = useCallback(() => {
    const json = JSON.stringify(state.document, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${state.document.name || "document"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.document]);

  const handleLoad = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
      const result = DocumentSchema.safeParse(parsed);
      if (!result.success) {
        const issues = (result.error as { issues: Array<{ path: (string | number)[]; message: string }> }).issues;
        useStore.getState().setValidationErrors(
          issues.map((err) => ({
            path: err.path.join("."),
            message: err.message,
            severity: "error" as const,
          })),
        );
        return;
      }
          useStore.getState().setDocument(result.data);
        } catch {
          useStore.getState().setValidationErrors([
            { path: "file", message: "Invalid JSON file", severity: "error" },
          ]);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [useStore],
  );

  const handleMoveNode = useCallback(
    (nodeId: string, targetParentId: string, index?: number) => {
      state.moveNode(nodeId, targetParentId, index);
    },
    [state],
  );

  return (
    <div
      className={`flex h-screen w-full flex-col bg-background text-text-primary ${
        state.themeMode === "dark" ? "dark" : ""
      } ${className ?? ""}`}
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">uidl-runtime</h1>
          <span className="text-sm text-text-secondary">Editor</span>
        </div>
        <div className="flex items-center gap-4">
          <ValidationStatus errors={state.validationErrors} />
          <div className="flex items-center gap-1">
            <button
              onClick={state.undo}
              disabled={!state.canUndo}
              className="rounded-md border border-border px-2 py-1 text-xs disabled:opacity-50"
            >
              Undo
            </button>
            <button
              onClick={state.redo}
              disabled={!state.canRedo}
              className="rounded-md border border-border px-2 py-1 text-xs disabled:opacity-50"
            >
              Redo
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              className="rounded-md border border-border px-2 py-1 text-xs"
            >
              Save
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-border px-2 py-1 text-xs"
            >
              Load
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleLoad}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary">Breakpoint:</label>
            <select
              value={state.activeBreakpoint}
              onChange={(e) => state.setBreakpoint(e.target.value)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary"
            >
              <option value="base">Base</option>
              <option value="sm">SM</option>
              <option value="md">MD</option>
              <option value="lg">LG</option>
              <option value="xl">XL</option>
              <option value="2xl">2XL</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary">Theme:</label>
            <select
              value={state.themeMode}
              onChange={(e) => state.setThemeMode(e.target.value as "light" | "dark")}
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 flex-shrink-0">
          <WidgetPalette
            onSelectWidget={handleSelectWidget}
            selectedNodeId={state.selectedNodeId}
          />
        </aside>
        <aside className="w-64 flex-shrink-0">
          <LayerTree
            root={document.root}
            selectedNodeId={state.selectedNodeId}
            hoveredNodeId={state.hoveredNodeId}
            onSelectNode={state.selectNode}
            onHoverNode={state.hoverNode}
            onMoveNode={handleMoveNode}
          />
        </aside>
        <main className="flex-1 overflow-hidden">
          <Canvas
            document={document}
            selectedNodeId={state.selectedNodeId}
            hoveredNodeId={state.hoveredNodeId}
            onSelectNode={state.selectNode}
            onHoverNode={state.hoverNode}
            themeMode={state.themeMode}
            stateStore={documentState}
            dataSources={document.dataSources}
            mutationHandler={mutationHandler}
            commandHandler={commandHandler}
            apiAllowlist={apiAllowlist}
            apiMaxResponseBytes={apiMaxResponseBytes}
            apiMaxConcurrentCalls={apiMaxConcurrentCalls}
          />
        </main>
        <aside className="w-80 flex-shrink-0">
          <div className="flex h-full flex-col">
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("properties")}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "properties"
                    ? "border-b-2 border-accent text-accent"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Properties
              </button>
              <button
                onClick={() => setActiveTab("style")}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "style"
                    ? "border-b-2 border-accent text-accent"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Style
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {activeTab === "properties" ? (
                <PropertyPanel
                  node={selectedNode}
                  onUpdateNode={state.updateNode}
                />
              ) : (
                <StylePanel
                  node={selectedNode}
                  onUpdateNode={state.updateNode}
                />
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
