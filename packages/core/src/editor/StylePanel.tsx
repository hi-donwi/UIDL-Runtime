import { useCallback, useMemo } from "react";
import type { UIDLNode } from "../types";

export interface StylePanelProps {
  node: UIDLNode | null;
  onUpdateNode: (nodeId: string, changes: Partial<UIDLNode>) => void;
  className?: string;
}

const STYLE_FIELDS = [
  { key: "display", label: "Display", type: "text" as const },
  { key: "flexDirection", label: "Flex Direction", type: "select" as const, options: ["row", "column", "row-reverse", "column-reverse"] },
  { key: "justifyContent", label: "Justify Content", type: "select" as const, options: ["start", "center", "end", "space-between", "space-around", "space-evenly"] },
  { key: "alignItems", label: "Align Items", type: "select" as const, options: ["start", "center", "end", "stretch", "baseline"] },
  { key: "gap", label: "Gap", type: "text" as const },
  { key: "padding", label: "Padding", type: "text" as const },
  { key: "margin", label: "Margin", type: "text" as const },
  { key: "width", label: "Width", type: "text" as const },
  { key: "height", label: "Height", type: "text" as const },
  { key: "background", label: "Background", type: "text" as const },
  { key: "color", label: "Color", type: "text" as const },
  { key: "fontSize", label: "Font Size", type: "text" as const },
  { key: "fontWeight", label: "Font Weight", type: "text" as const },
  { key: "borderRadius", label: "Border Radius", type: "text" as const },
  { key: "borderWidth", label: "Border Width", type: "text" as const },
  { key: "borderColor", label: "Border Color", type: "text" as const },
  { key: "shadow", label: "Shadow", type: "text" as const },
  { key: "opacity", label: "Opacity", type: "text" as const },
] as const;

export function StylePanel({ node, onUpdateNode, className }: StylePanelProps) {
  const style = useMemo(() => node?.style ?? {}, [node?.style]);

  const handleChange = useCallback(
    (field: string, value: unknown) => {
      if (!node) return;
      const newStyle = { ...style, [field]: value };
      onUpdateNode(node.id, { style: newStyle });
    },
    [node, style, onUpdateNode],
  );

  const handleResponsiveChange = useCallback(
    (field: string, breakpoint: string, value: string) => {
      if (!node) return;
      const currentValue = style[field];
      let newValue: unknown;

      if (value === "" && breakpoint === "base") {
        newValue = undefined;
      } else if (value === "") {
        newValue = {
          ...(typeof currentValue === "object" && currentValue !== null ? currentValue : {}),
          [breakpoint]: undefined,
        };
        Object.keys(newValue as Record<string, unknown>).forEach((key) => {
          if ((newValue as Record<string, unknown>)[key] === undefined) {
            delete (newValue as Record<string, unknown>)[key];
          }
        });
        if (Object.keys(newValue as Record<string, unknown>).length === 0) {
          newValue = undefined;
        }
      } else if (typeof currentValue === "object" && currentValue !== null) {
        newValue = { ...(currentValue as Record<string, string>), [breakpoint]: value };
      } else {
        newValue = { base: currentValue as string | undefined, [breakpoint]: value };
      }

      const newStyle = { ...style, [field]: newValue };
      onUpdateNode(node.id, { style: newStyle });
    },
    [node, style, onUpdateNode],
  );

  if (!node) {
    return (
      <div className={`flex h-full flex-col border-r border-border ${className ?? ""}`}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">Style</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-text-secondary">Select a node to edit its style.</p>
        </div>
      </div>
    );
  }

  const renderFieldValue = (field: string, value: unknown) => {
    if (typeof value === "object" && value !== null) {
      const responsive = value as Record<string, string>;
      return (
        <div className="space-y-2">
          {["base", "sm", "md", "lg", "xl"].map((bp) => (
            <div key={bp} className="flex items-center gap-2">
              <label className="w-12 text-xs text-text-muted">{bp}</label>
              <input
                type="text"
                value={responsive[bp] ?? ""}
                onChange={(e) => handleResponsiveChange(field, bp, e.target.value)}
                className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-primary"
                placeholder={bp === "base" ? "base value" : `${bp}:value`}
              />
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === "string") {
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(field, e.target.value || undefined)}
          className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
        />
      );
    }

    return (
      <input
        type="text"
        value=""
        onChange={(e) => handleChange(field, e.target.value || undefined)}
        className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
        placeholder="Enter value"
      />
    );
  };

  return (
    <div className={`flex h-full flex-col border-r border-border ${className ?? ""}`}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">Style</h2>
        <p className="mt-1 text-xs text-text-secondary">{node.type}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {STYLE_FIELDS.map((field) => {
          const value = style[field.key];
          if (value === undefined || value === null || value === "") return null;

          return (
            <div key={field.key}>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                {field.label}
              </label>
              {renderFieldValue(field.key, value)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
