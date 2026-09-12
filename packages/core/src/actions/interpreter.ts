import type {
  Action,
  CommandActionConfig,
  CommandHandler,
  CommandRequest,
  CommandResponse,
  MutationActionConfig,
  MutationHandler,
  MutationRequest,
  MutationResponse,
} from "../types/actions";
import type { DocumentStateStore } from "../state/createDocumentState";
import { getByPath } from "../state/createDocumentState";
import { evaluate, type RenderScope } from "../expr/evaluate";
import { createEventBus } from "./eventBus";

/**
 * Resolves `{"$bind": "event"}` (the whole eventValue) or `{"$bind": "event.<path>"}` (a field
 * within it) — the mechanism a DataTable row action uses to reach its own row's data, e.g.
 * `{"navigate": {"route": {"$bind": "event.route"}}}` where each row carries its own `route`
 * field. Unrelated to the render-time `local.*`/`state.*` bindings in expr/evaluate.ts — those
 * resolve against render scope, this resolves against the second `execute()` argument.
 */
function resolveEventBind(bindPath: string, eventValue: unknown): unknown {
  if (bindPath === "event") return eventValue;
  if (bindPath.startsWith("event.") && eventValue && typeof eventValue === "object") {
    return getByPath(eventValue as Record<string, unknown>, bindPath.slice("event.".length));
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundActionValue(value: unknown): value is { $bind: string } {
  return isRecord(value) && typeof value.$bind === "string";
}

function isExprActionValue(value: unknown): value is { $expr: unknown } {
  return isRecord(value) && "$expr" in value;
}

function resolveActionValue(value: unknown, eventValue: unknown, scope: RenderScope): unknown {
  if (isBoundActionValue(value)) {
    return resolveEventBind(value.$bind, eventValue);
  }
  if (isExprActionValue(value)) {
    return evaluate(value.$expr, scope);
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveActionValue(item, eventValue, scope));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveActionValue(item, eventValue, scope)]),
    );
  }
  return value;
}

function requireResolvedString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`"${field}" must resolve to a non-empty string`);
  }
  return value;
}

function optionalResolvedString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return requireResolvedString(value, field);
}

function optionalResolvedId(value: unknown, field: string): string | number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    if (value.length === 0) throw new Error(`"${field}" must resolve to a non-empty string or number`);
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new Error(`"${field}" must resolve to a non-empty string or finite number`);
}

function optionalResolvedNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new Error(`"${field}" must resolve to a finite number`);
}

function optionalResolvedRecord(value: unknown, field: string): Record<string, unknown> | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) throw new Error(`"${field}" must resolve to an object`);
  return value;
}

function getStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value);
  if (!entries.every(([, item]) => typeof item === "string")) return undefined;
  return Object.fromEntries(entries) as Record<string, string>;
}

function normalizeMutationError(error: unknown): { message: string; code?: string; fields?: Record<string, string> } {
  const message = error instanceof Error ? error.message : "Mutation failed";
  if (!isRecord(error)) return { message };
  const code = typeof error.code === "string" ? error.code : undefined;
  const fields = getStringRecord(error.fields);
  return { message, code, fields };
}

const API_TIMEOUT_MS = 15000;
const DEFAULT_API_MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB
const DEFAULT_API_MAX_CONCURRENT_CALLS = 6;

/**
 * A list of allowed hostnames (exact match, or `*.example.com` for subdomains), or a predicate
 * for more advanced matching. `api` actions refuse to run unless this is provided — see
 * `ActionInterpreter`'s `apiAllowlist` handling for why the default is fail-closed, not open.
 */
export type ApiAllowlist = string[] | ((url: URL) => boolean);

export interface ActionContext {
  stateStore?: DocumentStateStore;
  session?: Record<string, unknown>;
  route?: Record<string, unknown>;
  data?: Record<string, unknown>;
  eventBus?: ReturnType<typeof createEventBus>;
  mutationHandler?: MutationHandler;
  commandHandler?: CommandHandler;
  apiAllowlist?: ApiAllowlist;
  /** Max `api` response body size in bytes before the request is aborted. Default 5MB. */
  apiMaxResponseBytes?: number;
  /**
   * Max number of `api` actions this interpreter runs concurrently; further calls fail fast
   * instead of queueing, so a document that fires many `api` actions at once (e.g. one per row
   * of a `repeat`) can't hammer an allowlisted host or exhaust client connections. Default 6.
   */
  apiMaxConcurrentCalls?: number;
}

function isHostAllowed(host: string, allowlist: string[]): boolean {
  return allowlist.some((entry) => {
    if (entry.startsWith("*.")) {
      const suffix = entry.slice(1); // ".example.com"
      return host === entry.slice(2) || host.endsWith(suffix);
    }
    return host === entry;
  });
}

