import React, { useCallback, useMemo } from "react";
import type { UIDLDocument } from "../types";
import { UIDocumentRenderer } from "../renderer/UIDocumentRenderer";
import type { ApiAllowlist } from "../actions/interpreter";
import { defaultLightTheme, defaultDarkTheme } from "../theme/presets";
import type { DocumentStateStore } from "../state/createDocumentState";
import type { CommandHandler, MutationHandler } from "../types/actions";

export interface CanvasProps {
  document: UIDLDocument;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onHoverNode: (nodeId: string | null) => void;
  themeMode?: "light" | "dark";
  stateStore?: DocumentStateStore;
  dataSources?: Record<string, unknown>;
  mutationHandler?: MutationHandler;
  commandHandler?: CommandHandler;
  apiAllowlist?: ApiAllowlist;
  apiMaxResponseBytes?: number;
  apiMaxConcurrentCalls?: number;
  className?: string;
}

interface RenderErrorBoundaryProps {
  children: React.ReactNode;
}

interface RenderErrorBoundaryState {
  error: Error | null;
}

// A plain try/catch around a function call (the old approach) can't catch errors thrown while
// rendering a React component — only an error boundary can. Needed now that the document is
// rendered by <UIDocumentRenderer /> (a real component, for dialog/snackbar support) instead of
// a single renderUIDocument() call inside useMemo.
class RenderErrorBoundary extends React.Component<RenderErrorBoundaryProps, RenderErrorBoundaryState> {
  state: RenderErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RenderErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Failed to render document:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 text-red-500">
          Failed to render document: {this.state.error.message}
        </div>
      );
    }

    return this.props.children;
  }
}

export function Canvas({
  document,
  onSelectNode,
  onHoverNode,
  themeMode = "light",
  stateStore,
  dataSources,
  mutationHandler,
  commandHandler,
  apiAllowlist,
  apiMaxResponseBytes,
  apiMaxConcurrentCalls,
  className,
}: CanvasProps) {
  const theme = useMemo(() => {
    if (themeMode === "dark") {
      return defaultDarkTheme;
    }
    return defaultLightTheme;
  }, [themeMode]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const nodeId = target.closest("[data-node-id]")?.getAttribute("data-node-id");
      onSelectNode(nodeId ?? null);
    },
    [onSelectNode],
  );

  const handleCanvasMouseOver = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const nodeId = target.closest("[data-node-id]")?.getAttribute("data-node-id");
      onHoverNode(nodeId ?? null);
    },
    [onHoverNode],
  );

  return (
    <div
      className={`relative flex-1 overflow-auto bg-background p-8 ${className ?? ""}`}
      onClick={handleCanvasClick}
      onMouseOver={handleCanvasMouseOver}
    >
      <div className="mx-auto max-w-4xl">
        <RenderErrorBoundary key={document.id}>
          <UIDocumentRenderer
            document={document}
            theme={theme}
            stateStore={stateStore}
            dataSources={dataSources}
            mutationHandler={mutationHandler}
            commandHandler={commandHandler}
            apiAllowlist={apiAllowlist}
            apiMaxResponseBytes={apiMaxResponseBytes}
            apiMaxConcurrentCalls={apiMaxConcurrentCalls}
          />
        </RenderErrorBoundary>
      </div>
    </div>
  );
}
