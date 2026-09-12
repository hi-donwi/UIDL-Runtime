/*
 * The Meridian desk shell.
 *
 * The shell is assembled from Desk (the split), Sidebar (the 14rem gray-25
 * rail), PageHeader + PageHeaderNavGroup + SearchBar (the 4rem header and its
 * joined nav-link group). The numbers that carry the look:
 *
 *   sidebar      w-sidebar (14rem), bg-gray-25, py-2, one `border-e` and no shadow
 *   nav rows     h-10, px-4, hover:bg-gray-100; active adds bg-gray-100 + border-s-4
 *                border-gray-800 (a 4px inset bar, with `-ms-1` on the icon to absorb it)
 *   child rows   h-10, ps-10, text-base — indentation instead of a nested container
 *   page header  h-row-largest (4rem), px-4, gap-4 on the start edge / gap-2 on the end,
 *                title at text-xl font-semibold, one `border-b` and nothing else
 *   nav group    `nav-link` = flex items-center bg-gray-200 px-3, buttons butted together
 *                inside one rounded-md clip
 *
 * Dark mode follows Meridian's `darkMode: 'class'` setup: the shell root carries `.dark` and
 * every rule below is a `dark:` variant, rather than the ad-hoc hex pairs this file used
 * before.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  GroupIcon,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconClose,
  IconHome,
  IconLanguage,
  IconMenu,
  IconMoon,
  IconSearch,
  IconSun,
  ItemIcon,
} from "@uidl-runtime/templates/meridian/icons";

export interface ShellNavItem {
  label: string;
  path: string;
  /** Custom active-match (e.g. "also active while viewing an edit page for this doctype"). Defaults to an exact match against `activePath`. */
  isActive?: (activePath: string) => boolean;
}

export interface ShellNavGroup {
  label: string;
  items: ShellNavItem[];
}

export interface ShellHeaderAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "default";
}

interface MeridianShellProps {
  company: string;
  title: string;
  groups: ShellNavGroup[];
  activePath: string;
  onNavigate: (path: string) => void;
  onBack: () => void;
  actions?: ShellHeaderAction[];
  isDark?: boolean;
  onToggleTheme?: () => void;
  language?: "id" | "en";
  onToggleLanguage?: () => void;
  children: ReactNode;
}

function itemIsActive(item: ShellNavItem, activePath: string): boolean {
  return item.isActive ? item.isActive(activePath) : item.path === activePath;
}

function groupIsActive(group: ShellNavGroup, activePath: string): boolean {
  return group.items.some((item) => itemIsActive(item, activePath));
}

/** PageHeaderNavGroup's scoped `.nav-link`. */
const NAV_LINK_CLASS =
  "flex items-center bg-gray-200 px-3 text-gray-700 hover:text-gray-900 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-gray-100";

/** Button, secondary: the header's own action buttons. */
const HEADER_BUTTON_CLASS =
  "flex h-8 items-center justify-center gap-1 rounded-md bg-gray-200 px-3 text-sm text-gray-700 hover:brightness-95 dark:bg-gray-900 dark:text-gray-200";

export function MeridianShell({
  company,
  title,
  groups,
  activePath,
  onNavigate,
  onBack,
  actions,
  isDark = false,
  onToggleTheme,
  language = "id",
  onToggleLanguage,
  children,
}: MeridianShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const handleNavigate = (path: string) => {
    setDrawerOpen(false);
    onNavigate(path);
  };

  return (
    <div className={`meridian-ui ${isDark ? "dark" : ""}`}>
      <div className="relative flex h-screen overflow-hidden bg-white dark:bg-gray-875">
        {sidebarVisible && (
          <MeridianSidebar
            company={company}
            groups={groups}
            activePath={activePath}
            onNavigate={handleNavigate}
            onHide={() => setSidebarVisible(false)}
          />
        )}
        {!sidebarVisible && (
          <button
            type="button"
            onClick={() => setSidebarVisible(true)}
            aria-label="Show sidebar"
            title="Show sidebar"
            className="absolute bottom-0 left-0 z-10 m-4 hidden rounded p-1 text-gray-600 hover:bg-gray-100 md:block dark:text-gray-500 dark:hover:bg-gray-875"
          >
            <IconChevronsRight />
          </button>
        )}
        <MobileMeridianDrawer
          open={drawerOpen}
          company={company}
          groups={groups}
          activePath={activePath}
          onNavigate={handleNavigate}
          onClose={() => setDrawerOpen(false)}
        />
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-gray-875">
          <MeridianNavbar
            title={title}
            groups={groups}
            actions={actions}
            onBack={onBack}
            onOpenDrawer={() => setDrawerOpen(true)}
            onNavigate={handleNavigate}
            isDark={isDark}
            onToggleTheme={onToggleTheme}
            language={language}
            onToggleLanguage={onToggleLanguage}
          />
          <main className="custom-scroll min-w-0 flex-1 overflow-auto bg-white text-base dark:bg-gray-875">
            {children}
          </main>
        </section>
      </div>
    </div>
  );
}

