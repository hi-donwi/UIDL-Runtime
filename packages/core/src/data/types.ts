/**
 * The data contract every demo/document talks to instead of a specific storage. Two
 * implementations exist — `InMemoryAdapter` (default, mock) and `HttpAdapter` (real backend) —
 * and a shared contract test (`__tests__/contract.test.ts`) runs the same case matrix against
 * both, so switching the adapter a host wires up is the only thing that changes.
 */

export type QueryOp = "eq" | "ne" | "in" | "gt" | "gte" | "lt" | "lte" | "like" | "between";

export interface QueryFilter {
  field: string;
  op: QueryOp;
  /** `in`/`between` take an array; every other op takes a scalar. */
  value: unknown;
}

export interface QuerySort {
  field: string;
  dir: "asc" | "desc";
}

export interface QueryPage {
  number: number; // 1-based
  size: number;
}

export interface Query {
  collection: string;
  filters?: QueryFilter[];
  sort?: QuerySort[];
  page?: QueryPage;
  /** Free-text search across whatever fields the collection marks searchable. */
  search?: string;
  /** Column projection; omitted = every field. */
  fields?: string[];
}

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Mutation {
  collection: string;
  id?: string;
  data?: Record<string, unknown>;
  /** State-machine transition name, e.g. "submit" | "cancel" | "pay". */
  transition?: string;
  /** Optimistic-concurrency token: the version the client last read. */
  version?: number;
}

export interface RecordMeta {
  version: number;
}

export interface DataAdapter {
  query<T = Record<string, unknown>>(query: Query, signal?: AbortSignal): Promise<QueryResult<T>>;
  get<T = Record<string, unknown>>(
    collection: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<{ record: T; meta: RecordMeta } | undefined>;
  create<T = Record<string, unknown>>(mutation: Mutation, signal?: AbortSignal): Promise<{ record: T; meta: RecordMeta }>;
  update<T = Record<string, unknown>>(mutation: Mutation, signal?: AbortSignal): Promise<{ record: T; meta: RecordMeta }>;
  remove(collection: string, id: string, signal?: AbortSignal): Promise<void>;
  transition<T = Record<string, unknown>>(
    mutation: Mutation & { transition: string },
    signal?: AbortSignal,
  ): Promise<{ record: T; meta: RecordMeta }>;
  report<T = unknown>(name: string, params: Record<string, unknown>, signal?: AbortSignal): Promise<T>;
}

export { DataError, isDataError } from "./errors";
export type { DataErrorCode } from "./errors";
