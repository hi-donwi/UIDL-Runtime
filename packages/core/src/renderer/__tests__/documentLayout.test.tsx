import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { UIDocumentRenderer } from "../UIDocumentRenderer";
import { renderUIDocument } from "../renderDocument";
import { resolveContainerStyles, Container } from "../../components/primitives";
import type { UIDLDocument } from "../../types";

describe("Document Layout and Container Constraints", () => {
  it("resolves container styles correctly for constrained, narrow, full, and responsive padding", () => {
    const constrained = resolveContainerStyles({ container: "constrained", padding: "responsive", centered: true });
    expect(constrained.style?.maxWidth).toBe("80rem");
    expect(constrained.style?.padding).toBe("clamp(1.25rem, 3vw, 2.5rem)");
    expect(constrained.className).toContain("max-w-7xl");
    expect(constrained.className).toContain("mx-auto");

    const narrow = resolveContainerStyles({ container: "narrow", padding: "compact" });
    expect(narrow.style?.maxWidth).toBe("48rem");
    expect(narrow.className).toContain("max-w-3xl");
    expect(narrow.className).toContain("p-3");

    const custom = resolveContainerStyles({ maxWidth: "90rem", padding: "p-8", centered: false });
    expect(custom.style?.maxWidth).toBe("90rem");
    expect(custom.className).toContain("p-8");
    expect(custom.className).not.toContain("mx-auto");
  });

  it("Container primitive applies layout styles when props are provided", () => {
    const { container } = render(
      <Container container="constrained" padding="responsive" data-testid="test-container">
        <span>Content</span>
      </Container>
    );

    const div = container.querySelector("div");
    expect(div).toBeInTheDocument();
    expect(div?.style.maxWidth).toBe("80rem");
    expect(div?.style.padding).toBe("clamp(1.25rem, 3vw, 2.5rem)");
    expect(div?.className).toContain("max-w-7xl");
    expect(div?.className).toContain("mx-auto");
  });

  it("renderUIDocument wraps output with layout shell when document.layout is defined", () => {
    const doc: UIDLDocument = {
      version: "1.0.0",
      id: "test-doc",
      name: "Test Doc",
      layout: {
        container: "constrained",
        maxWidth: "80rem",
        padding: "responsive",
        centered: true,
      },
      root: {
        id: "root-1",
        type: "Text",
        props: { value: "Hello Layout" },
      },
    };

    const { container } = render(<>{renderUIDocument(doc)}</>);
    const shell = container.querySelector('[data-uidl-layout-shell="true"]');
    expect(shell).toBeInTheDocument();
    expect(shell?.getAttribute("style")).toContain("max-width: 80rem");
    expect(shell?.getAttribute("style")).toContain("clamp(1.25rem, 3vw, 2.5rem)");
  });

  it("UIDocumentRenderer applies layout shell when document.layout is present", () => {
    const doc: UIDLDocument = {
      version: "1.0.0",
      id: "renderer-doc",
      name: "Renderer Doc",
      layout: {
        container: "narrow",
        padding: "standard",
      },
      root: {
        id: "root-2",
        type: "Button",
        props: { label: "Click Me" },
      },
    };

    const { container } = render(<UIDocumentRenderer document={doc} />);
    const shell = container.querySelector('[data-uidl-layout-shell="true"]');
    expect(shell).toBeInTheDocument();
    expect(shell?.className).toContain("max-w-3xl");
    expect(shell?.className).toContain("p-6");
  });
});
