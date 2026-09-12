/**
 * `useCollection`, `useRecord`, `useMutation` — Data hooks with dirty-tracking and optimistic rollback.
 *
 * Implements React hooks on top of `DataAdapter` supporting:
 *   - Collection querying, filtering, sorting, pagination
 *   - Single record fetching, field mutations, and dirty-state tracking
 *   - Optimistic mutations with automatic rollback and DataError capture
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DataAdapter, Query, QueryFilter, QuerySort, RecordMeta } from "~/data/types";

export interface UseCollectionOptions {
  adapter: DataAdapter;
  initialQuery?: Partial<Query>;
  autoFetch?: boolean;
}

export interface UseCollectionResult<T extends Record<string, unknown> = Record<string, unknown>> {
  rows: T[];
  total: number;
  loading: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  filters: QueryFilter[];
  sort?: QuerySort[];
  search?: string;
  refetch: () => Promise<void>;
  setFilter: (field: string, op: QueryFilter["op"], value: unknown) => void;
  clearFilter: (field: string) => void;
  setSort: (field: string, dir?: "asc" | "desc") => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearch: (query: string) => void;
}

export function useCollection<T extends Record<string, unknown> = Record<string, unknown>>(
  collection: string,
  options: UseCollectionOptions,
): UseCollectionResult<T> {
  const { adapter, initialQuery, autoFetch = true } = options;

  const [page, setPage] = useState(initialQuery?.page?.number ?? 1);
  const [pageSize, setPageSize] = useState(initialQuery?.page?.size ?? 20);
  const [filters, setFilters] = useState<QueryFilter[]>(initialQuery?.filters ?? []);
  const [sort, setSortState] = useState<QuerySort[] | undefined>(initialQuery?.sort);
  const [search, setSearchState] = useState<string | undefined>(initialQuery?.search);

  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const activeQuery = useMemo<Query>(
    () => ({
      collection,
      page: { number: page, size: pageSize },
      filters,
      sort,
      search,
    }),
    [collection, page, pageSize, filters, sort, search],
  );

  const fetchCollection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adapter.query<T>(activeQuery);
      setRows(result.rows);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [adapter, activeQuery]);

  useEffect(() => {
    if (autoFetch) {
      queueMicrotask(() => {
        void fetchCollection();
      });
    }
  }, [autoFetch, fetchCollection]);

  const setFilter = useCallback((field: string, op: QueryFilter["op"], value: unknown) => {
    setFilters((prev) => {
      const next = prev.filter((f) => f.field !== field);
      if (value !== undefined && value !== null && value !== "") {
        next.push({ field, op, value });
      }
      return next;
    });
    setPage(1);
  }, []);

  const clearFilter = useCallback((field: string) => {
    setFilters((prev) => prev.filter((f) => f.field !== field));
    setPage(1);
  }, []);

  const setSort = useCallback((field: string, dir: "asc" | "desc" = "asc") => {
    setSortState([{ field, dir }]);
  }, []);

  const setSearch = useCallback((query: string) => {
    setSearchState(query);
    setPage(1);
  }, []);

  return {
    rows,
    total,
    loading,
    error,
    page,
    pageSize,
    filters,
    sort,
    search,
    refetch: fetchCollection,
    setFilter,
    clearFilter,
    setSort,
    setPage,
    setPageSize,
    setSearch,
  };
}

export interface UseRecordOptions {
  adapter: DataAdapter;
  autoFetch?: boolean;
}

export interface UseRecordResult<T extends Record<string, unknown> = Record<string, unknown>> {
  record: T | null;
  draft: Partial<T>;
  meta: RecordMeta | null;
  loading: boolean;
  saving: boolean;
  error: Error | null;
  isDirty: boolean;
  setField: <K extends keyof T>(field: K, value: T[K]) => void;
  setFields: (fields: Partial<T>) => void;
  reset: () => void;
  save: () => Promise<T>;
  refetch: () => Promise<void>;
}

export function useRecord<T extends Record<string, unknown> = Record<string, unknown>>(
  collection: string,
  id: string,
  options: UseRecordOptions,
): UseRecordResult<T> {
  const { adapter, autoFetch = true } = options;
  const isNew = id === "new";

  const [record, setRecord] = useState<T | null>(null);
  const [draft, setDraft] = useState<Partial<T>>({});
  const [meta, setMeta] = useState<RecordMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecord = useCallback(async () => {
    if (isNew) {
      setRecord(null);
      setDraft({});
      setMeta(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetched = await adapter.get<T>(collection, id);
      if (fetched) {
        setRecord(fetched.record);
        setDraft(fetched.record);
        setMeta(fetched.meta);
      } else {
        setRecord(null);
        setDraft({});
        setMeta(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [adapter, collection, id, isNew]);

  useEffect(() => {
    if (autoFetch) {
      queueMicrotask(() => {
        void fetchRecord();
      });
    }
  }, [autoFetch, fetchRecord]);

  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setFields = useCallback((fields: Partial<T>) => {
    setDraft((prev) => ({ ...prev, ...fields }));
  }, []);

  const reset = useCallback(() => {
    setDraft(record ?? {});
    setError(null);
  }, [record]);

  const isDirty = useMemo(() => {
    if (isNew) {
      return Object.keys(draft).some((k) => draft[k as keyof T] !== undefined && draft[k as keyof T] !== "");
    }
    if (!record) return false;
    return Object.keys(draft).some((k) => draft[k as keyof T] !== record[k as keyof T]);
  }, [isNew, record, draft]);

  const save = useCallback(async (): Promise<T> => {
    setSaving(true);
    setError(null);
    try {
      let saved: { record: T; meta: RecordMeta };
      if (isNew) {
        saved = await adapter.create<T>({ collection, data: draft as Record<string, unknown> });
      } else {
        saved = await adapter.update<T>({
          collection,
          id,
          data: draft as Record<string, unknown>,
          version: meta?.version,
        });
      }
      setRecord(saved.record);
      setDraft(saved.record);
      setMeta(saved.meta);
      return saved.record;
    } catch (err) {
      const errObj = err instanceof Error ? err : new Error(String(err));
      setError(errObj);
      throw errObj;
    } finally {
      setSaving(false);
    }
  }, [adapter, collection, id, isNew, draft, meta]);

  return {
    record,
    draft,
    meta,
    loading,
    saving,
    error,
    isDirty,
    setField,
    setFields,
    reset,
    save,
    refetch: fetchRecord,
  };
}

export interface UseMutationOptions {
  adapter: DataAdapter;
  onSuccess?: (action: "create" | "update" | "delete", data: unknown) => void;
  onError?: (err: Error, action: "create" | "update" | "delete") => void;
}

export interface UseMutationResult {
  loading: boolean;
  error: Error | null;
  create: <T extends Record<string, unknown>>(collection: string, data: T) => Promise<T>;
  update: <T extends Record<string, unknown>>(
    collection: string,
    id: string,
    patch: Partial<T>,
    optimisticCurrent?: T[],
    setOptimisticRows?: React.Dispatch<React.SetStateAction<T[]>>,
    version?: number,
  ) => Promise<T>;
  remove: <T extends Record<string, unknown>>(
    collection: string,
    id: string,
    optimisticCurrent?: T[],
    setOptimisticRows?: React.Dispatch<React.SetStateAction<T[]>>,
  ) => Promise<void>;
}

export function useMutation(options: UseMutationOptions): UseMutationResult {
  const { adapter, onSuccess, onError } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(
    async <T extends Record<string, unknown>>(collection: string, data: T): Promise<T> => {
      setLoading(true);
      setError(null);
      try {
        const result = await adapter.create<T>({ collection, data: data as Record<string, unknown> });
        onSuccess?.("create", result.record);
        return result.record;
      } catch (err) {
        const errObj = err instanceof Error ? err : new Error(String(err));
        setError(errObj);
        onError?.(errObj, "create");
        throw errObj;
      } finally {
        setLoading(false);
      }
    },
    [adapter, onSuccess, onError],
  );

  const update = useCallback(
    async <T extends Record<string, unknown>>(
      collection: string,
      id: string,
      patch: Partial<T>,
      optimisticCurrent?: T[],
      setOptimisticRows?: React.Dispatch<React.SetStateAction<T[]>>,
      version?: number,
    ): Promise<T> => {
      setLoading(true);
      setError(null);

      const rollbackCopy = optimisticCurrent ? [...optimisticCurrent] : undefined;

      // Apply optimistic update if requested
      if (optimisticCurrent && setOptimisticRows) {
        setOptimisticRows(
          optimisticCurrent.map((r) => ((r.id as string) === id ? { ...r, ...patch } : r)),
        );
      }

      try {
        const result = await adapter.update<T>({
          collection,
          id,
          data: patch as Record<string, unknown>,
          version,
        });
        onSuccess?.("update", result.record);
        return result.record;
      } catch (err) {
        // Rollback optimistic update
        if (rollbackCopy && setOptimisticRows) {
          setOptimisticRows(rollbackCopy);
        }
        const errObj = err instanceof Error ? err : new Error(String(err));
        setError(errObj);
        onError?.(errObj, "update");
        throw errObj;
      } finally {
        setLoading(false);
      }
    },
    [adapter, onSuccess, onError],
  );

  const remove = useCallback(
    async <T extends Record<string, unknown>>(
      collection: string,
      id: string,
      optimisticCurrent?: T[],
      setOptimisticRows?: React.Dispatch<React.SetStateAction<T[]>>,
    ): Promise<void> => {
      setLoading(true);
      setError(null);

      const rollbackCopy = optimisticCurrent ? [...optimisticCurrent] : undefined;

      // Apply optimistic delete
      if (optimisticCurrent && setOptimisticRows) {
        setOptimisticRows(optimisticCurrent.filter((r) => (r.id as string) !== id));
      }

      try {
        await adapter.remove(collection, id);
        onSuccess?.("delete", id);
      } catch (err) {
        // Rollback optimistic delete
        if (rollbackCopy && setOptimisticRows) {
          setOptimisticRows(rollbackCopy);
        }
        const errObj = err instanceof Error ? err : new Error(String(err));
        setError(errObj);
        onError?.(errObj, "delete");
        throw errObj;
      } finally {
        setLoading(false);
      }
    },
    [adapter, onSuccess, onError],
  );

  return {
    loading,
    error,
    create,
    update,
    remove,
  };
}
