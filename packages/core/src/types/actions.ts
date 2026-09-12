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
  | ShowSnackbarAction
  | ShowDialogAction
  | ValidateAction
  | SequenceAction
  | IfAction;
