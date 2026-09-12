import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileSettingsPage } from "../settings.js";
import { compileTreePage } from "../tree.js";
import { compileWizardPage } from "../wizard.js";
import { DocumentSchema } from "../../schemas/document.js";
import type { HostCapabilities, SettingsPageMeta, TreePageMeta, WizardPageMeta } from "../types.js";

function caps(): HostCapabilities { return { collections: ["settings_demo", "accounts", "onboarding"], commands: ["workspace.settings.save"] }; }

function collectNodes(node: unknown, predicate: (n: { id?: string; type: string; props?: Record<string, unknown> }) => boolean, out: unknown[] = []) {
  const n = node as { id?: string; type: string; props?: Record<string, unknown>; children?: unknown[]; slots?: Record<string, unknown[]> };
  if (predicate(n)) out.push(n);
  if (n.children) n.children.forEach((c) => collectNodes(c, predicate, out));
  if (n.slots) Object.values(n.slots).forEach((arr) => arr.forEach((c) => collectNodes(c, predicate, out)));
  return out;
}

function walkTypes(node: unknown, out: Set<string>) {
  const n = node as { type?: string; children?: unknown[]; slots?: Record<string, unknown[]> };
  if (n.type) out.add(n.type);
  if (n.children) n.children.forEach((c) => walkTypes(c, out));
  if (n.slots) Object.values(n.slots).forEach((arr) => arr.forEach((c) => walkTypes(c, out)));
}

