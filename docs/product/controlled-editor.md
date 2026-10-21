# The Controlled Editor

Status: accepted with the Kerangka Studio authoring work on 2026-10-21. This is a host
contract for the editor, not a change to the UIDL document format. A document edited
through it is an ordinary UIDL document, and a host that does not use it is unaffected.

## Why

The editor was a standalone application: it opened a file, kept the document in its own
store, and offered undo and redo of its own. That is fine for an editor and wrong for a
host that authors documents.

A host that owns the document needs three things, and the original editor offered none
of them:

- **To decide what the document is.** A host that saves drafts, reloads them, and
  resolves conflicts has to replace the document in the editor without remounting it and
  without losing the author's place.
- **To learn what changed.** "The document changed" is not an answer. A host writes the
  change back into source, and that needs to know which node changed, where a node went,
  and what a new node is.
- **To own the history.** A host whose history spans more than one document cannot also
  have an editor history: two stacks mean two undos, and the second one undoes a change
  the host has already forgotten.

## The Contract

Everything below is reached through the package's public export. Nothing requires a deep
import, and nothing requires the host to know how the editor is built.

```tsx
import { Editor, createEditorStore, type EditorEdit } from "uidl-runtime";

<Editor
  document={document}
  documentRevision={revision}
  onEdit={(edit, document) => applyEditToSource(edit, document)}
  onSelectionChange={(nodeId) => setSelectedNodeId(nodeId)}
  onUndoRequest={() => host.undo()}
  onRedoRequest={() => host.redo()}
  readOnly={inspecting}
/>
```

| Prop | Meaning |
|---|---|
| `document` | The document the host owns. Passing it makes the editor controlled. |
| `documentRevision` | The host's identity for that document. A new revision is adopted even when the content is identical, because the host may have reasons the editor cannot see. |
| `onEdit` | Called after every edit, with the intent and the document it produced. |
| `onSelectionChange` | Called when the selected node changes. |
| `readOnly` | Refuses every edit, and disables the controls that would have made one. |
| `onUndoRequest`, `onRedoRequest` | The host's undo and redo, used when the host owns the history. |

`initialDocument` keeps its meaning: an uncontrolled editor that opens a document and
manages its own history. The two modes never mix.

## Edit Intents

```ts
type EditorEdit =
  | { type: "update-node"; nodeId: string; changes: Partial<UIDLNode> }
  | { type: "add-child"; parentId: string; childType: string; index: number; node: UIDLNode }
  | { type: "delete-node"; nodeId: string; parentId: string; index: number }
  | { type: "move-node"; nodeId: string; fromParentId: string; toParentId: string; index: number };
```

An intent names an existing node and a change to it. It never carries a new behavior,
and it never carries a whole document: the document arrives as the second argument, and
a host that only needs the intent can ignore it.

An edit that changes nothing produces no intent, because a no-op is not a change and
would otherwise push an empty entry into a host's history.

## The Store

A host that wants the intents without the editor surface uses the store directly:

```ts
const store = createEditorStore(document, { onEdit, historyOwner: "host" });
store.getState().updateNode("node-1", { testId: "summary" });
```

`historyOwner: "host"` disables the editor's own history. `undo` and `redo` do nothing,
and `canUndo` and `canRedo` stay false, so nothing in the editor offers an undo the
host cannot honor.

`replaceDocument` is the host's reset. It adopts the document, keeps the selection when
the selected node still exists, and clears the history, because the history belongs to
whoever owns it.

## Rules

- A controlled editor never invents a document. It renders the one the host gave it and
  reports what it would change.
- Read-only means read-only. The fields and the palette are disabled, so the editor
  does not offer an action it would refuse.
- The editor does not keep a second history for a host that has one.
- An intent is the editor's public description of its own action. A host does not have
  to diff two documents to find out what happened, and a diff could not tell a move from
  a delete and an insert.

## Compatibility

The props are additive. An editor that passes only `initialDocument` behaves exactly as
before, keeps its own history, and reports nothing to anybody.
