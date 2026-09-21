import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { renderNode } from "../RenderNode";
import { renderUIDocument } from "../renderDocument";
import type { UIDLDocument, UIDLNode } from "../../types";

const cardDefinition: UIDLNode = {
  id: "card-template-root",
  type: "Container",
  props: {},
  style: { padding: "p-6", borderRadius: "rounded-lg" },
  children: [
    { id: "card-template-title", type: "Text", testId: "template-title", props: { value: "Untitled card" } },
  ],
};

describe("componentId + definitions (renderNode)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the definition's structure for a node with componentId", () => {
    const node: UIDLNode = { id: "card-1", type: "Container", componentId: "card", testId: "card-1" };

    const { getByTestId } = render(
      <>{renderNode(node, { definitions: { card: cardDefinition } })}</>,
    );

    expect(getByTestId("card-1")).toBeInTheDocument();
    expect(getByTestId("template-title")).toHaveTextContent("Untitled card");
  });

  it("two instances of the same componentId don't collide on data-node-id", () => {
    const nodeA: UIDLNode = {
      id: "root",
      type: "Row",
      children: [
        { id: "card-a", type: "Container", componentId: "card" },
        { id: "card-b", type: "Container", componentId: "card" },
      ],
    };

    const { container } = render(
      <>{renderNode(nodeA, { definitions: { card: cardDefinition } })}</>,
    );

    const ids = Array.from(container.querySelectorAll("[data-node-id]")).map((el) =>
      el.getAttribute("data-node-id"),
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("card-a");
    expect(ids).toContain("card-b");
    expect(ids).toContain("card-a__card-template-title");
    expect(ids).toContain("card-b__card-template-title");
  });

  it("instance children replace the template's default content", () => {
    const node: UIDLNode = {
      id: "card-1",
      type: "Container",
      componentId: "card",
      children: [{ id: "my-title", type: "Text", testId: "my-title", props: { value: "My Actual Card" } }],
    };

    const { getByTestId, queryByTestId } = render(
      <>{renderNode(node, { definitions: { card: cardDefinition } })}</>,
    );

    expect(getByTestId("my-title")).toHaveTextContent("My Actual Card");
    expect(queryByTestId("template-title")).not.toBeInTheDocument();
  });

  it("warns and renders nothing for an unknown componentId", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const node: UIDLNode = { id: "card-1", type: "Container", componentId: "doesNotExist" };

    const { container } = render(<>{renderNode(node, { definitions: { card: cardDefinition } })}</>);

    expect(container).toBeEmptyDOMElement();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Unknown componentId"));
  });

  it("warns and renders nothing instead of infinitely recursing on a circular componentId reference", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const selfReferencing: UIDLNode = {
      id: "loop-root",
      type: "Container",
      children: [{ id: "loop-child", type: "Container", componentId: "loop" }],
    };
    const node: UIDLNode = { id: "loop-1", type: "Container", componentId: "loop" };

    const { container } = render(
      <>{renderNode(node, { definitions: { loop: selfReferencing } })}</>,
    );

    // The outer instance still renders (it's not itself circular); only the inner
    // self-referencing node bails out instead of blowing the call stack.
    expect(container.querySelector('[data-node-id="loop-1"]')).not.toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Circular componentId reference"));
  });
});

describe("componentId + definitions (renderUIDocument, end to end)", () => {
  it("resolves document.definitions for a document-level component instance", () => {
    const doc: UIDLDocument = {
      version: "1.0.0",
      id: "doc",
      name: "Doc",
      definitions: { card: cardDefinition },
      root: {
        id: "root",
        type: "Column",
        children: [
          {
            id: "card-1",
            type: "Container",
            componentId: "card",
            children: [{ id: "title-1", type: "Text", testId: "title-1", props: { value: "First" } }],
          },
          {
            id: "card-2",
            type: "Container",
            componentId: "card",
            children: [{ id: "title-2", type: "Text", testId: "title-2", props: { value: "Second" } }],
          },
        ],
      },
    };

    const { getByTestId } = render(<>{renderUIDocument(doc)}</>);

    expect(getByTestId("title-1")).toHaveTextContent("First");
    expect(getByTestId("title-2")).toHaveTextContent("Second");
  });
});