/** PageHeaderNavGroup — search, back and forward butted into one rounded group. */
function NavGroup({ groups, onNavigate }: { groups: ShellNavGroup[]; onNavigate: (path: string) => void }) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex h-8 overflow-hidden rounded-md">
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-label="Search"
        title="Search"
        className={`${NAV_LINK_CLASS} border-e border-white dark:border-gray-850`}
      >
        <IconSearch className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => window.history.back()}
        aria-label="Go back"
        title="Go back"
        className={`${NAV_LINK_CLASS} border-e border-white dark:border-gray-850`}
      >
        <IconChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => window.history.forward()}
        aria-label="Go forward"
        title="Go forward"
        className={NAV_LINK_CLASS}
      >
        <IconChevronRight className="h-4 w-4" />
      </button>
      {searchOpen && <SearchModal groups={groups} onNavigate={onNavigate} onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

interface SearchItem {
  label: string;
  path: string;
  groupLabel: string;
}

function flattenSearchItems(groups: ShellNavGroup[]): SearchItem[] {
  const items: SearchItem[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      items.push({ label: item.label, path: item.path, groupLabel: group.label });
    }
  }
  return items;
}

/** SearchBar's modal: a `w-form` sheet, `text-2xl` input on gray-100, `hr` above results. */
function SearchModal({
  groups,
  onNavigate,
  onClose,
}: {
  groups: ShellNavGroup[];
  onNavigate: (path: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => flattenSearchItems(groups), [groups]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const select = (path: string) => {
    onNavigate(path);
    onClose();
  };

  return (
    <div className="backdrop z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Search">
      <button type="button" className="absolute inset-0" aria-label="Close search" onClick={onClose} />
      <div className="w-form relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-850">
        <div className="flex items-center gap-2 p-1">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "Enter" && filtered[0]) select(filtered[0].path);
            }}
            placeholder="Type to search..."
            className="w-full rounded-md bg-gray-100 p-3 text-2xl text-gray-900 placeholder-gray-500 focus:outline-none dark:bg-gray-800 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="me-2 rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-800"
          >
            <IconClose />
          </button>
        </div>
        {filtered.length > 0 && <hr className="border-gray-200 dark:border-gray-800" />}
        <div className="custom-scroll max-h-64 overflow-auto p-1">
          {filtered.length === 0 && <p className="p-2 text-base text-gray-600 italic dark:text-gray-500">No results</p>}
          {filtered.map((item) => (
            <button
              key={`${item.groupLabel}-${item.path}`}
              type="button"
              aria-label={item.label}
              onClick={() => select(item.path)}
              className="flex h-row-small w-full items-center justify-between rounded-md px-2 text-left text-base text-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <span aria-hidden="true">{item.label}</span>
              <span aria-hidden="true" className="text-sm text-gray-600 dark:text-gray-500">
                {item.groupLabel}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** PageHeader */
function MeridianNavbar({
  title,
  groups,
  actions,
  onBack,
  onOpenDrawer,
  onNavigate,
  isDark,
  onToggleTheme,
  language = "id",
  onToggleLanguage,
}: {
  title: string;
  groups: ShellNavGroup[];
  actions?: ShellHeaderAction[];
  onBack: () => void;
  onOpenDrawer: () => void;
  onNavigate: (path: string) => void;
  isDark: boolean;
  onToggleTheme?: () => void;
  language?: "id" | "en";
  onToggleLanguage?: () => void;
}) {
  return (
    <header className="h-row-largest flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
      {/* Left: nav group + title (PageHeader's `gap-4 me-auto` cluster) */}
      <div className="me-auto flex items-center gap-4">
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open navigation"
          className={`${NAV_LINK_CLASS} h-8 rounded-md md:hidden`}
        >
          <IconMenu className="h-4 w-4" />
        </button>
        <button type="button" onClick={onBack} aria-label="Back to catalog" title="Back to catalog" className={`${NAV_LINK_CLASS} h-8 rounded-md`}>
          <IconHome className="h-4 w-4" />
        </button>
        <NavGroup groups={groups} onNavigate={onNavigate} />
        <h1 className="truncate text-xl font-semibold select-none dark:text-white">{title}</h1>
      </div>

      {/* Right: PageHeader's `gap-2 ms-auto` action slot */}
      <div className="ms-auto flex items-stretch gap-2">
        {onToggleLanguage && (
          <button
            type="button"
            onClick={onToggleLanguage}
            className={HEADER_BUTTON_CLASS}
            title="Switch Language / Ganti Bahasa"
            aria-label={language === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
          >
            <IconLanguage className="h-4 w-4" />
            <span>{language === "id" ? "ID" : "EN"}</span>
          </button>
        )}

        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className={HEADER_BUTTON_CLASS}
            title="Toggle Dark/Light Mode"
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {isDark ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
          </button>
        )}

        {actions?.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={
              action.variant === "primary"
                ? "flex h-8 items-center justify-center rounded-md bg-black px-6 text-sm text-white hover:brightness-95 dark:bg-gray-300 dark:font-semibold dark:text-black"
                : `${HEADER_BUTTON_CLASS} px-6`
            }
          >
            {action.label}
          </button>
        ))}
      </div>
    </header>
  );
}

/** Sidebar */
function MeridianSidebar({
  company,
  groups,
  activePath,
  onNavigate,
  onHide,
}: {
  company: string;
  groups: ShellNavGroup[];
  activePath: string;
  onNavigate: (path: string) => void;
  onHide: () => void;
}) {
  return (
    <aside className="w-sidebar relative hidden h-full flex-shrink-0 flex-col justify-between overflow-y-auto border-e border-gray-200 bg-gray-25 py-2 whitespace-nowrap md:flex dark:border-gray-800 dark:bg-gray-900">
      <SidebarContent company={company} groups={groups} activePath={activePath} onNavigate={onNavigate} />
      <button
        type="button"
        onClick={onHide}
        aria-label="Hide sidebar"
        title="Hide sidebar"
        className="absolute end-0 bottom-0 m-4 rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-875"
      >
        <IconChevronsLeft className="h-4 w-4" />
      </button>
    </aside>
  );
}

function MobileMeridianDrawer({
  open,
  company,
  groups,
  activePath,
  onNavigate,
  onClose,
}: {
  open: boolean;
  company: string;
  groups: ShellNavGroup[];
  activePath: string;
  onNavigate: (path: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation drawer">
      <button type="button" className="backdrop" aria-label="Close navigation drawer" onClick={onClose} />
      <aside className="relative h-full w-72 overflow-auto border-e border-gray-200 bg-gray-25 py-2 shadow-md dark:border-gray-800 dark:bg-gray-900">
        <SidebarContent company={company} groups={groups} activePath={activePath} onNavigate={onNavigate} />
      </aside>
    </div>
  );
}

function SidebarContent({
  company,
  groups,
  activePath,
  onNavigate,
}: {
  company: string;
  groups: ShellNavGroup[];
  activePath: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <div>
      {/* Company name — Sidebar's `px-4 mt-2 mb-4` block */}
      <div className="mt-2 mb-4 flex flex-row items-center justify-between px-4">
        <h6 className="no-scrollbar overflow-auto font-semibold whitespace-nowrap select-none dark:text-gray-200">
          {company}
        </h6>
      </div>

      {groups.map((group) => {
        const active = groupIsActive(group, activePath);
        const isSingle = group.items.length <= 1;
        const primaryPath = group.items[0]?.path;
        const groupRowActive = active && isSingle;

        return (
          <div key={group.label}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => primaryPath && onNavigate(primaryPath)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && primaryPath) onNavigate(primaryPath);
              }}
              className={`flex h-10 cursor-pointer items-center px-4 hover:bg-gray-100 dark:hover:bg-gray-875 ${
                groupRowActive ? "border-s-4 border-gray-800 bg-gray-100 dark:border-gray-100 dark:bg-gray-875" : ""
              }`}
            >
              <GroupIcon
                label={group.label}
                className={`h-[18px] w-[18px] flex-shrink-0 ${groupRowActive ? "-ms-1" : ""} ${
                  active ? "text-gray-900 dark:text-gray-25" : "text-gray-700 dark:text-gray-400"
                }`}
              />
              <div
                className={`ms-2 text-lg ${
                  groupRowActive ? "text-gray-900 dark:text-gray-25" : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {group.label}
              </div>
            </div>

            {/* Expanded group — child rows are indented with `ps-10`, not boxed. */}
            {!isSingle && active && (
              <div>
                {group.items.map((item) => {
                  const itemActive = itemIsActive(item, activePath);
                  return (
                    <div
                      key={`${item.label}-${item.path}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onNavigate(item.path)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") onNavigate(item.path);
                      }}
                      className={`flex h-10 cursor-pointer items-center gap-2 ps-6 text-base hover:bg-gray-100 dark:hover:bg-gray-875 ${
                        itemActive
                          ? "border-s-4 border-gray-800 bg-gray-100 text-gray-900 dark:border-gray-100 dark:bg-gray-875 dark:text-gray-100"
                          : "text-gray-700 dark:text-gray-400"
                      }`}
                      style={itemActive ? { marginLeft: "-4px" } : undefined}
                    >
                      {/* Meridian indents child rows to `ps-10` with nothing in the gutter; the icon
                          sits in that gutter instead, so the label lands on the same x. */}
                      <ItemIcon label={item.label} className="h-4 w-4 flex-shrink-0 opacity-80" />
                      <p className="truncate">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
