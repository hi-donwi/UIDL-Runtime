import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { renderUIDocument } from "../renderDocument";
import { defaultLightTheme } from "../../theme/presets";
import type { UIDLDocument } from "../../types";

describe("theme variants (ComponentVariant.style/.props)", () => {
  it("applies a variant's style and props onto the node it's requested on", () => {
    const doc: UIDLDocument = {
      version: "1.0.0",
      id: "doc",
      name: "Doc",
      root: {
        id: "root",
        type: "Button",
        themeRef: "primary",
        props: { label: "Save" },
      },
    };

    const { getByText } = render(<>{renderUIDocument(doc, { theme: defaultLightTheme })}</>);
    const button = getByText("Save");

    // variant.props (variant: "primary") merged in and consumed by the Button widget, which
    // maps it onto Meridian's primary button classes (Button: `bg-black text-white`).
    expect(button.className).toContain("bg-black");
    expect(button.className).toContain("text-white");
    // variant.style's literal Tailwind classes (padding) applied via className.
    expect(button.className).toContain("px-4");
    // variant.style's token-referenced values (background/color) resolved to CSS vars, not classes.
    expect(button.className).not.toContain("{primitives");
    expect(button).toHaveStyle({ backgroundColor: "var(--color-primary)" });
    expect(button).toHaveStyle({ color: "var(--color-text-inverse)" });
    expect(button).toHaveStyle({ fontWeight: "500" });
  });

  it("lets the node's own props/style win over the variant's defaults", () => {
    const doc: UIDLDocument = {
      version: "1.0.0",
      id: "doc",
      name: "Doc",
      root: {
        id: "root",
        type: "Button",
        themeRef: "primary",
        props: { label: "Save" },
        style: { background: "{primitives.color.error}" },
      },
    };

    const { getByText } = render(<>{renderUIDocument(doc, { theme: defaultLightTheme })}</>);
    const button = getByText("Save");

    expect(button).toHaveStyle({ backgroundColor: "var(--color-error)" });
  });
});

describe("renderUIDocument root CSS variables", () => {
  it("injects the theme's primitive tokens as CSS custom properties on the root element", () => {
    const doc: UIDLDocument = {
      version: "1.0.0",
      id: "doc",
      name: "Doc",
      root: {
        id: "root",
        type: "Container",
        testId: "doc-root",
      },
    };

    const { getByTestId } = render(<>{renderUIDocument(doc, { theme: defaultLightTheme })}</>);
    const root = getByTestId("doc-root");

    expect(root).toHaveStyle({ "--color-primary": "#4B39EF" });
    expect(root).toHaveStyle({ "--spacing-4": "1rem" });
  });
});
