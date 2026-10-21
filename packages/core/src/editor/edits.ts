import type { UIDLNode } from "../types";

/**
 * What the editor did, in terms a host can act on.
 *
 * A host that owns the document cannot use "the document changed" as a signal: it has
 * to write the change back into source, and that needs to know which node moved, where
 * it went, and what changed. These intents are the editor's public description of its
 * own actions, so a host never has to diff two documents to find out what happened.
 *
 * The intent names an existing node and a change to it. It never carries a new
 * behavior: a host that turns an intent into a source edit is still writing the
 * document's own vocabulary.
 */
export type EditorEdit =
  | { type: "update-node"; nodeId: string; changes: Partial<UIDLNode> }
  | { type: "add-child"; parentId: string; childType: string; index: number; node: UIDLNode }
  | { type: "delete-node"; nodeId: string; parentId: string; index: number }
  | { type: "move-node"; nodeId: string; fromParentId: string; toParentId: string; index: number };

/**
 * Who owns the undo history.
 *
 * `editor` is the original behaviour: the editor keeps its own stack. `host` is for a
 * host that already has one, such as an authoring tool whose history spans more than
 * one document. Two stacks mean two undos, and the second one undoes a change the host
 * has already forgotten.
 */
export type EditorHistoryOwner = "editor" | "host";
