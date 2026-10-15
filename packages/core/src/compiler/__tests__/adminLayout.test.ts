import { describe, expect, it } from "vitest";
import { DocumentSchema } from "../../schemas/document";
import { createAdminForm, createAdminHeader, createAdminSection, createAdminActionBar } from "../index.js";
import type { UIDLNode } from "../../types";

const field: UIDLNode = { id: "field-name", type: "TextField", props: { label: "Name" } };
const save: UIDLNode = { id: "save", type: "Button", props: { label: "Save", type: "submit", variant: "primary" } };

describe("administration layout compositions", () => {
  it("preserves host events and supplied fields/actions without inventing business wiring", () => {
    const events = { onSubmit: [{ command: { name: "SaveSettings" } }] };
    const section = createAdminSection({ id: "identity", title: "Identity", description: "Basic details.", children: [field] });
    const form = createAdminForm({ id: "settings", children: [section], actions: [save], events });
    expect(form.events).toEqual(events);
    expect(form.children?.[0]).toEqual(section);
    expect(form.children?.[1]?.children).toEqual([save]);
    expect(DocumentSchema.safeParse({ version: "1.0", id: "settings-page", name: "Settings", root: form }).success).toBe(true);
  });

  it("has unique addressable headings and description, and keeps page actions grouped", () => {
    const header = createAdminHeader({ id: "page-header", title: "Settings", description: "Manage preferences.", actions: [save] });
    expect(header.children?.[0]?.children).toMatchObject([
      { id: "page-header-title", type: "Text", props: { value: "Settings", heading: 1 } },
      { id: "page-header-description", props: { value: "Manage preferences." } },
    ]);
    expect(header.children?.[1]?.children).toEqual([save]);
    expect(createAdminActionBar({ id: "actions", children: [save] }).props?.className).toBe("uidl-admin-actions");
  });

  it("omits an empty action bar and keeps generic widgets opt-in", () => {
    const form = createAdminForm({ id: "settings", children: [field] });
    expect(form.children).toEqual([field]);
    expect(form.props?.className).toBe("uidl-admin-form");
  });
});
