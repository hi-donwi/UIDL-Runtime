import type { UIDLNode } from "../types";

export interface AdminGroupOptions {
  id: string;
  children: UIDLNode[];
}

export interface AdminHeadingOptions {
  id: string;
  title: string;
  description?: string;
}

export interface AdminHeaderOptions extends AdminHeadingOptions {
  actions?: UIDLNode[];
}

export interface AdminSectionOptions extends AdminHeadingOptions, AdminGroupOptions {}

export interface AdminFormOptions extends AdminGroupOptions {
  actions?: UIDLNode[];
  events?: UIDLNode["events"];
}

/** Presentation only: action permissions, submit semantics, and effects stay with the host. */
export function createAdminActionBar({ id, children }: AdminGroupOptions): UIDLNode {
  return { id, type: "Row", props: { className: "uidl-admin-actions" }, children };
}

function heading({ id, title, description }: AdminHeadingOptions, level: 1 | 2): UIDLNode {
  return {
    id: `${id}-copy`, type: "Column", props: { className: "uidl-admin-heading-copy" },
    children: [
      { id: `${id}-title`, type: "Text", props: { value: title, heading: level, className: level === 1 ? "uidl-admin-title" : "uidl-admin-section-title" } },
      ...(description ? [{ id: `${id}-description`, type: "Text", props: { value: description, className: "uidl-admin-description" } }] : []),
    ],
  };
}

/** A page title with readable supporting copy and a wrapping group of page actions. */
export function createAdminHeader(options: AdminHeaderOptions): UIDLNode {
  return {
    id: options.id, type: "Row", props: { className: "uidl-admin-header" },
    children: [
      heading(options, 1),
      ...(options.actions?.length ? [createAdminActionBar({ id: `${options.id}-actions`, children: options.actions })] : []),
    ],
  };
}

/** A named field group; supplied field widgets keep their labels, bindings, and errors. */
export function createAdminSection(options: AdminSectionOptions): UIDLNode {
  return {
    id: options.id, type: "Column", props: { className: "uidl-admin-section" },
    children: [heading(options, 2), ...options.children],
  };
}

/** An opt-in bounded form with deliberate section and footer spacing. */
export function createAdminForm({ id, children, actions, events }: AdminFormOptions): UIDLNode {
  return {
    id, type: "Form", props: { className: "uidl-admin-form" },
    ...(events ? { events } : {}),
    children: [
      ...children,
      ...(actions?.length ? [createAdminActionBar({ id: `${id}-actions`, children: actions })] : []),
    ],
  };
}
