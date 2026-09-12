import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderNode } from "../RenderNode";
import type { UIDLNode } from "../../types";

describe("repeat", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders one element per data item without React key warnings", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const node: UIDLNode = {
      id: "list-item",
      type: "Text",
      props: { value: { $bind: "local.row" } },
      repeat: {
        dataSource: ["first", "second", "third"],
        itemName: "row",
      },
    };

    render(<>{renderNode(node)}</>);

    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getByText("second")).toBeInTheDocument();
    expect(screen.getByText("third")).toBeInTheDocument();

    const keyWarning = consoleError.mock.calls.some((call) =>
      call.some((arg) => typeof arg === "string" && arg.includes("unique") && arg.includes("key")),
    );
    expect(keyWarning).toBe(false);
  });

  it("gives each repeated instance a distinct data-node-id", () => {
    const node: UIDLNode = {
      id: "list-item",
      type: "Text",
      props: { value: { $bind: "local.row" } },
      repeat: {
        dataSource: ["a", "b"],
        itemName: "row",
      },
    };

    const { container } = render(<>{renderNode(node)}</>);
    const ids = Array.from(container.querySelectorAll("[data-node-id]")).map((el) =>
      el.getAttribute("data-node-id"),
    );

    expect(ids).toEqual(["list-item-repeat-0", "list-item-repeat-1"]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
