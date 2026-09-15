import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { UIDLDocument } from "../../types";
import { UIDocumentRenderer } from "../UIDocumentRenderer";
import { renderUIDocument } from "../renderDocument";

function greetingDocument(): UIDLDocument {
  return {
    version: "1.0.0",
    id: "route-greeting",
    name: "Route greeting",
    root: {
      id: "root",
      type: "Column",
      children: [
        { id: "greeting", type: "Text", props: { value: { $bind: "route.greeting" } } },
        {
          id: "name",
          type: "Text",
          props: {
            value: {
              $expr: {
                op: "if",
                test: { $bind: "route.name" },
                then: { $bind: "route.name" },
                else: "anonymous",
              },
            },
          },
        },
      ],
    },
  };
}

describe("renderUIDocument · route scope", () => {
  it("resolves route.* bindings in the single-pass render path", () => {
    render(<StrictMode>{renderUIDocument(greetingDocument(), { route: { greeting: "Bonsoir", name: "Fern" } })}</StrictMode>);
    expect(screen.getByText("Bonsoir")).toBeInTheDocument();
    expect(screen.getByText("Fern")).toBeInTheDocument();
  });

  it("falls back when no route is provided", () => {
    render(<StrictMode>{renderUIDocument(greetingDocument())}</StrictMode>);
    expect(screen.getByText("anonymous")).toBeInTheDocument();
  });
});

describe("UIDocumentRenderer · route scope", () => {
  it("passes the host route into the render scope", () => {
    render(
      <StrictMode>
        <UIDocumentRenderer
          document={greetingDocument()}
          route={{ greeting: "Selamat sore", name: "Nia" }}
        />
      </StrictMode>,
    );
    expect(screen.getByText("Selamat sore")).toBeInTheDocument();
    expect(screen.getByText("Nia")).toBeInTheDocument();
  });
});