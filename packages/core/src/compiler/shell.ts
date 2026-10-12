/**
 * Public application shell — a sidebar of navigation and a top bar around any page.
 *
 * `wrapInShell` takes a document a recipe already produced and puts its root inside the
 * shell, keeping the page's id, route, state, and data sources. It composes; it does not
 * compile a page of its own, so every recipe gets the same shell without knowing about it.
 *
 * Permission gating here is cosmetic, as everywhere in UIDL: an item whose `permission` the
 * session lacks is hidden, and the host still refuses the request behind it.
 */

import type { UIDLDocument, UIDLNode } from "../types";
import type { Language } from "../utils/i18n";
import type { HostCapabilities, LocalizedText, UiPolicy } from "./types.js";

export interface ShellNavItem {
  id: string;
  label: LocalizedText;
  route: string;
  /** An icon name from the runtime's icon set. */
  icon?: string;
  /** Shown only when `session.permissions.<permission>` is truthy. */
  permission?: string;
}

export interface ShellMeta {
  name: string;
  title: LocalizedText;
  logo?: string;
  items: ShellNavItem[];
  /** Where the signed-in user's name is read from; defaults to `session.user.name`. */
  userPath?: string;
  /** A host command that signs the user out. Must be in `hostCapabilities.commands`. */
  signOutCommand?: string;
  /** Where to go once sign-out succeeds. */
  signOutRoute?: string;
}

export interface WrapInShellOptions {
  hostCapabilities: HostCapabilities;
  uiPolicy?: UiPolicy;
  /**
   * The route this page is served at, to mark its navigation item. Defaults to the page's own
   * `route`; recipe output usually has none, because the host owns its routing table.
   */
  currentRoute?: string;
}

const BORDER_COLOR = "{primitives.color.border}";
const TEXT_SECONDARY = "{primitives.color.text-secondary}";

export function wrapInShell(page: UIDLDocument, meta: ShellMeta, options: WrapInShellOptions): UIDLDocument {
  if (meta.signOutCommand && !options.hostCapabilities.commands.includes(meta.signOutCommand)) {
    throw new Error(
      `wrapInShell: hostCapabilities rejected: meta.signOutCommand: command "${meta.signOutCommand}" is not in hostCapabilities.commands`,
    );
  }
  const duplicate = findDuplicate(meta.items.map((item) => item.id));
  if (duplicate) throw new Error(`wrapInShell: navigation item id "${duplicate}" is used twice`);

  const lang: Language = options.uiPolicy?.lang ?? "id";
  const say = (value: LocalizedText) => value[lang] ?? value.en;
  const prefix = `shell-${meta.name}`;

  const navItems: UIDLNode[] = meta.items.map((item) => {
    const current = options.currentRoute ?? page.route;
    const active = current !== undefined && current === item.route;
    return {
      id: `${prefix}-nav-${item.id}`,
      type: "Button",
      props: {
        label: say(item.label),
        variant: active ? "primary" : "secondary",
        ...(item.icon ? { iconName: item.icon } : {}),
        ...(active ? { "aria-current": "page" } : {}),
      },
      style: { width: "w-full", justifyContent: "start" },
      events: { onClick: [{ navigate: { route: item.route } }] },
      ...(item.permission ? { visibility: { condition: { path: `session.permissions.${item.permission}` } } } : {}),
    };
  });

  const sidebar: UIDLNode = {
    id: `${prefix}-sidebar`,
    type: "Sidebar",
    style: { display: "flex", flexDirection: "column", width: "w-64", padding: "p-4", gap: "gap-1", borderWidth: "border-r", borderColor: BORDER_COLOR },
    children: [
      ...(meta.logo ? [{ id: `${prefix}-logo`, type: "Image", props: { src: meta.logo, alt: say(meta.title) }, style: { height: "h-8" } } as UIDLNode] : []),
      { id: `${prefix}-title`, type: "Text", props: { value: say(meta.title), heading: 2 }, style: { fontSize: "text-lg", fontWeight: 600, marginBottom: "mb-4" } },
      ...navItems,
    ],
  };

  const userNodes: UIDLNode[] = [
    { id: `${prefix}-user`, type: "Text", props: { value: { $expr: { path: meta.userPath ?? "session.user.name" } } }, style: { color: TEXT_SECONDARY } },
  ];
  if (meta.signOutCommand) {
    userNodes.push({
      id: `${prefix}-sign-out`,
      type: "Button",
      props: { label: lang === "id" ? "Keluar" : "Sign out", variant: "secondary" },
      events: {
        onClick: [
          {
            command: {
              name: meta.signOutCommand,
              ...(meta.signOutRoute ? { onSuccess: { navigate: { route: meta.signOutRoute } } } : {}),
            },
          },
        ],
      },
    });
  }

  const navbar: UIDLNode = {
    id: `${prefix}-navbar`,
    type: "Navbar",
    style: { justifyContent: "space-between", alignItems: "center", padding: "px-4", height: "h-row-large", borderWidth: "border-b", borderColor: BORDER_COLOR },
    children: [
      { id: `${prefix}-page-title`, type: "Text", props: { value: page.name ?? say(meta.title) }, style: { fontWeight: 600 } },
      { id: `${prefix}-user-area`, type: "Row", style: { alignItems: "center", gap: "gap-2" }, children: userNodes },
    ],
  };

  const shellIds = new Set(collectIds([sidebar, navbar]));
  shellIds.add(`${prefix}-root`).add(`${prefix}-main`);
  const clash = collectIds([page.root]).find((id) => shellIds.has(id));
  if (clash) throw new Error(`wrapInShell: page node id "${clash}" is also a shell node id`);

  return {
    ...page,
    root: {
      id: `${prefix}-root`,
      type: "Row",
      style: { minHeight: "min-h-screen", width: "w-full" },
      children: [
        sidebar,
        {
          id: `${prefix}-main`,
          type: "Column",
          style: { width: "w-full" },
          children: [navbar, page.root],
        },
      ],
    },
  };
}

function collectIds(nodes: UIDLNode[]): string[] {
  const ids: string[] = [];
  const walk = (node: UIDLNode) => {
    ids.push(node.id);
    for (const child of node.children ?? []) walk(child);
    for (const slot of Object.values(node.slots ?? {})) for (const child of slot) walk(child);
  };
  nodes.forEach(walk);
  return ids;
}

function findDuplicate(values: string[]): string | undefined {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
}
