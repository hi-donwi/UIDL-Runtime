import { getByPath } from "./createDocumentState";

/**
 * The one binding-resolution rule for the render scopes (spec: `spec/semantics/bindings.md`).
 *
 * A `$bind` path is `"<scope>.<dotted.path>"` where scope is one of the render prefixes below.
 * Missing intermediate keys and missing scopes resolve to `undefined` (never a throw).
 * Unknown prefixes also resolve to `undefined` — callers that want to surface a diagnostic can
 * check `isBindPath()` first.
 */
export interface BindingScope {
  local?: Record<string, unknown>;
  state?: Record<string, unknown>;
  session?: Record<string, unknown>;
  route?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

/** Render-scope prefixes a `$bind` path may start with. `event.<path>` is action-time only and lives in `actions/interpreter.ts`. */
export const RENDER_SCOPE_PREFIXES = ["local", "state", "session", "route", "data"] as const;
export type RenderScopePrefix = (typeof RENDER_SCOPE_PREFIXES)[number];

const BIND_PREFIX_PATTERN = /^(local|state|session|route|data)(\..+)?$/;

/** True when `path` is a well-formed render-scope binding path (`state.x`, `local.item`, …). */
export function isBindPath(path: string): boolean {
  return BIND_PREFIX_PATTERN.test(path);
}

/**
 * Resolves `<scope>.<dotted.path>` against `scope`. Returns `undefined` for an unknown prefix,
 * a missing scope, or a missing key along the path — deterministically, never a throw.
 */
export function resolvePath(path: string, scope: BindingScope): unknown {
  if (typeof path !== "string") return undefined;
  for (const prefix of RENDER_SCOPE_PREFIXES) {
    if (path.startsWith(`${prefix}.`)) {
      const target = scope[prefix];
      if (!target) return undefined;
      return getByPath(target, path.slice(prefix.length + 1));
    }
  }
  return undefined;
}