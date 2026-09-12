import { DataError } from "../errors";
import type { DataAdapter, Mutation, Query, QueryFilter, QueryResult, RecordMeta } from "../types";

interface StoredRecord {
  data: Record<string, unknown>;
  version: number;
}

export interface InMemoryAdapterOptions {
  /** Initial collections, e.g. `{ SalesInvoice: [...] }`. Copied on construction — the caller's
   *  array is never mutated. */
  seed?: Record<string, Array<Record<string, unknown>>>;
  /** `"localStorage"` persists every mutation and reloads it on construction; `"none"` (default
   *  in tests) keeps everything in memory only. */
  persist?: "localStorage" | "none";
  /** Key the store is saved under when `persist: "localStorage"`. */
  storageKey?: string;
  /** Artificial delay applied to every call, so loading/skeleton states are actually exercised
   *  in mock mode instead of resolving instantly. Default 0. */
  latencyMs?: number;
  /** Fraction (0–1) of calls that fail with a synthetic `DataError("server")`, so error states
   *  are exercised in mock mode too. Default 0. */
  failureRate?: number;
  /** Injectable clock/random for deterministic tests. */
  now?: () => number;
  random?: () => number;
}

function matchesFilter(record: Record<string, unknown>, filter: QueryFilter): boolean {
  if (filter.value === undefined || filter.value === null || filter.value === "") return true;
  const value = record[filter.field];
  switch (filter.op) {
    case "eq":
      return value === filter.value;
    case "ne":
      return value !== filter.value;
    case "in":
      return Array.isArray(filter.value) && filter.value.includes(value);
    case "gt":
      return typeof value === "number" && typeof filter.value === "number" && value > filter.value;
    case "gte":
      return typeof value === "number" && typeof filter.value === "number" && value >= filter.value;
    case "lt":
      return typeof value === "number" && typeof filter.value === "number" && value < filter.value;
    case "lte":
      return typeof value === "number" && typeof filter.value === "number" && value <= filter.value;
    case "like":
      return typeof value === "string" && typeof filter.value === "string" && value.toLowerCase().includes(filter.value.toLowerCase());
    case "between": {
      if (!Array.isArray(filter.value) || filter.value.length !== 2) return false;
      const [lo, hi] = filter.value as [unknown, unknown];
      if (typeof value === "number" && typeof lo === "number" && typeof hi === "number") return value >= lo && value <= hi;
      if (typeof value === "string" && typeof lo === "string" && typeof hi === "string") return value >= lo && value <= hi;
      return false;
    }
    default:
      return true;
  }
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a) < String(b) ? -1 : 1;
}

/** In-memory `DataAdapter`. Default for demos and tests; every failure it raises is a real
 *  `DataError` with the same `.code` an `HttpAdapter` would raise for the same situation — see
 *  `src/data/__tests__/contract.test.ts` for the shared case matrix that keeps the two honest. */
export class InMemoryAdapter implements DataAdapter {
  private stores = new Map<string, StoredRecord[]>();
  private readonly persist: "localStorage" | "none";
  private readonly storageKey: string;
  private readonly latencyMs: number;
  private readonly failureRate: number;
  private readonly now: () => number;
  private readonly random: () => number;

  constructor(options: InMemoryAdapterOptions = {}) {
    this.persist = options.persist ?? "none";
    this.storageKey = options.storageKey ?? "uidl-runtime-data-adapter";
    this.latencyMs = options.latencyMs ?? 0;
    this.failureRate = options.failureRate ?? 0;
    this.now = options.now ?? (() => Date.now());
    this.random = options.random ?? (() => Math.random());

    const loaded = this.persist === "localStorage" ? this.loadFromStorage() : undefined;
    if (loaded) {
      for (const [collection, records] of Object.entries(loaded)) this.stores.set(collection, records);
    } else if (options.seed) {
      for (const [collection, rows] of Object.entries(options.seed)) {
        this.stores.set(
          collection,
          rows.map((data) => ({ data: { ...data }, version: 1 })),
        );
      }
      this.saveToStorage();
    }
  }

