import { defaultRegistry } from "../registry/registry";

export interface WidgetPaletteProps {
  onSelectWidget: (widgetType: string) => void;
  selectedNodeId: string | null;
  className?: string;
}

const categories = [
  { id: "layout", label: "Layout" },
  { id: "base", label: "Base" },
  { id: "form", label: "Form" },
  { id: "data", label: "Data" },
  { id: "navigation", label: "Navigation" },
  { id: "advanced", label: "Advanced" },
] as const;

export function WidgetPalette({
  onSelectWidget,
  selectedNodeId,
  className,
}: WidgetPaletteProps) {
  const widgets = defaultRegistry.list().filter((widget) => !widget.hideFromPalette);

  const grouped = categories.reduce<Record<string, typeof widgets>>((acc, category) => {
    acc[category.id] = widgets.filter((widget) => widget.category === category.id);
    return acc;
  }, {} as Record<string, typeof widgets>);

  return (
    <div className={`flex h-full flex-col border-r border-border ${className ?? ""}`}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">Widgets</h2>
        <p className="mt-1 text-xs text-text-secondary">
          {widgets.length} components available
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {categories.map((category) => {
          const categoryWidgets = grouped[category.id];
          if (categoryWidgets.length === 0) return null;

          return (
            <div key={category.id} className="mb-4">
              <h3 className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-text-muted">
                {category.label}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {categoryWidgets.map((widget) => (
                  <button
                    key={widget.type}
                    onClick={() => onSelectWidget(widget.type)}
                    disabled={!selectedNodeId}
                    className="rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-border-hover hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                    title={widget.type}
                  >
                    <div className="text-sm font-medium text-text-primary">{widget.type}</div>
                    <div className="mt-1 text-xs text-text-secondary">
                      {widget.acceptsChildren ? "Container" : "Leaf"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
