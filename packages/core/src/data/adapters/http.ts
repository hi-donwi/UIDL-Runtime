import { DataError } from "../errors";
import type { DataAdapter, Mutation, Query, QueryResult, RecordMeta } from "../types";

export interface HttpAdapterOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  headers?: HeadersInit;
  timeoutMs?: number;
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

  constructor(options: HttpAdapterOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    // Native fetch throws "Illegal invocation" in browsers if called detached from its
    // required WindowOrWorkerGlobalScope receiver, so bind rather than reference it bare.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.headers = options.headers;
    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  async query<T = Record<string, unknown>>(query: Query, signal?: AbortSignal): Promise<QueryResult<T>> {
    return this.request<QueryResult<T>>("/query", { method: "POST", body: query }, signal);
  }

  async get<T = Record<string, unknown>>(
    collection: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<{ record: T; meta: RecordMeta } | undefined> {
    return this.request<{ record: T; meta: RecordMeta } | undefined>(
      `/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
      { method: "GET", allowNotFound: true },
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
    return this.request<T>(`/reports/${encodeURIComponent(name)}`, { method: "POST", body: { params } }, signal);
  }

  private async request<T>(
    path: string,
    options: { method: string; body?: unknown; allowNotFound?: boolean },
    signal?: AbortSignal,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const abortFromCaller = () => controller.abort();
    signal?.addEventListener("abort", abortFromCaller, { once: true });

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
        throw new DataError("HTTP request timed out or was aborted", signal?.aborted ? "network" : "timeout");
      }
      throw new DataError(error instanceof Error ? error.message : "HTTP request failed", "network");
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortFromCaller);
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