export class ActionInterpreter {
  private stateStore?: DocumentStateStore;
  private route: Record<string, unknown>;
  private session: Record<string, unknown>;
  private data: Record<string, unknown>;
  private eventBus: ReturnType<typeof createEventBus>;
  private mutationHandler?: MutationHandler;
  private commandHandler?: CommandHandler;
  private apiAllowlist?: ApiAllowlist;
  private apiMaxResponseBytes: number;
  private apiMaxConcurrentCalls: number;
  private inFlightApiCalls = 0;

  constructor(context: ActionContext = {}) {
    this.stateStore = context.stateStore;
    this.route = context.route ?? {};
    this.session = context.session ?? {};
    this.data = context.data ?? {};
    this.eventBus = context.eventBus ?? createEventBus();
    this.mutationHandler = context.mutationHandler;
    this.commandHandler = context.commandHandler;
    this.apiAllowlist = context.apiAllowlist;
    this.apiMaxResponseBytes = context.apiMaxResponseBytes ?? DEFAULT_API_MAX_RESPONSE_BYTES;
    this.apiMaxConcurrentCalls = context.apiMaxConcurrentCalls ?? DEFAULT_API_MAX_CONCURRENT_CALLS;
  }

  getEventBus(): ReturnType<typeof createEventBus> {
    return this.eventBus;
  }

