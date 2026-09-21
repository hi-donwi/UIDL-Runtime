/**
 * Public settings recipe — free of demo, company, and host-specific code.
 *
 * Settings must not fall back to generic list.
 */

import type { UIDLDocument, UIDLNode } from "../types";
import type { Language } from "../utils/i18n";
import { nameControl } from "./form.js";
import {
  MERIDIAN_FORM_CONTROL_STYLE,
  MERIDIAN_FORM_LABEL_STYLE,
  MERIDIAN_FORM_ROW_GRID,
  MERIDIAN_FORM_ROW_STYLE,
  MERIDIAN_SECTION_HEADER_STYLE,
} from "../utils/formLayout";
import { semanticNodeId, validateHostCapabilities, type HostCapabilities, type RoutePolicy, type SettingsPageMeta, type UiPolicy } from "./types.js";

export interface CompileSettingsOptions {
  hostCapabilities: HostCapabilities;
  uiPolicy?: UiPolicy;
  routePolicy?: RoutePolicy;
  docId?: string;
  extraHeaderActions?: UIDLNode[];
}

const BORDER_COLOR = "{primitives.color.border}";
const TEXT_SECONDARY = "{primitives.color.text-secondary}";

function pageHeader(title: string, actions: UIDLNode[]): UIDLNode {
  return {
    id: "settings-header",
    type: "Navbar",
    style: { justifyContent: "space-between", alignItems: "center", padding: "px-4", height: "h-row-large", borderWidth: "border-b", borderColor: BORDER_COLOR },
    children: [
      { id: "settings-header-title", type: "Text", props: { value: title, heading: 1 }, style: { fontSize: "text-xl", fontWeight: 600 } },
      { id: "settings-header-actions", type: "Toolbar", style: { display: "flex", gap: "gap-2" }, children: actions },
    ],
  };
}

function sectionHeader(id: string, title: string): UIDLNode {
  return { id, type: "Text", props: { value: title, heading: 3 }, style: { ...MERIDIAN_SECTION_HEADER_STYLE } };
}

export function compileSettingsPage(meta: SettingsPageMeta, options: CompileSettingsOptions): UIDLDocument {
  const gate = validateHostCapabilities({ recipe: "settings", meta: meta as unknown as never, hostCapabilities: options.hostCapabilities } as never);
  // settings has no collection gate beyond general; reuse generic check via dummy
  if (gate.length > 0) throw new Error(`compileSettingsPage: hostCapabilities rejected: ${gate.map((i) => i.message).join("; ")}`);

  const lang: Language = options.uiPolicy?.lang ?? "id";
  const docId = options.docId ?? `settings-${meta.name.toLowerCase()}`;
  const title = meta.label[lang] ?? meta.name;

  const state: Record<string, unknown> = { formErrors: {}, formError: "", formStatus: "idle" };
  for (const section of meta.sections) for (const field of section.fields) state[field.key] = field.default ?? (field.widget === "Checkbox" || field.widget === "Switch" ? false : "");

  const saveAction: UIDLNode = {
    id: "settings-save-btn",
    type: "Button",
    props: { label: lang === "id" ? "Simpan Pengaturan" : "Save Settings", variant: "primary" },
    events: {
      onClick: [
        {
          command: {
            name: "workspace.settings.save",
            payload: { settings: meta.name, values: { $expr: { path: "state" } } },
            statusPath: "formStatus",
            errorPath: "formError",
          },
        },
      ],
    },
  };

  const headerActions: UIDLNode[] = [...(options.extraHeaderActions ?? []), saveAction];

  const sectionNodes: UIDLNode[] = [];
  for (const section of meta.sections) {
    sectionNodes.push(sectionHeader(`section-${section.id}`, section.label[lang] ?? section.id));
    for (const field of section.fields) {
      const control = buildFieldControl(field, meta.name, lang);
      const label = `${field.label[lang] ?? field.key}${field.required ? " *" : ""}`;
      sectionNodes.push({
        id: `row-${field.key}`,
        type: "Row",
        props: { style: { ...MERIDIAN_FORM_ROW_GRID } },
        style: { ...MERIDIAN_FORM_ROW_STYLE },
        children: [
          { id: `row-${field.key}-label`, type: "Text", props: { value: label }, style: { ...MERIDIAN_FORM_LABEL_STYLE } },
          { id: `row-${field.key}-control`, type: "Column", style: { ...MERIDIAN_FORM_CONTROL_STYLE }, children: [nameControl(control, label)] },
        ],
      });
    }
  }

  if (sectionNodes.length === 0) {
    sectionNodes.push({ id: "settings-empty", type: "Text", props: { value: lang === "id" ? "Tidak ada pengaturan" : "No settings" }, style: { padding: "p-4", color: TEXT_SECONDARY } });
  }

  // Wrap in Form for semantics and validation
  const formNode: UIDLNode = {
    id: "settings-form",
    type: "Form",
    style: { display: "flex", flexDirection: "column" },
    children: sectionNodes,
  };

  const errorNode: UIDLNode = {
    id: "settings-error",
    type: "Text",
    props: { value: { $bind: "state.formError" } },
    style: { padding: "px-4", color: "{primitives.color.error}" },
    visibility: { condition: { "!=": [{ path: "state.formError" }, { literal: "" }] } },
  };

  return {
    version: "1.0.0",
    id: docId,
    name: title,
    state,
    root: {
      id: "page",
      type: "Column",
      style: { fontSize: "text-base", width: "w-full" },
      children: [pageHeader(title, headerActions), formNode, errorNode],
    },
  };
}

function buildFieldControl(field: SettingsPageMeta["sections"][number]["fields"][number], metaName: string, _lang: Language): UIDLNode {
  const id = semanticNodeId("settings", metaName, field.key);
  const baseProps: Record<string, unknown> = { error: { $bind: `state.formErrors.${field.key}` } };
  if (field.widget === "Checkbox" || field.widget === "Switch") {
    return { id, type: field.widget, props: { ...baseProps, checked: { $bind: `state.${field.key}` } }, events: { onChange: [{ setState: { path: field.key, value: null } }] } };
  }
  if (field.widget === "Select" || field.widget === "RadioGroup") {
    return { id, type: field.widget, props: { ...baseProps, value: { $bind: `state.${field.key}` }, options: (field.options as Array<{ value: string; label: string }> | undefined) ?? [] }, events: { onChange: [{ setState: { path: field.key, value: null } }] } };
  }
  if (field.widget === "Textarea") {
    return { id, type: "Textarea", props: { ...baseProps, value: { $bind: `state.${field.key}` } }, events: { onChange: [{ setState: { path: field.key, value: null } }] } };
  }
  return { id, type: "TextField", props: { ...baseProps, value: { $bind: `state.${field.key}` } }, events: { onChange: [{ setState: { path: field.key, value: null } }] } };
}
