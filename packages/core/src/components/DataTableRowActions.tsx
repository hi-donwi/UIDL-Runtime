import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "../utils/cn";
import type { Expr } from "../expr/evaluate";

export interface DataTableAction {
  label: string;
  event?: string;
  /** UIDL expression evaluated for each row against the `data.row` scope. */
  visibleWhen?: Expr;
}

export interface DataTableActionPresentation {
  mode: "buttons" | "menu";
  triggerLabel?: string;
  triggerAriaLabel?: string;
  menuLabel?: string;
  columnAriaLabel?: string;
}

interface DataTableRowActionsProps {
  actions: DataTableAction[];
  presentation?: DataTableActionPresentation;
  onAction?: (action: DataTableAction) => void;
}

interface MenuPosition {
  top: number;
  left: number;
}

const ACTION_BUTTON_CLASS =
  "flex h-row-smallest items-center rounded-md bg-gray-100 px-3 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-890 dark:text-gray-200 dark:hover:bg-gray-800";

function positionMenu(trigger: HTMLButtonElement, actionCount: number): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = window.innerWidth || 1024;
  const viewportHeight = window.innerHeight || 768;
  const width = Math.min(208, viewportWidth - 16);
  const height = Math.min(320, actionCount * 38 + 8);
  return {
    left: Math.max(8, Math.min(rect.right - width, viewportWidth - width - 8)),
    top: rect.bottom + height <= viewportHeight - 8
      ? rect.bottom + 4
      : Math.max(8, rect.top - height - 4),
  };
}

/** Renders row actions as inline buttons or an accessible, configurable menu. */
export function DataTableRowActions({ actions, presentation, onAction }: DataTableRowActionsProps) {
  const mode = presentation?.mode ?? "buttons";
  const triggerLabel = presentation?.triggerLabel ?? "Actions";
  const triggerAriaLabel = presentation?.triggerAriaLabel ?? "Row actions";
  const menuLabel = presentation?.menuLabel ?? `${triggerAriaLabel} menu`;
  const menuId = `uidl-row-actions-${useId().replace(/:/g, "")}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen) return;

    const dismissOutside = (event: PointerEvent) => {
      const path = event.composedPath();
      if (!menuRef.current || !triggerRef.current) return;
      if (!path.includes(menuRef.current) && !path.includes(triggerRef.current)) setIsOpen(false);
    };

    const handleKeys = (event: KeyboardEvent) => {
      const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key === "Tab") {
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (items.length === 0 || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;

      event.preventDefault();
      const root = triggerRef.current?.getRootNode();
      const activeElement = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot
        ? root.activeElement
        : document.activeElement;
      const activeIndex = items.indexOf(activeElement as HTMLButtonElement);
      if (event.key === "Home") items[0]?.focus();
      else if (event.key === "End") items[items.length - 1]?.focus();
      else {
        const delta = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = activeIndex < 0 ? 0 : (activeIndex + delta + items.length) % items.length;
        items[nextIndex]?.focus();
      }
    };

    const dismissOnViewportChange = () => setIsOpen(false);
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", handleKeys);
    window.addEventListener("resize", dismissOnViewportChange);
    window.addEventListener("scroll", dismissOnViewportChange, true);
    const frame = window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", handleKeys);
      window.removeEventListener("resize", dismissOnViewportChange);
      window.removeEventListener("scroll", dismissOnViewportChange, true);
    };
  }, [isOpen]);

  if (actions.length === 0) return null;

  if (mode !== "menu") {
    return (
      <div className="flex items-center justify-end gap-2">
        {actions.map((action, index) => (
          <button
            key={`${action.event ?? action.label}-${index}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAction?.(action);
            }}
            className={ACTION_BUTTON_CLASS}
          >
            {action.label}
          </button>
        ))}
      </div>
    );
  }

  const toggleMenu = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    if (triggerRef.current) setPosition(positionMenu(triggerRef.current, actions.length));
    setIsOpen(true);
  };

  const root = triggerRef.current?.getRootNode();
  const portalContainer = typeof document === "undefined"
    ? null
    : typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot
      ? root
      : document.body;

  return (
    <div className="flex items-center justify-end">
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerAriaLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={(event) => {
          event.stopPropagation();
          toggleMenu();
        }}
        className={cn(ACTION_BUTTON_CLASS, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
      >
        {triggerLabel}
      </button>
      {isOpen && portalContainer && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={menuLabel}
          className="fixed z-[100] min-w-[11rem] rounded-md border border-gray-200 bg-white p-1 shadow-md dark:border-gray-800 dark:bg-gray-890"
          style={{
            top: position.top,
            left: position.left,
            width: "min(13rem, calc(100vw - 1rem))",
            maxHeight: "min(20rem, calc(100vh - 1rem))",
            overflowY: "auto",
          }}
        >
          {actions.map((action, index) => (
            <button
              key={`${action.event ?? action.label}-${index}`}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={(event) => {
                event.stopPropagation();
                setIsOpen(false);
                onAction?.(action);
                triggerRef.current?.focus();
              }}
              className="flex w-full items-center rounded px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none dark:text-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800"
            >
              {action.label}
            </button>
          ))}
        </div>,
        portalContainer,
      )}
    </div>
  );
}
