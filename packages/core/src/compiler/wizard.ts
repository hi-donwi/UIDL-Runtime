/**
 * Public wizard recipe — free of demo, company, and host-specific code.
 *
 * Wizard must not fall back to generic list; must render a stepper
 * with per-step fields and navigation (prev/next/submit).
 */

import type { UIDLDocument, UIDLNode } from "../types";
import type { Language } from "../utils/i18n";
import { semanticNodeId, validateHostCapabilities, type HostCapabilities, type RoutePolicy, type UiPolicy, type WizardPageMeta } from "./types.js";

export interface CompileWizardOptions {
  hostCapabilities: HostCapabilities;
  uiPolicy?: UiPolicy;
  routePolicy?: RoutePolicy;
  docId?: string;
  extraHeaderActions?: UIDLNode[];
}

const BORDER_COLOR = "{primitives.color.border}";

function pageHeader(title: string, actions: UIDLNode[]): UIDLNode {
  return {
    id: "wizard-header",
    type: "Navbar",
    style: { justifyContent: "space-between", alignItems: "center", padding: "px-4", height: "h-row-large", borderWidth: "border-b", borderColor: BORDER_COLOR },
    children: [
      { id: "wizard-header-title", type: "Text", props: { value: title, heading: 1 }, style: { fontSize: "text-xl", fontWeight: 600 } },
      { id: "wizard-header-actions", type: "Toolbar", style: { display: "flex", gap: "gap-2" }, children: actions },
    ],
  };
}

function buildFieldNode(field: WizardPageMeta["steps"][number]["fields"][number], metaName: string, _lang: Language): UIDLNode {
  const id = semanticNodeId("wizard", metaName, field.key);
  const baseProps: Record<string, unknown> = {};
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

export function compileWizardPage(meta: WizardPageMeta, options: CompileWizardOptions): UIDLDocument {
  const gate = validateHostCapabilities({ recipe: "wizard", meta: meta as unknown as never, hostCapabilities: options.hostCapabilities } as never);
  if (gate.length > 0) throw new Error(`compileWizardPage: hostCapabilities rejected: ${gate.map((i) => i.message).join("; ")}`);

  const lang: Language = options.uiPolicy?.lang ?? "id";
  const docId = options.docId ?? `wizard-${meta.name.toLowerCase()}`;
  const title = meta.label[lang] ?? meta.name;

  const state: Record<string, unknown> = { currentStep: 0, formErrors: {}, formError: "" };
  for (const step of meta.steps) for (const field of step.fields) state[field.key] = field.default ?? "";

  const stepperNode: UIDLNode = {
    id: "wizard-stepper",
    type: "Toolbar",
    style: { display: "flex", gap: "gap-2", padding: "p-4", borderWidth: "border-b", borderColor: BORDER_COLOR },
    children: meta.steps.map((step, idx) => ({
      id: `wizard-step-${step.id}`,
      type: "Badge",
      props: { label: step.label[lang] ?? step.id, color: idx === 0 ? "blue" : "gray", variant: "pill" },
    })),
  };

  const stepPanels: UIDLNode[] = meta.steps.map((step, idx) => ({
    id: `wizard-panel-${step.id}`,
    type: "Column",
    style: { gap: "gap-4", padding: "p-4" },
    children: [
      { id: `wizard-panel-${step.id}-title`, type: "Text", props: { value: step.label[lang] ?? step.id, heading: 2 }, style: { fontSize: "text-lg", fontWeight: 600 } },
      ...step.fields.map((field) => {
        const control = buildFieldNode(field, meta.name, lang);
        return {
          id: `wizard-row-${field.key}`,
          type: "Row",
          style: { display: "flex", gap: "gap-4", alignItems: "center" },
          children: [
            { id: `wizard-row-${field.key}-label`, type: "Text", props: { value: field.label[lang] ?? field.key }, style: { width: "w-1/3", fontSize: "text-sm" } },
            { id: `wizard-row-${field.key}-control`, type: "Container", style: { width: "w-2/3" }, children: [control] },
          ],
        };
      }),
    ],
    visibility: { condition: { "==": [{ path: "state.currentStep" }, { literal: idx }] } },
  }));

  const navNode: UIDLNode = {
    id: "wizard-nav",
    type: "Toolbar",
    style: { display: "flex", justifyContent: "space-between", padding: "p-4", borderWidth: "border-t", borderColor: BORDER_COLOR },
    children: [
      {
        id: "wizard-prev-btn",
        type: "Button",
        props: { label: lang === "id" ? "Kembali" : "Back", variant: "secondary" },
        events: { onClick: [{ setState: { path: "currentStep", value: { $expr: { path: "state.currentStep - 1" } } } }] },
      },
      {
        id: "wizard-next-btn",
        type: "Button",
        props: { label: lang === "id" ? "Lanjut" : "Next", variant: "secondary" },
        events: { onClick: [{ setState: { path: "currentStep", value: { $expr: { path: "state.currentStep + 1" } } } }] },
        visibility: { condition: { "<": [{ path: "state.currentStep" }, { literal: meta.steps.length - 1 }] } },
      },
      {
        id: "wizard-submit-btn",
        type: "Button",
        props: { label: lang === "id" ? "Selesai" : "Submit", variant: "primary" },
        events: {
          onClick: [
            {
              mutate: {
                operation: "create",
                collection: meta.name,
                payload: Object.fromEntries(
                  meta.steps.flatMap((s) => s.fields.map((f) => [f.key, { $expr: { path: `state.${f.key}` } }])),
                ),
                statusPath: "formStatus",
                errorPath: "formError",
                fieldErrorsPath: "formErrors",
              },
            },
          ],
        },
        visibility: { condition: { "==": [{ path: "state.currentStep" }, { literal: meta.steps.length - 1 }] } },
      },
    ],
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
      children: [
        pageHeader(title, options.extraHeaderActions ?? []),
        stepperNode,
        ...stepPanels,
        {
          id: "wizard-error",
          type: "Text",
          props: { value: { $bind: "state.formError" } },
          style: { padding: "px-4", color: "{primitives.color.error}" },
          visibility: { condition: { "!=": [{ path: "state.formError" }, { literal: "" }] } },
        },
        navNode,
      ],
    },
  };
}