describe("Settings/tree/wizard recipes — not generic list fallback", () => {
  it("settings/tree/wizard files are host-and-company-free", () => {
    for (const file of ["settings.ts", "tree.ts", "wizard.ts"]) {
      const content = readFileSync(resolve(import.meta.dirname ?? ".", "..", file), "utf-8");
      const imports = content.split("\n").filter((l) => l.trim().startsWith("import ")).join("\n");
      for (const needle of ["@host-app", "templates", "ShoeCompany"]) expect(imports).not.toContain(needle);
    }
  });

  it("settings: renders Form per sections with unique field bindings, not a generic DataTable fallback", () => {
    const meta: SettingsPageMeta = {
      name: "settings_demo",
      label: { id: "Pengaturan", en: "Settings" },
      sections: [
        { id: "general", label: { id: "Umum", en: "General" }, fields: [{ key: "site_name", label: { id: "Nama Situs", en: "Site Name" }, widget: "TextField" }] },
        { id: "mail", label: { id: "Email", en: "Mail" }, fields: [{ key: "smtp_host", label: { id: "SMTP Host", en: "SMTP Host" }, widget: "TextField" }, { key: "enable_tls", label: { id: "TLS", en: "TLS" }, widget: "Checkbox" }] },
      ],
    };
    const doc = compileSettingsPage(meta, { hostCapabilities: caps() });
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
    const types = new Set<string>();
    walkTypes(doc.root, types);
    expect(types.has("Form")).toBe(true);
    expect(types.has("DataTable")).toBe(false); // must NOT be a generic list table
    expect(collectNodes(doc.root, (n) => n.id === "settings-form")).toHaveLength(1);
    expect(collectNodes(doc.root, (n) => n.id === "settings-save-btn")).toHaveLength(1);
    // fields have semantic IDs and error binding
    expect(collectNodes(doc.root, (n) => n.id === "settings-settings_demo-field-site_name")).toHaveLength(1);
    expect(collectNodes(doc.root, (n) => n.id === "settings-settings_demo-field-enable_tls")).toHaveLength(1);
    // sections rendered
    expect(collectNodes(doc.root, (n) => n.id === "section-general")).toHaveLength(1);
    expect(collectNodes(doc.root, (n) => n.id === "section-mail")).toHaveLength(1);
    // save uses command, not mutate list
    const save = collectNodes(doc.root, (n) => n.id === "settings-save-btn")[0] as { events: Record<string, unknown> };
    const cmd = (save.events.onClick as Array<{ command: { name: string } }>)[0];
    expect(cmd.command.name).toBe("workspace.settings.save");
  });

  it("tree: renders TreeView with hierarchical nodes, not a generic list DataTable fallback", () => {
    const meta: TreePageMeta = {
      name: "accounts",
      label: { id: "Akun", en: "Accounts" },
      titleField: "name",
      fields: [{ key: "name", label: { id: "Nama", en: "Name" }, widget: "TextField" }],
      nodes: [
        { key: "1000", label: { id: "Aset", en: "Assets" }, children: [{ key: "1100", label: { id: "Kas", en: "Cash" } }] },
        { key: "2000", label: { id: "Kewajiban", en: "Liabilities" } },
      ],
    };
    const doc = compileTreePage(meta, { hostCapabilities: caps() });
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
    const types = new Set<string>();
    walkTypes(doc.root, types);
    expect(types.has("TreeView")).toBe(true);
    expect(types.has("DataTable")).toBe(false); // must NOT be generic list
    expect(collectNodes(doc.root, (n) => n.id === "tree-view")).toHaveLength(1);
    expect(collectNodes(doc.root, (n) => n.id === "tree-search")).toHaveLength(1);
    expect(collectNodes(doc.root, (n) => n.id === "tree-layout")).toHaveLength(1);
    // dataSources contains hierarchical nodes
    expect((doc.dataSources as Record<string, unknown>).nodes).toBeDefined();
  });

  it("wizard: renders stepper badges per step with visibility-gated panels and nav", () => {
    const meta: WizardPageMeta = {
      name: "onboarding",
      label: { id: "Orientasi", en: "Onboarding" },
      steps: [
        { id: "company", label: { id: "Perusahaan", en: "Company" }, fields: [{ key: "company_name", label: { id: "Nama Perusahaan", en: "Company Name" }, widget: "TextField" }] },
        { id: "admin", label: { id: "Admin", en: "Admin" }, fields: [{ key: "admin_email", label: { id: "Email Admin", en: "Admin Email" }, widget: "TextField" }] },
        { id: "finish", label: { id: "Selesai", en: "Finish" }, fields: [{ key: "confirm", label: { id: "Konfirmasi", en: "Confirm" }, widget: "Checkbox" }] },
      ],
    };
    const doc = compileWizardPage(meta, { hostCapabilities: caps() });
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
    const types = new Set<string>();
    walkTypes(doc.root, types);
    expect(types.has("DataTable")).toBe(false);
    // stepper badges 3
    expect(collectNodes(doc.root, (n) => n.id?.startsWith("wizard-step-") ?? false)).toHaveLength(3);
    // panels with visibility per currentStep
    for (let idx = 0; idx < 3; idx++) {
      const panel = collectNodes(doc.root, (n) => n.id === `wizard-panel-${meta.steps[idx].id}`)[0] as { visibility: { condition: unknown } };
      expect(panel.visibility.condition).toEqual({ "==": [{ path: "state.currentStep" }, { literal: idx }] });
    }
    // nav prev/next/submit exist
    expect(collectNodes(doc.root, (n) => n.id === "wizard-prev-btn")).toHaveLength(1);
    expect(collectNodes(doc.root, (n) => n.id === "wizard-next-btn")).toHaveLength(1);
    expect(collectNodes(doc.root, (n) => n.id === "wizard-submit-btn")).toHaveLength(1);
    // field has wizard semantic ID
    expect(collectNodes(doc.root, (n) => n.id === "wizard-onboarding-field-company_name")).toHaveLength(1);
  });

  it("wizard submit mutates create with all step fields payload", () => {
    const meta: WizardPageMeta = {
      name: "onboarding",
      label: { id: "Orientasi", en: "Onboarding" },
      steps: [
        { id: "s1", label: { id: "S1", en: "S1" }, fields: [{ key: "f1", label: { id: "F1", en: "F1" }, widget: "TextField" }] },
        { id: "s2", label: { id: "S2", en: "S2" }, fields: [{ key: "f2", label: { id: "F2", en: "F2" }, widget: "TextField" }] },
      ],
    };
    const doc = compileWizardPage(meta, { hostCapabilities: caps() });
    const submit = collectNodes(doc.root, (n) => n.id === "wizard-submit-btn")[0] as { events: Record<string, unknown> };
    const mutate = (submit.events.onClick as Array<{ mutate: { collection: string; payload: Record<string, unknown> } }>)[0].mutate;
    expect(mutate.collection).toBe("onboarding");
    expect(mutate.payload).toHaveProperty("f1");
    expect(mutate.payload).toHaveProperty("f2");
  });
});
