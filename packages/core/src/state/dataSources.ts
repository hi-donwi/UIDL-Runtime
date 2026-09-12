import type { DataAdapter, Query } from "../data/types";
import { DataError } from "../data/errors";
import { getByPath } from "./createDocumentState";
import type { DocumentStateStore } from "./createDocumentState";

export interface DataSourceResolver {
  resolve(sourceName: string, config: unknown): unknown;
}

export interface DataSourceContext {
  sources: Record<string, unknown>;
  resolver: DataSourceResolver;
}

export function createInlineArrayResolver(): DataSourceResolver {
  return {
    resolve(_sourceName: string, config: unknown): unknown {
      if (Array.isArray(config)) {
        return config;
      }
      return undefined;
    },
  };
}

// ---------------------------------------------------------------------------
// `$query` data sources — the async half. A `dataSources` entry can be an inline array (handled
// above, synchronously, since forever) or `{ "$query": { collection, filters, sort, ... } }`,
// resolved against a `DataAdapter` by `runDataSources` below. See
// `.notes/plan/01-arsitektur-target.md` §3 for why this exists: it's the seam that lets a
// document ask for filtered/sorted/paginated data without knowing whether the answer comes from
// memory or a real API.
// ---------------------------------------------------------------------------

export interface QueryDataSource {
  $query: {
    collection: string;
    filters?: Array<{ field: string; op: string; value: unknown }>;
    sort?: Array<{ field: string; dir: "asc" | "desc" }>;
    page?: { number?: unknown; size?: unknown };
    search?: unknown;
    fields?: string[];
  };
}

export function isQueryDataSource(value: unknown): value is QueryDataSource {
  return !!value && typeof value === "object" && "$query" in (value as Record<string, unknown>);
}

export interface BindScope {
  state?: Record<string, unknown>;
  session?: Record<string, unknown>;
}

/** Resolves `{"$bind": "state.x"}`/`{"$bind": "session.x"}` leaves anywhere inside a `$query`
 *  descriptor. Deliberately narrower than `RenderNode`'s render-scope `$bind` (no `local.`/
 *  `route.`/`data.`) — a `dataSources` entry is declared at the document level, not inside a
 *  repeated node, so state and session are the only scopes that make sense here. */
function resolveBindDeep(value: unknown, scope: BindScope): unknown {
  if (Array.isArray(value)) return value.map((item) => resolveBindDeep(item, scope));
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.$bind === "string" && Object.keys(obj).length === 1) {
      const path = obj.$bind;
      if (path.startsWith("state.")) return scope.state ? getByPath(scope.state, path.slice("state.".length)) : undefined;
      if (path.startsWith("session.")) return scope.session ? getByPath(scope.session, path.slice("session.".length)) : undefined;
      return undefined;
    }
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(obj)) out[key] = resolveBindDeep(inner, scope);
    return out;
  }
  return value;
}

export function resolveQueryDescriptor(descriptor: QueryDataSource, scope: BindScope): Query {
  return resolveBindDeep(descriptor.$query, scope) as Query;
}

export type DataSourceStatus = "idle" | "loading" | "success" | "error";

export interface RunDataSourcesOptions {
  adapter: DataAdapter;
  stateStore: DocumentStateStore;
  session?: Record<string, unknown>;
  signal?: AbortSignal;
}

/**
 * Runs every `$query` entry in `dataSources` against `adapter`, writing
 * `state.$data.<name>.{status,rows,total,error}` as each settles. Inline array entries are
 * untouched (they resolve synchronously elsewhere, as they always have). Errors are normalized
 * to `DataError` shape before being written, so a document's `visibility.condition` on
 * `state.$data.<name>.error.code` behaves the same whether the adapter is in-memory or HTTP.
 *
 * A caller that re-invokes this on every state change (as `UIDocumentRenderer` does) must diff
 * the *resolved* query per name against the previous run before calling — this function itself
 * does not debounce or dedupe, so re-running it with an unchanged query re-fetches unconditionally.
 */
export async function runDataSources(
  dataSources: Record<string, unknown> | undefined,
  options: RunDataSourcesOptions,
): Promise<void> {
  if (!dataSources) return;

  const entries = Object.entries(dataSources).filter((entry): entry is [string, QueryDataSource] => isQueryDataSource(entry[1]));
  if (entries.length === 0) return;

  for (const [name] of entries) {
    options.stateStore.setState(`$data.${name}.status`, "loading" satisfies DataSourceStatus);
  }

  await Promise.all(
    entries.map(async ([name, descriptor]) => {
      try {
        const query = resolveQueryDescriptor(descriptor, {
          state: options.stateStore.getValue() as Record<string, unknown>,
          session: options.session,
        });
        const result = await options.adapter.query(query, options.signal);
        options.stateStore.setState(`$data.${name}.status`, "success" satisfies DataSourceStatus);
        options.stateStore.setState(`$data.${name}.rows`, result.rows);
        options.stateStore.setState(`$data.${name}.total`, result.total);
        options.stateStore.setState(`$data.${name}.error`, null);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return; // superseded by a newer run, not a real failure
        const dataError = error instanceof DataError ? error : new DataError(String(error), "server");
        options.stateStore.setState(`$data.${name}.status`, "error" satisfies DataSourceStatus);
        options.stateStore.setState(`$data.${name}.error`, { code: dataError.code, message: dataError.message });
      }
    }),
  );
}

/** Serializes the resolved (post-`$bind`) query per `$query` data source, for a caller to diff
 *  against the previous run and decide which entries actually need re-fetching. */
export function serializeResolvedQueries(dataSources: Record<string, unknown> | undefined, scope: BindScope): Record<string, string> {
  if (!dataSources) return {};
  const out: Record<string, string> = {};
  for (const [name, config] of Object.entries(dataSources)) {
    if (isQueryDataSource(config)) out[name] = JSON.stringify(resolveQueryDescriptor(config, scope));
  }
  return out;
}