  execute(action: Action, eventValue?: unknown): void {
    try {
      this.executeAction(action, eventValue);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[uidl-runtime] Action execution failed:", error, action);
      }
    }
  }

  private executeAction(action: Action, eventValue?: unknown): void {
    if ("sequence" in action) {
      for (const seqAction of action.sequence) {
        this.executeAction(seqAction, eventValue);
      }
      return;
    }

    if ("if" in action) {
      const { condition, then: thenAction, else: elseAction } = action.if;
      const scope = this.buildScope();
      const result = Boolean(evaluate(condition, scope));
      if (result && thenAction) {
        this.executeAction(thenAction, eventValue);
      } else if (!result && elseAction) {
        this.executeAction(elseAction, eventValue);
      }
      return;
    }

    if ("setState" in action) {
      const { path, value } = action.setState;
      const scope = this.buildScope();
      let resolvedValue: unknown;

      if (typeof value === "object" && value !== null && "$bind" in value) {
        resolvedValue = resolveEventBind((value as { $bind: string }).$bind, eventValue);
      } else if (value === null && eventValue !== undefined) {
        // The documented convention for form-widget onChange (README's "Two-way form binding"):
        // `value: null` is an explicit placeholder meaning "use whatever the change event
        // produced." A literal, non-null value (e.g. a row action's `value: "archived"`) must
        // win over eventValue instead of being silently discarded — eventValue is only an
        // implicit fallback for the null-placeholder convention, not a blanket override.
        resolvedValue = eventValue;
      } else if (typeof value === "object" && value !== null && "$expr" in value) {
        resolvedValue = evaluate((value as { $expr: unknown }).$expr, scope);
      } else {
        resolvedValue = value;
      }

      this.stateStore?.setState(path, resolvedValue);
      return;
    }

    if ("navigate" in action) {
      const { route: routeValue } = action.navigate;
      let resolvedRoute: unknown;
      if (typeof routeValue === "object" && routeValue !== null && "$bind" in routeValue) {
        resolvedRoute = resolveEventBind((routeValue as { $bind: string }).$bind, eventValue);
      } else {
        const scope = this.buildScope();
        resolvedRoute = typeof routeValue === "object" && routeValue !== null && "$expr" in routeValue
          ? evaluate((routeValue as { $expr: unknown }).$expr, scope)
          : routeValue;
      }
      if (typeof resolvedRoute === "string") {
        this.eventBus.emit("route-change", resolvedRoute);
      } else if (typeof resolvedRoute === "object" && resolvedRoute !== null) {
        this.eventBus.emit("route-change", resolvedRoute);
      }
      return;
    }

    if ("api" in action) {
      this.executeApi(action.api);
      return;
    }

    if ("mutate" in action) {
      this.executeMutation(action.mutate, eventValue);
      return;
    }

    if ("command" in action) {
      this.executeCommand(action.command, eventValue);
      return;
    }

    if ("showSnackbar" in action) {
      const { message, duration } = action.showSnackbar;
      this.eventBus.emit("snackbar", { message, duration: duration ?? 3000 });
      return;
    }

    if ("showDialog" in action) {
      this.eventBus.emit("dialog", action.showDialog);
      return;
    }

    if ("validate" in action) {
      this.eventBus.emit("validate", action.validate);
      return;
    }
  }

  private executeMutation(config: MutationActionConfig, eventValue?: unknown): void {
    if (config.statusPath) this.stateStore?.setState(config.statusPath, "loading");
    if (config.errorPath) this.stateStore?.setState(config.errorPath, undefined);
    if (config.fieldErrorsPath) this.stateStore?.setState(config.fieldErrorsPath, {});
    void this.runMutation(config, eventValue);
  }

  private async runMutation(config: MutationActionConfig, eventValue?: unknown): Promise<void> {
    let request: MutationRequest | undefined;
    try {
      request = this.buildMutationRequest(config, eventValue);
      if (!this.mutationHandler) {
        throw new Error(
          '"mutate" actions are disabled by default - pass mutationHandler to ActionInterpreter/renderUIDocument/UIDocumentRenderer to handle business writes',
        );
      }

      const data = await this.mutationHandler(request);
      if (config.resultPath) this.stateStore?.setState(config.resultPath, data);
      if (config.errorPath) this.stateStore?.setState(config.errorPath, undefined);
      if (config.fieldErrorsPath) this.stateStore?.setState(config.fieldErrorsPath, {});
      if (config.statusPath) this.stateStore?.setState(config.statusPath, "success");

      const response: MutationResponse = { success: true, request, data };
      this.eventBus.emit("mutation-response", response);
      if (config.onSuccess) {
        this.executeAction(config.onSuccess, data);
      }
    } catch (error) {
      const normalized = normalizeMutationError(error);
      if (config.statusPath) this.stateStore?.setState(config.statusPath, "error");
      if (config.errorPath) this.stateStore?.setState(config.errorPath, normalized.message);
      if (config.fieldErrorsPath) this.stateStore?.setState(config.fieldErrorsPath, normalized.fields ?? {});

      const response: MutationResponse = {
        success: false,
        ...(request ? { request } : {}),
        error: normalized.message,
        ...(normalized.code ? { code: normalized.code } : {}),
        ...(normalized.fields ? { fields: normalized.fields } : {}),
      };
      this.eventBus.emit("mutation-response", response);
      this.eventBus.emit("snackbar", { message: normalized.message, duration: 5000 });
      if (config.onError) {
        this.executeAction(config.onError, response);
      }
    }
  }

  private buildMutationRequest(config: MutationActionConfig, eventValue?: unknown): MutationRequest {
    const scope = this.buildScope();
    const request: MutationRequest = {
      operation: config.operation,
      collection: requireResolvedString(
        resolveActionValue(config.collection, eventValue, scope),
        "mutate.collection",
      ),
    };

    const id = optionalResolvedId(resolveActionValue(config.id, eventValue, scope), "mutate.id");
    if (id !== undefined) request.id = id;

    const payload = optionalResolvedRecord(resolveActionValue(config.payload, eventValue, scope), "mutate.payload");
    if (payload !== undefined) request.payload = payload;

    const transition = optionalResolvedString(
      resolveActionValue(config.transition, eventValue, scope),
      "mutate.transition",
    );
    if (transition !== undefined) request.transition = transition;

    const version = optionalResolvedNumber(resolveActionValue(config.version, eventValue, scope), "mutate.version");
    if (version !== undefined) request.version = version;

    if (
      (config.operation === "update" || config.operation === "delete" || config.operation === "transition") &&
      request.id === undefined
    ) {
      throw new Error(`"mutate.${config.operation}" requires an id`);
    }
    if (config.operation === "transition" && !request.transition) {
      throw new Error('"mutate.transition" actions require a transition name');
    }

    return request;
  }

  private executeCommand(config: CommandActionConfig, eventValue?: unknown): void {
    if (config.statusPath) this.stateStore?.setState(config.statusPath, "loading");
    if (config.errorPath) this.stateStore?.setState(config.errorPath, undefined);
    void this.runCommand(config, eventValue);
  }

  private async runCommand(config: CommandActionConfig, eventValue?: unknown): Promise<void> {
    let request: CommandRequest | undefined;
    try {
      request = this.buildCommandRequest(config, eventValue);
      if (!this.commandHandler) {
        throw new Error(
          '"command" actions are disabled by default - pass commandHandler to ActionInterpreter/renderUIDocument/UIDocumentRenderer to handle host commands',
        );
      }

      const data = await this.commandHandler(request);
      if (config.resultPath) this.stateStore?.setState(config.resultPath, data);
      if (config.errorPath) this.stateStore?.setState(config.errorPath, undefined);
      if (config.statusPath) this.stateStore?.setState(config.statusPath, "success");

      const response: CommandResponse = { success: true, request, data };
      this.eventBus.emit("command-response", response);
      if (config.onSuccess) {
        this.executeAction(config.onSuccess, data);
      }
    } catch (error) {
      const normalized = normalizeMutationError(error);
      if (config.statusPath) this.stateStore?.setState(config.statusPath, "error");
      if (config.errorPath) this.stateStore?.setState(config.errorPath, normalized.message);

      const response: CommandResponse = {
        success: false,
        ...(request ? { request } : {}),
        error: normalized.message,
        ...(normalized.code ? { code: normalized.code } : {}),
        ...(normalized.fields ? { fields: normalized.fields } : {}),
      };
      this.eventBus.emit("command-response", response);
      this.eventBus.emit("snackbar", { message: normalized.message, duration: 5000 });
      if (config.onError) {
        this.executeAction(config.onError, response);
      }
    }
  }

  private buildCommandRequest(config: CommandActionConfig, eventValue?: unknown): CommandRequest {
    const scope = this.buildScope();
    const request: CommandRequest = {
      name: requireResolvedString(
        resolveActionValue(config.name, eventValue, scope),
        "command.name",
      ),
    };
    const payload = optionalResolvedRecord(resolveActionValue(config.payload, eventValue, scope), "command.payload");
    if (payload !== undefined) request.payload = payload;
    return request;
  }

  private executeApi(config: { url: string; method: string; body?: Record<string, unknown>; dataSource?: string }): void {
    void this.fetchApi(config);
  }

  private async fetchApi(config: { url: string; method: string; body?: Record<string, unknown>; dataSource?: string }): Promise<void> {
    if (this.inFlightApiCalls >= this.apiMaxConcurrentCalls) {
      this.eventBus.emit("api-response", {
        success: false,
        error: `Too many concurrent "api" actions in flight (limit: ${this.apiMaxConcurrentCalls})`,
      });
      this.eventBus.emit("snackbar", { message: "Too many API requests in flight", duration: 5000 });
      return;
    }

    this.inFlightApiCalls++;
    try {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(config.url, typeof window !== "undefined" ? window.location.href : undefined);
      } catch {
        throw new Error(`Invalid API URL: ${config.url}`);
      }
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error(`Unsupported API URL scheme: ${parsedUrl.protocol}`);
      }

      if (!this.isApiUrlAllowed(parsedUrl)) {
        throw new Error(
          this.apiAllowlist
            ? `API host "${parsedUrl.host}" is not in the configured apiAllowlist`
            : `"api" actions are disabled by default — pass apiAllowlist to renderUIDocument/ActionInterpreter to allow specific hosts (e.g. apiAllowlist: ["api.example.com"])`,
        );
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(parsedUrl, {
          method: config.method,
          headers: {
            "Content-Type": "application/json",
          },
          body: config.body ? JSON.stringify(config.body) : undefined,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const contentType = response.headers?.get?.("content-type");
      if (contentType && !contentType.includes("json")) {
        throw new Error(`API response Content-Type "${contentType}" is not JSON`);
      }

      const declaredLength = response.headers?.get?.("content-length");
      if (declaredLength && Number(declaredLength) > this.apiMaxResponseBytes) {
        throw new Error(
          `API response too large (${declaredLength} bytes, limit ${this.apiMaxResponseBytes})`,
        );
      }

      const text = await response.text();
      const actualBytes = new TextEncoder().encode(text).length;
      if (actualBytes > this.apiMaxResponseBytes) {
        throw new Error(
          `API response too large (${actualBytes} bytes, limit ${this.apiMaxResponseBytes})`,
        );
      }

      const data = JSON.parse(text);

      if (config.dataSource && this.stateStore) {
        this.stateStore.setState(config.dataSource, data);
      }

      this.eventBus.emit("api-response", { success: true, data });
    } catch (error) {
      this.eventBus.emit("api-response", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      this.eventBus.emit("snackbar", {
        message: error instanceof Error ? error.message : "API request failed",
        duration: 5000,
      });
    } finally {
      this.inFlightApiCalls--;
    }
  }

  private isApiUrlAllowed(url: URL): boolean {
    if (!this.apiAllowlist) return false;
    if (typeof this.apiAllowlist === "function") return this.apiAllowlist(url);
    return isHostAllowed(url.host, this.apiAllowlist);
  }

  private buildScope(): RenderScope {
    const stateSnapshot = this.stateStore?.getValue() as Record<string, unknown> | undefined;
    return {
      state: stateSnapshot,
      session: this.session,
      route: this.route,
      data: this.data,
    };
  }
}
