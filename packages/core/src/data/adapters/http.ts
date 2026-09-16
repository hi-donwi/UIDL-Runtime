import { DataError } from "../errors";
import type { DataAdapter, Mutation, Query, QueryResult, RecordMeta } from "../types";

export interface HttpAdapterOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  headers?: HeadersInit;
  timeoutMs?: number;
  dedup?: boolean;
}

interface ErrorResponse {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
  };
}

const STATUS_TO_CODE: Record<number, DataError["code"]> = {
  400: "validation",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  408: "timeout",
};

export class HttpAdapter implements DataAdapter {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly headers?: HeadersInit;
  private readonly timeoutMs: number;
  private readonly dedupEnabled: boolean;
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(options: HttpAdapterOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    // Native fetch throws "Illegal invocation" in browsers if called detached from its
    // required WindowOrWorkerGlobalScope receiver, so bind rather than reference it bare.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.headers = options.headers;
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.dedupEnabled = options.dedup !== false;
  }

  async query<T = Record<string, unknown>>(query: Query, signal?: AbortSignal): Promise<QueryResult<T>> {
    return this.request<QueryResult<T>>("/query", { method: "POST", body: query, dedup: true }, signal);
  }

  async get<T = Record<string, unknown>>(
    collection: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<{ record: T; meta: RecordMeta } | undefined> {
    return this.request<{ record: T; meta: RecordMeta } | undefined>(
      `/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
      { method: "GET", allowNotFound: true, dedup: true },
      signal,
    );
  }

  async create<T = Record<string, unknown>>(mutation: Mutation, signal?: AbortSignal): Promise<{ record: T; meta: RecordMeta }> {
    return this.request<{ record: T; meta: RecordMeta }>(
      `/records/${encodeURIComponent(mutation.collection)}`,
      { method: "POST", body: mutation },
      signal,
    );
  }

  async update<T = Record<string, unknown>>(mutation: Mutation, signal?: AbortSignal): Promise<{ record: T; meta: RecordMeta }> {
    if (!mutation.id) throw new DataError("update requires an id", "validation");
    return this.request<{ record: T; meta: RecordMeta }>(
      `/records/${encodeURIComponent(mutation.collection)}/${encodeURIComponent(mutation.id)}`,
      { method: "PATCH", body: mutation },
      signal,
    );
  }

  async remove(collection: string, id: string, signal?: AbortSignal): Promise<void> {
    await this.request<void>(`/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, { method: "DELETE" }, signal);
  }

  async transition<T = Record<string, unknown>>(
    mutation: Mutation & { transition: string },
    signal?: AbortSignal,
  ): Promise<{ record: T; meta: RecordMeta }> {
    if (!mutation.id) throw new DataError("transition requires an id", "validation");
    return this.request<{ record: T; meta: RecordMeta }>(
      `/records/${encodeURIComponent(mutation.collection)}/${encodeURIComponent(mutation.id)}/transition`,
      { method: "POST", body: mutation },
      signal,
    );
  }

  async report<T = unknown>(name: string, params: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
    return this.request<T>(`/reports/${encodeURIComponent(name)}`, { method: "POST", body: { params }, dedup: true }, signal);
  }

  private async request<T>(
    path: string,
    options: { method: string; body?: unknown; allowNotFound?: boolean; dedup?: boolean },
    signal?: AbortSignal,
  ): Promise<T> {
    const isRead = options.method === "GET" || options.dedup === true;
    const shouldDedup = this.dedupEnabled && isRead;
    const dedupKey = shouldDedup
      ? `${options.method}:${path}:${options.body !== undefined ? JSON.stringify(options.body) : ""}`
      : null;

    let exec: Promise<T>;
    if (dedupKey && this.inFlight.has(dedupKey)) {
      exec = this.inFlight.get(dedupKey) as Promise<T>;
    } else {
      exec = this.executeRequest<T>(path, options);
      if (dedupKey) {
        this.inFlight.set(dedupKey, exec);
        exec.catch(() => {}).finally(() => {
          if (this.inFlight.get(dedupKey) === exec) {
            this.inFlight.delete(dedupKey);
          }
        });
      }
    }

    if (!signal) {
      return exec;
    }

    if (signal.aborted) {
      throw new DataError("HTTP request was aborted", "network");
    }

    return new Promise<T>((resolve, reject) => {
      const onAbort = () => reject(new DataError("HTTP request was aborted", "network"));
      signal.addEventListener("abort", onAbort, { once: true });
      exec.then(
        (val) => {
          signal.removeEventListener("abort", onAbort);
          resolve(val);
        },
        (err) => {
          signal.removeEventListener("abort", onAbort);
          reject(err);
        },
      );
    });
  }

  private async executeRequest<T>(
    path: string,
    options: { method: string; body?: unknown; allowNotFound?: boolean },
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: options.method,
        headers: {
          Accept: "application/json",
          ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
          ...this.headers,
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });

      if (options.allowNotFound && response.status === 404) return undefined as T;
      if (!response.ok) throw await toDataError(response);
      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof DataError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new DataError("HTTP request timed out", "timeout");
      }
      throw new DataError(error instanceof Error ? error.message : "HTTP request failed", "network");
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function toDataError(response: Response): Promise<DataError> {
  let parsed: ErrorResponse | undefined;
  try {
    parsed = (await response.json()) as ErrorResponse;
  } catch {
    parsed = undefined;
  }
  const code = STATUS_TO_CODE[response.status] ?? (response.status >= 500 ? "server" : "validation");
  return new DataError(parsed?.error?.message ?? `HTTP ${response.status}`, parsed?.error?.code === code ? code : code, parsed?.error?.fields);
}

export function createHttpAdapter(options: HttpAdapterOptions): HttpAdapter {
  return new HttpAdapter(options);
}
