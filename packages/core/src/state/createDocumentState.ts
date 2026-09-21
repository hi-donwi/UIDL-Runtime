import { create } from "zustand";

export interface DocumentStateStore {
  state: Record<string, unknown>;
  setState: (path: string, value: unknown) => void;
  getValue: (path?: string) => unknown;
  resetState: () => void;
  /**
   * Subscribe to state changes (fires after every setState/resetState). Returns an
   * unsubscribe function. Used by UIDocumentRenderer so documents bound to
   * `state.*` re-render when an action (e.g. a `setState` wired to an overlay's
   * `onClose`) mutates the store — without this, state-bound props like
   * `open: { "$bind": "state.overlays.x" }` would render once and never update.
   */
  subscribe: (listener: () => void) => () => void;
}

export function createDocumentState(initialState?: Record<string, unknown>) {
  const snapshot = initialState ?? {};
  const listeners = new Set<() => void>();

  return create<DocumentStateStore>()((set, get) => ({
    state: { ...snapshot },

    setState: (path, value) => {
      const current = get().state;
      const next = { ...current };
      setByPath(next, path, value);
      set({ state: next });
      listeners.forEach((listener) => listener());
    },

    getValue: (path) => {
      if (!path) return get().state;
      return getByPath(get().state, path);
    },

    resetState: () => {
      set({ state: { ...snapshot } });
      listeners.forEach((listener) => listener());
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  }));
}

export type DocumentStateHook = ReturnType<typeof createDocumentState>;

export function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return current;
}

export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  const lastKey = keys.pop()!;
  let current = obj;

  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[lastKey] = value;
}
