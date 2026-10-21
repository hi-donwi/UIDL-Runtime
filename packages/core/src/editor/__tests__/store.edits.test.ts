import { describe, it, expect, vi } from "vitest";
import { createEditorStore, type EditorEdit } from "../index";
import type { UIDLDocument } from "../../types";

/**
 * The edit intents, at the level a host consumes them.
 *
 * A host turns an intent into a source edit, so the intent has to name the node, the
 * parent, and the position. An intent that only said "the document changed" would
 * force the host to diff two documents to find out what happened, and a diff cannot
 * tell a move from a delete and an insert.
 */

const document: UIDLDocument = {
  version: "1.0.0",
  id: "test-doc",
  name: "Test",
  root: {
    id: "root",
    type: "Container",
    props: {},
    style: {},
    children: [
      { id: "child-1", type: "Text", props: { value: "Hello" }, style: {}, children: [] },
      { id: "child-2", type: "Column", props: {}, style: {}, children: [] },
    ],
  },
};

describe("editor edit intents", () => {
  it("reports an update with the fields that changed", () => {
    const onEdit = vi.fn();
    const store = createEditorStore(document, { onEdit });
    store.getState().updateNode("child-1", { testId: "hello" });

    expect(onEdit).toHaveBeenCalledTimes(1);
    const [edit, result] = onEdit.mock.calls[0] as [EditorEdit, UIDLDocument];
    expect(edit).toEqual({ type: "update-node", nodeId: "child-1", changes: { testId: "hello" } });
    expect(result.root.children?.[0]?.testId).toBe("hello");
  });

  it("reports nothing when an edit changes nothing", () => {
    const onEdit = vi.fn();
    const store = createEditorStore(document, { onEdit });
    store.getState().updateNode("child-1", { testId: undefined });
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("reports an insertion with its parent and position", () => {
    const onEdit = vi.fn();
    const store = createEditorStore(document, { onEdit });
    store.getState().addChild("root", "Button");

    const [edit] = onEdit.mock.calls[0] as [EditorEdit];
    expect(edit.type).toBe("add-child");
    if (edit.type !== "add-child") throw new Error("unreachable");
    expect(edit.parentId).toBe("root");
    expect(edit.childType).toBe("Button");
    expect(edit.index).toBe(2);
    expect(edit.node.type).toBe("Button");
  });

  it("reports a deletion with its parent and position", () => {
    const onEdit = vi.fn();
    const store = createEditorStore(document, { onEdit });
    store.getState().deleteNode("child-1");

    const [edit] = onEdit.mock.calls[0] as [EditorEdit];
    expect(edit).toEqual({ type: "delete-node", nodeId: "child-1", parentId: "root", index: 0 });
  });

  it("reports a move with both parents and the target position", () => {
    const onEdit = vi.fn();
    const store = createEditorStore(document, { onEdit });
    store.getState().moveNode("child-1", "child-2", 0);

    const [edit] = onEdit.mock.calls[0] as [EditorEdit];
    expect(edit).toEqual({
      type: "move-node",
      nodeId: "child-1",
      fromParentId: "root",
      toParentId: "child-2",
      index: 0,
    });
  });

  it("refuses every edit in read-only mode", () => {
    const onEdit = vi.fn();
    const store = createEditorStore(document, { onEdit });
    store.getState().setReadOnly(true);

    store.getState().updateNode("child-1", { testId: "hello" });
    store.getState().addChild("root", "Button");
    store.getState().deleteNode("child-1");
    store.getState().moveNode("child-1", "child-2");

    expect(onEdit).not.toHaveBeenCalled();
    expect(store.getState().document).toBe(document);
  });

  it("reports the selected node", () => {
    const onSelectionChange = vi.fn();
    const store = createEditorStore(document, { onSelectionChange });
    store.getState().selectNode("child-2");
    expect(onSelectionChange).toHaveBeenCalledWith("child-2");
    // Selecting the same node again is not a change.
    store.getState().selectNode("child-2");
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
  });

  it("leaves the history to the host when the host owns it", () => {
    const store = createEditorStore(document, { historyOwner: "host" });
    store.getState().updateNode("child-1", { testId: "hello" });

    expect(store.getState().canUndo).toBe(false);
    expect(store.getState().canRedo).toBe(false);
    // The editor's own undo must not roll the document back behind the host's back.
    store.getState().undo();
    expect(store.getState().document.root.children?.[0]?.testId).toBe("hello");
  });

  it("keeps its own history when it owns it", () => {
    const store = createEditorStore(document, { historyOwner: "editor" });
    store.getState().updateNode("child-1", { testId: "hello" });

    expect(store.getState().canUndo).toBe(true);
    store.getState().undo();
    expect(store.getState().document.root.children?.[0]?.testId).toBeUndefined();
  });

  it("adopts a host document and keeps the selection when the node survives", () => {
    const store = createEditorStore(document, { historyOwner: "host" });
    store.getState().selectNode("child-1");
    const replaced: UIDLDocument = { ...document, id: "replaced" };

    store.getState().replaceDocument(replaced);

    expect(store.getState().document.id).toBe("replaced");
    expect(store.getState().selectedNodeId).toBe("child-1");
    expect(store.getState().isDirty).toBe(false);
  });

  it("drops a selection whose node is gone after a host document arrives", () => {
    const store = createEditorStore(document, { historyOwner: "host" });
    store.getState().selectNode("child-1");
    const replaced: UIDLDocument = {
      ...document,
      root: { ...document.root, children: [{ id: "other", type: "Text", props: {}, style: {}, children: [] }] },
    };

    store.getState().replaceDocument(replaced);

    expect(store.getState().selectedNodeId).toBeNull();
  });
});
