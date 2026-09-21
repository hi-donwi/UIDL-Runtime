import type {
  CapabilityIssue,
  CompilePageInput,
  CompilePageResult,
} from "./types.js";

export interface RemotePageCompilerOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  headers?: HeadersInit;
  timeoutMs?: number;
}

export interface ValidateResult {
  valid: boolean;
  issues: CapabilityIssue[];
}

export interface RemoteHealthResult {
  status: string;
  service?: string;
  version?: string;
  recipes?: string[];
  [key: string]: unknown;
}

export class RemoteCompilerError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "RemoteCompilerError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RemotePageCompiler {
  compilePage(input: CompilePageInput, signal?: AbortSignal): Promise<CompilePageResult>;
  validate(input: CompilePageInput, signal?: AbortSignal): Promise<ValidateResult>;
  health(signal?: AbortSignal): Promise<RemoteHealthResult>;
}

export function createRemotePageCompiler(options: RemotePageCompilerOptions): RemotePageCompiler {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  const defaultTimeoutMs = options.timeoutMs ?? 15000;

  async function request<T>(
    path: string,
    init: RequestInit,
    callerSignal?: AbortSignal,
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), defaultTimeoutMs);

    if (callerSignal) {
      callerSignal.addEventListener("abort", () => controller.abort());
    }

    try {
      const url = `${baseUrl}${path}`;
      const headers = new Headers(options.headers);
      if (!headers.has("Content-Type") && init.body) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetchImpl(url, {
        ...init,
        headers,
        signal: controller.signal,
      });

      const text = await response.text();
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : undefined;
      } catch {
        data = text;
      }

      if (!response.ok) {
        let code: string | undefined;
        let message = `Remote compiler request failed with status ${response.status}`;

        if (data && typeof data === "object") {
          const errObj = data as Record<string, unknown>;
          code = typeof errObj.code === "string" ? errObj.code : undefined;
          if (typeof errObj.message === "string") {
            message = errObj.message;
          }
        }

        throw new RemoteCompilerError(message, response.status, code, data);
      }

      return data as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    async compilePage(input: CompilePageInput, signal?: AbortSignal): Promise<CompilePageResult> {
      return request<CompilePageResult>(
        "/api/v1/compile",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
        signal,
      );
    },

    async validate(input: CompilePageInput, signal?: AbortSignal): Promise<ValidateResult> {
      return request<ValidateResult>(
        "/api/v1/validate",
        {
          method: "POST",
          body: JSON.stringify({
            recipe: input.recipe,
            meta: input.meta,
            hostCapabilities: input.hostCapabilities,
          }),
        },
        signal,
      );
    },

    async health(signal?: AbortSignal): Promise<RemoteHealthResult> {
      return request<RemoteHealthResult>(
        "/api/v1/health",
        {
          method: "GET",
        },
        signal,
      );
    },
  };
}