  private async simulate(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (this.latencyMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.latencyMs);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      });
    }
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (this.failureRate > 0 && this.random() < this.failureRate) {
      throw new DataError("Simulated failure (failureRate)", "server");
    }
  }

  private collection(name: string): StoredRecord[] {
    return this.stores.get(name) ?? [];
  }

  async query<T = Record<string, unknown>>(query: Query, signal?: AbortSignal): Promise<QueryResult<T>> {
    await this.simulate(signal);

    let rows = this.collection(query.collection).map((r) => r.data);

    for (const filter of query.filters ?? []) rows = rows.filter((r) => matchesFilter(r, filter));

    if (query.search) {
      const q = query.search.toLowerCase();
      rows = rows.filter((r) => Object.values(r).some((v) => typeof v === "string" && v.toLowerCase().includes(q)));
    }

    for (const sort of [...(query.sort ?? [])].reverse()) {
      const dir = sort.dir === "desc" ? -1 : 1;
      rows = [...rows].sort((a, b) => dir * compareValues(a[sort.field], b[sort.field]));
    }

    const total = rows.length;
    const pageNumber = query.page?.number ?? 1;
    const pageSize = query.page?.size ?? (total || 1);
    if (query.page) {
      const start = (pageNumber - 1) * pageSize;
      rows = rows.slice(start, start + pageSize);
    }

    if (query.fields && query.fields.length > 0) {
      const fields = query.fields;
      rows = rows.map((r) => Object.fromEntries(fields.map((f) => [f, r[f]])));
    }

    return { rows: rows as T[], total, page: pageNumber, pageSize };
  }

  async get<T = Record<string, unknown>>(
    collection: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<{ record: T; meta: RecordMeta } | undefined> {
    await this.simulate(signal);
    const found = this.collection(collection).find((r) => r.data.id === id);
    if (!found) return undefined;
    return { record: { ...found.data } as T, meta: { version: found.version } };
  }

  async create<T = Record<string, unknown>>(mutation: Mutation, signal?: AbortSignal): Promise<{ record: T; meta: RecordMeta }> {
    await this.simulate(signal);
    const list = this.stores.get(mutation.collection) ?? [];
    const id = (mutation.data?.id as string | undefined) ?? this.generateId(mutation.collection);
    if (list.some((r) => r.data.id === id)) {
      throw new DataError(`Record "${id}" already exists in "${mutation.collection}"`, "conflict");
    }
    const record: StoredRecord = { data: { ...mutation.data, id }, version: 1 };
    list.push(record);
    this.stores.set(mutation.collection, list);
    this.saveToStorage();
    return { record: { ...record.data } as T, meta: { version: record.version } };
  }

  async update<T = Record<string, unknown>>(mutation: Mutation, signal?: AbortSignal): Promise<{ record: T; meta: RecordMeta }> {
    await this.simulate(signal);
    if (!mutation.id) throw new DataError("update requires an id", "validation");
    const list = this.stores.get(mutation.collection) ?? [];
    const index = list.findIndex((r) => r.data.id === mutation.id);
    if (index === -1) throw new DataError(`Record "${mutation.id}" not found in "${mutation.collection}"`, "not_found");
    const existing = list[index];
    if (mutation.version !== undefined && mutation.version !== existing.version) {
      throw new DataError(`Record "${mutation.id}" has changed since it was read`, "conflict");
    }
    const updated: StoredRecord = { data: { ...existing.data, ...mutation.data }, version: existing.version + 1 };
    list[index] = updated;
    this.stores.set(mutation.collection, list);
    this.saveToStorage();
    return { record: { ...updated.data } as T, meta: { version: updated.version } };
  }

  async remove(collection: string, id: string, signal?: AbortSignal): Promise<void> {
    await this.simulate(signal);
    const list = this.stores.get(collection) ?? [];
    const filtered = list.filter((r) => r.data.id !== id);
    if (filtered.length === list.length) throw new DataError(`Record "${id}" not found in "${collection}"`, "not_found");
    this.stores.set(collection, filtered);
    this.saveToStorage();
  }

  async transition<T = Record<string, unknown>>(
    mutation: Mutation & { transition: string },
    signal?: AbortSignal,
  ): Promise<{ record: T; meta: RecordMeta }> {
    // The in-memory adapter has no state-machine knowledge of its own — that lives in the
    // demo-layer `documentService` (see `.notes/plan/01-arsitektur-target.md` §7), which calls
    // `update()` with the resulting status after validating the transition. This method exists
    // on the adapter purely so `HttpAdapter` and `InMemoryAdapter` expose the same surface for a
    // host that wants to call a transition endpoint directly.
    return this.update<T>({ ...mutation, data: { ...mutation.data, status: mutation.transition } }, signal);
  }

  async report<T = unknown>(_name: string, _params: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
    await this.simulate(signal);
    throw new DataError("InMemoryAdapter.report has no registered reports — pass a reportRunner", "not_found");
  }

  /** Test/demo-only escape hatch: reseed everything from scratch. Not part of `DataAdapter`. */
  reset(seed?: Record<string, Array<Record<string, unknown>>>): void {
    this.stores.clear();
    if (seed) {
      for (const [collection, rows] of Object.entries(seed)) {
        this.stores.set(
          collection,
          rows.map((data) => ({ data: { ...data }, version: 1 })),
        );
      }
    }
    this.saveToStorage();
  }

  private generateId(collection: string): string {
    const prefix = collection.slice(0, 3).toUpperCase();
    return `${prefix}-${this.now().toString(36)}-${Math.floor(this.random() * 1e6).toString(36)}`;
  }

  private saveToStorage(): void {
    if (this.persist !== "localStorage" || typeof window === "undefined") return;
    try {
      const obj: Record<string, StoredRecord[]> = {};
      for (const [k, v] of this.stores.entries()) obj[k] = v;
      window.localStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch {
      /* storage may be quota exceeded or unavailable */
    }
  }

  private loadFromStorage(): Record<string, StoredRecord[]> | undefined {
    if (typeof window === "undefined") return undefined;
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as Record<string, StoredRecord[]>;
      return parsed;
    } catch {
      return undefined;
    }
  }
}

export function createInMemoryAdapter(options?: InMemoryAdapterOptions): InMemoryAdapter {
  return new InMemoryAdapter(options);
}
