export interface SetStateAction {
  setState: {
    path: string;
    value: unknown;
  };
}

export interface NavigateAction {
  navigate: {
    route: string | Record<string, unknown>;
  };
}

export interface ApiAction {
  api: {
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    body?: Record<string, unknown>;
    dataSource?: string;
  };
}

export type MutationOperation = "create" | "update" | "delete" | "transition";

export type ResolvableActionValue<T = unknown> =
  | T
  | { $bind: string }
  | { $expr: unknown };

export interface MutationActionConfig {
  operation: MutationOperation;
  /** Collection/doctype key understood by the host adapter or domain service. */
  collection: ResolvableActionValue<string>;
  id?: ResolvableActionValue<string | number>;
  payload?: ResolvableActionValue<Record<string, unknown>>;
  transition?: ResolvableActionValue<string>;
  version?: ResolvableActionValue<number>;
  resultPath?: string;
  errorPath?: string;
  fieldErrorsPath?: string;
  statusPath?: string;
  /** Runs only after the host mutationHandler resolves successfully. */
  onSuccess?: Action;
  /** Runs only after the host mutationHandler rejects or request validation fails. */
  onError?: Action;
}

export interface MutationAction {
  mutate: MutationActionConfig;
}

export interface CommandActionConfig {
  /** Host-owned command name, e.g. "workspace.schema.save". */
  name: ResolvableActionValue<string>;
  payload?: ResolvableActionValue<Record<string, unknown>>;
  resultPath?: string;
  errorPath?: string;
  statusPath?: string;
  onSuccess?: Action;
  onError?: Action;
}

export interface CommandAction {
  command: CommandActionConfig;
}

export interface MutationRequest {
  operation: MutationOperation;
  collection: string;
  id?: string | number;
  payload?: Record<string, unknown>;
  transition?: string;
  version?: number;
}

export interface MutationResponse {
  success: boolean;
  request?: MutationRequest;
  data?: unknown;
  error?: string;
  code?: string;
  fields?: Record<string, string>;
}

export type MutationHandler = (request: MutationRequest) => Promise<unknown> | unknown;

export interface CommandRequest {
  name: string;
  payload?: Record<string, unknown>;
}

export interface CommandResponse {
  success: boolean;
  request?: CommandRequest;
  data?: unknown;
  error?: string;
  code?: string;
  fields?: Record<string, string>;
}

export type CommandHandler = (request: CommandRequest) => Promise<unknown> | unknown;

export interface DownloadActionConfig {
  /** The address of the file to download — a literal URL or a resolvable value. */
  url: ResolvableActionValue<string>;
  /** Optional suggested save name; the host handler owns any path/sanitisation rules. */
  filename?: ResolvableActionValue<string>;
  resultPath?: string;
  errorPath?: string;
  statusPath?: string;
  /** Runs only after the host downloadHandler resolves successfully. */
  onSuccess?: Action;
  /** Runs only after the host downloadHandler rejects or request validation fails. */
  onError?: Action;
}

export interface DownloadAction {
  download: DownloadActionConfig;
}

export interface DownloadRequest {
  url: string;
  filename?: string;
}

export interface DownloadResponse {
  success: boolean;
  request?: DownloadRequest;
  data?: unknown;
  error?: string;
  code?: string;
}

/** Host-owned download capability; unset means `download` actions are disabled. */
export type DownloadHandler = (request: DownloadRequest) => Promise<unknown> | unknown;

export interface QueryActionConfig {
  /**
   * The name of a declared `$query` data source (`dataSources`, `queries.md`). The source must
   * exist and be a `$query` (not an inline array) entry; re-running writes into
   * `state.$data.<target>.{status,rows,total,error}` through the shared data-source runner.
   */
  target: string;
  /** Runs after the target source resolves successfully; `eventValue` is the new rows. */
  onSuccess?: Action;
  /** Runs after the target source fails, or the re-run is refused (no adapter/missing target). */
  onError?: Action;
}

export interface QueryAction {
  query: QueryActionConfig;
}

export interface QueryResponse {
  success: boolean;
  target: string;
  error?: string;
  code?: string;
}

export interface ShowSnackbarAction {
  showSnackbar: {
    message: string;
    duration?: number;
  };
}

export interface ShowDialogAction {
  showDialog: {
    title: string;
    content: string;
  };
}

export interface ValidateAction {
  validate: {
    fields: string[];
  };
}

export interface SequenceAction {
  sequence: Action[];
}

export interface IfAction {
  if: {
    condition: Record<string, unknown>;
    then: Action;
    else?: Action;
  };
}

export type Action =
  | SetStateAction
  | NavigateAction
  | ApiAction
  | MutationAction
  | CommandAction
  | DownloadAction
  | QueryAction
  | ShowSnackbarAction
  | ShowDialogAction
  | ValidateAction
  | SequenceAction
  | IfAction;
