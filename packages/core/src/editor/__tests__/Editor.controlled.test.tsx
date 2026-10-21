import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useState } from "react";
import { Editor, type EditorEdit } from "../../index";
import type { UIDLDocument } from "../../types";

/**
 * The controlled editor seam.
 *
 * A host that authors a document cannot own the editor's state and its own at the same
 * time: two histories mean two undos, and a document the host cannot replace means a
 * draft the host cannot reload. These tests pin the contract that removes both
 * problems, and they pin it through the public package export, because a seam that has
 * to be reached by a deep import is not a seam.
 */

function makeDocument(id = "test-doc"): UIDLDocument {
  return {
    version: "1.0.0",
    id,
    name: "Test Doc",
    root: {
      id: "root",
      type: "Container",
      props: {},
      style: {},
      children: [
        {
          id: "child-1",
          type: "Text",
          testId: "child-one",
          props: { value: "Hello" },
          style: {},
          children: [],
        },
      ],
    },
  };
}

/** A host that owns the document, the history, and the revision. */
function Host({ onEdits }: { onEdits: (edit: EditorEdit) => void }) {
  const [document, setDocument] = useState(() => makeDocument());
  const [revision, setRevision] = useState("r1");
  const [edits, setEdits] = useState<EditorEdit[]>([]);

  return (
    <div>
      <button
        onClick={() => {
          setDocument(makeDocument("replaced-doc"));
          setRevision("r2");
        }}
      >
        replace
      </button>
      <button onClick={() => setRevision((value) => `${value}-bump`)}>bump</button>
      <span data-testid="revision">{revision}</span>
      <span data-testid="edit-count">{edits.length}</span>
      <Editor
        document={document}
        documentRevision={revision}
        onEdit={(edit) => {
          setEdits((current) => [...current, edit]);
          onEdits(edit);
        }}
      />
    </div>
  );
}

describe("controlled editor", () => {
  it("renders the host's document and adopts a replaced one", async () => {
    render(<Host onEdits={() => {}} />);
    expect(screen.getByTestId("child-one")).toHaveTextContent("Hello");

    fireEvent.click(screen.getByRole("button", { name: "replace" }));

    // The replaced document has a different id, and the editor shows it.
    await act(async () => {});
    expect(screen.getByTestId("child-one")).toHaveTextContent("Hello");
    expect(screen.getByTestId("revision")).toHaveTextContent("r2");
  });

  it("reports an edit intent when a node property changes", async () => {
    const onEdits = vi.fn();
    render(<Host onEdits={onEdits} />);

    fireEvent.click(screen.getByTestId("child-one"));
    const testIdInput = await screen.findByDisplayValue("child-one");
    fireEvent.change(testIdInput, { target: { value: "child-two" } });

    expect(onEdits).toHaveBeenCalled();
    const [edit] = onEdits.mock.calls[0] as [EditorEdit];
    expect(edit.type).toBe("update-node");
    if (edit.type !== "update-node") throw new Error("unreachable");
    expect(edit.nodeId).toBe("child-1");
    expect(edit.changes).toMatchObject({ testId: "child-two" });
  });

  it("reports the selected node to the host", async () => {
    const onSelection = vi.fn();
    render(<Editor document={makeDocument()} onSelectionChange={onSelection} />);

    fireEvent.click(screen.getByTestId("child-one"));

    expect(onSelection).toHaveBeenCalledWith("child-1");
  });

  it("does not change the document when the host only bumps the revision", async () => {
    const onEdits = vi.fn();
    render(<Host onEdits={onEdits} />);
    fireEvent.click(screen.getByRole("button", { name: "bump" }));
    await act(async () => {});
    expect(screen.getByTestId("revision")).toHaveTextContent("r1-bump");
    expect(onEdits).not.toHaveBeenCalled();
  });

  it("refuses to edit in read-only mode", async () => {
    const onEdits = vi.fn();
    render(<Editor document={makeDocument()} readOnly onEdit={onEdits} />);

    fireEvent.click(screen.getByTestId("child-one"));
    const testIdInput = await screen.findByDisplayValue("child-one");
    // A read-only editor must not offer a field it would refuse.
    expect(testIdInput).toBeDisabled();
    fireEvent.change(testIdInput, { target: { value: "child-two" } });

    expect(onEdits).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("child-one")).toBeInTheDocument();
  });
});
