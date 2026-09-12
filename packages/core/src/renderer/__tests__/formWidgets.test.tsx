import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UIDocumentRenderer } from "../UIDocumentRenderer";
import { defaultRegistry } from "../../registry/registry";
import { createDocumentState } from "../../state/createDocumentState";
import type { UIDLDocument } from "../../types";

describe("form widget registry", () => {
  it("registers Select, Textarea, RadioGroup, and Form in the form category", () => {
    for (const type of ["Select", "Textarea", "RadioGroup", "Form"]) {
      const entry = defaultRegistry.get(type);
      expect(entry, `${type} should be registered`).toBeDefined();
      expect(entry?.category).toBe("form");
    }
    expect(defaultRegistry.get("Form")?.acceptsChildren).toBe(true);
    expect(defaultRegistry.get("Select")?.acceptsChildren).toBe(false);
  });
});

describe("Select", () => {
  it("extracts the selected option's value on change and writes it into bound state", () => {
    const doc: UIDLDocument = {
      version: "1.0.0",
      id: "select-doc",
      name: "Select doc",
      state: { plan: "" },
      root: {
        id: "root",
        type: "Column",
        children: [
          {
            id: "plan",
            type: "Select",
            props: {
              label: "Plan",
              placeholder: "Choose a plan",
              options: [
                { value: "free", label: "Free" },
                { value: "pro", label: "Pro" },
              ],
              value: { $bind: "state.plan" },
            },
            events: { onChange: [{ setState: { path: "plan", value: null } }] },
          },
        ],
      },
    };
    const stateStore = createDocumentState({ plan: "" }).getState();

    render(<UIDocumentRenderer document={doc} stateStore={stateStore} />);
    fireEvent.change(screen.getByLabelText("Plan"), { target: { value: "pro" } });
    expect(screen.getByLabelText("Plan")).toHaveValue("pro");
    expect(stateStore.getValue("plan")).toBe("pro");
  });

  it("shows an error message when the error prop is set", () => {
    const doc: UIDLDocument = {
      version: "1.0.0",
      id: "select-error-doc",
      name: "Select error doc",
      root: {
        id: "plan",
        type: "Select",
        props: { label: "Plan", options: [{ value: "free", label: "Free" }], error: "Plan is required" },
      },
    };

    render(<UIDocumentRenderer document={doc} />);
    expect(screen.getByText("Plan is required")).toBeInTheDocument();
  });
});

describe("Textarea", () => {
  it("extracts the typed value via onChange and writes it into bound state", () => {
    const doc: UIDLDocument = {
      version: "1.0.0",
      id: "textarea-doc",
      name: "Textarea doc",
      state: { bio: "" },
      root: {
        id: "bio",
        type: "Textarea",
        props: { label: "Bio", value: { $bind: "state.bio" } },
        events: { onChange: [{ setState: { path: "bio", value: null } }] },
      },
    };
    const stateStore = createDocumentState({ bio: "" }).getState();

    render(<UIDocumentRenderer document={doc} stateStore={stateStore} />);
    const textarea = screen.getByLabelText("Bio") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "hello there" } });
    expect(textarea.value).toBe("hello there");
    expect(stateStore.getValue("bio")).toBe("hello there");
  });
});

describe("RadioGroup", () => {
  it("renders one radio input per option, reflects the selected value, and updates state on change", () => {
    const doc: UIDLDocument = {
      version: "1.0.0",
      id: "radio-doc",
      name: "Radio doc",
      state: { contactMethod: "email" },
      root: {
        id: "contactMethod",
        type: "RadioGroup",
        props: {
          label: "Contact method",
          value: { $bind: "state.contactMethod" },
          options: [
            { value: "email", label: "Email" },
            { value: "phone", label: "Phone" },
          ],
        },
        events: { onChange: [{ setState: { path: "contactMethod", value: null } }] },
      },
    };
    const stateStore = createDocumentState({ contactMethod: "email" }).getState();

    render(<UIDocumentRenderer document={doc} stateStore={stateStore} />);
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect((screen.getByLabelText("Email") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Phone") as HTMLInputElement).checked).toBe(false);

    fireEvent.click(screen.getByLabelText("Phone"));
    expect(stateStore.getValue("contactMethod")).toBe("phone");
    expect((screen.getByLabelText("Phone") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Email") as HTMLInputElement).checked).toBe(false);
  });
});

describe("Form", () => {
  it("prevents native submission and fires the onSubmit action", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const doc: UIDLDocument = {
      version: "1.0.0",
      id: "form-doc",
      name: "Form doc",
      state: { status: "pending" },
      root: {
        id: "signupForm",
        type: "Form",
        events: { onSubmit: [{ setState: { path: "status", value: "submitted" } }] },
        children: [
          { id: "submitBtn", type: "Button", props: { label: "Submit" } },
          { id: "status", type: "Text", testId: "status", props: { value: { $bind: "state.status" } } },
        ],
      },
    };
    const stateStore = createDocumentState({ status: "pending" }).getState();

    render(<UIDocumentRenderer document={doc} stateStore={stateStore} />);
    const form = screen.getByText("Submit").closest("form");
    expect(form).not.toBeNull();

    fireEvent.submit(form!);

    // jsdom logs "Not implemented: HTMLFormElement.prototype.requestSubmit" when a form
    // submission isn't prevented — asserting no console.error proves preventDefault() ran.
    expect(consoleError).not.toHaveBeenCalled();
    expect(screen.getByTestId("status")).toHaveTextContent("submitted");
    consoleError.mockRestore();
  });
});
