/**
 * Public form/detail recipe — free of demo, company, and host-specific code.
 *
 * Extracted from `packages/templates/src/domain/generators/buildFormPage.ts`
 * but typed against public `FormPageMeta` / `HostCapabilities`.
 *
 * No demo dataset, company fixture, or host `ErpModuleSpec` imported.
 */

import type { UIDLDocument, UIDLNode } from "../types";
import type { Language } from "../utils/i18n";
import {
  MERIDIAN_FORM_CONTROL_PROPS,
  MERIDIAN_FORM_CONTROL_STYLE,
  MERIDIAN_FORM_FOOTER_STYLE,
  MERIDIAN_FORM_HEADER_STYLE,
  MERIDIAN_FORM_LABEL_STYLE,
  MERIDIAN_FORM_PAGE_FULL_STYLE,
  MERIDIAN_FORM_PAGE_STYLE,
  MERIDIAN_FORM_ROW_GRID,
  MERIDIAN_FORM_ROW_STYLE,
  MERIDIAN_FORM_SHELL_STYLE,
  MERIDIAN_SECTION_HEADER_STYLE,
} from "../utils/formLayout";
import {
  semanticNodeId,
  validateHostCapabilities,
  type FormPageMeta,
  type HostCapabilities,
  type RoutePolicy,
  type UiPolicy,
} from "./types.js";

export interface CompileFormOptions {
  hostCapabilities: HostCapabilities;
  uiPolicy?: UiPolicy;
  routePolicy?: RoutePolicy;
  docId?: string;
  listRoute?: string;
  initialData?: Record<string, unknown>;
  initialVersion?: number;
  extraHeaderActions?: UIDLNode[];
  extraFormActions?: UIDLNode[];
  useFullWidth?: boolean;
}

const BORDER_COLOR = "{primitives.color.border}";

function buildFormPayload(meta: FormPageMeta): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of meta.fields) {
    if (field.key === "id") continue;
    if (field.widget === "Table") continue;
    payload[field.key] = { $expr: { path: `state.${field.key}` } };
  }
  return payload;
}

function buttonNode(
  id: string,
  label: string,
  route: string,
  variant: "primary" | "secondary" = "secondary",
): UIDLNode {
  return {
    id,
    type: "Button",
    props: { label, variant },
    events: { onClick: [{ navigate: { route } }] },
  };
}

function buildSaveButton(
  meta: FormPageMeta,
  isNew: boolean,
  listRoute: string,
  lang: Language,
): UIDLNode {
  const btn = buttonNode("save-btn", lang === "id" ? "Simpan" : "Save", listRoute, "primary");
  btn.events = {
    onClick: [
      {
        mutate: {
          operation: isNew ? "create" : "update",
          collection: meta.name,
          ...(isNew ? {} : { id: { $expr: { path: "state.id" } } }),
          payload: buildFormPayload(meta),
          version: { $expr: { path: "state._meta.version" } },
          statusPath: "formStatus",
          resultPath: "savedRecord",
          errorPath: "formError",
          fieldErrorsPath: "formErrors",
          onSuccess: { navigate: { route: listRoute } },
        },
      },
    ],
  };
  return btn;
}

function buildTransitionButton(
  meta: FormPageMeta,
  transition: NonNullable<FormPageMeta["states"]>["transitions"][number],
  lang: Language,
): UIDLNode {
  const states = meta.states!;
  const label = transition.label[lang] ?? transition.name;
  const isPrimary = transition.name === "submit";
  return {
    id: `transition-${transition.name}`,
    type: "Button",
    props: { label, variant: isPrimary ? "primary" : "secondary" },
    events: {
      onClick: [
        {
          mutate: {
            operation: "transition",
            collection: meta.name,
            id: { $expr: { path: "state.id" } },
            transition: transition.name,
            version: { $expr: { path: "state._meta.version" } },
            statusPath: "formStatus",
            resultPath: "savedRecord",
            errorPath: "formError",
            fieldErrorsPath: "formErrors",
            onSuccess: {
              sequence: [
                { setState: { path: states.field, value: { $bind: `event.record.${states.field}` } } },
                { setState: { path: "_meta.version", value: { $bind: "event.meta.version" } } },
              ],
            },
          },
        },
      ],
    },
    visibility: {
      condition:
        transition.from.length === 1
          ? { "==": [{ path: `state.${states.field}` }, { literal: transition.from[0] }] }
          : {
              or: transition.from.map((from) => ({
                "==": [{ path: `state.${states.field}` }, { literal: from }],
              })) as [unknown, unknown],
            },
    },
  };
}

function buildFormControlNode(
  field: FormPageMeta["fields"][number],
  lang: Language,
  meta: FormPageMeta,
): UIDLNode {
  const isCheckbox = field.widget === "Checkbox" || field.widget === "Switch";
  const isReadOnly = field.readOnly === true;

  const baseProps: Record<string, unknown> = {
    // A checkbox has no density variant in Meridian (Controls/Check) and none in this widget's
    // manifest, so emitting `size` on one made the whole document fail the host's prop check —
    // and a host that validates before rendering (a host application does) replaced the entire editor
    // with an error box. Every doctype carrying a boolean field lost its form that way.
    ...(isCheckbox ? {} : { size: "small", error: { $bind: `state.formErrors.${field.key}` } }),
    ...(isReadOnly ? { disabled: true } : {}),
  };

  if (isCheckbox) {
    return {
      id: semanticNodeId("form", meta.name, field.key),
      type: field.widget,
      props: { ...baseProps, checked: { $bind: `state.${field.key}` } },
      events: { onChange: [{ setState: { path: field.key, value: null } }] },
    };
  }

  if (field.widget === "Select" || field.widget === "RadioGroup") {
    let optionsList: Array<{ value: string; label: string }> | undefined;
    if (field.options && Array.isArray(field.options)) {
      optionsList = field.options;
    } else if (meta.states && field.key === meta.states.field) {
      optionsList = meta.states.values.map((v) => ({ value: v, label: v }));
    } else if (field.options && typeof field.options === "object" && "doctype" in field.options) {
      optionsList = [];
    }
    return {
      id: semanticNodeId("form", meta.name, field.key),
      type: field.widget,
      props: { ...baseProps, value: { $bind: `state.${field.key}` }, options: optionsList ?? [] },
      events: { onChange: [{ setState: { path: field.key, value: null } }] },
    };
  }

  if (field.widget === "Link") {
    // Link is a scoped lookup — Select options are populated from a
    // per-field $query dataSource for the target doctype. The Select's
    // options bind to the query's rows; loading/error/empty are handled by
    // sibling Text nodes that are visible based on the query's status.
    const linkDoctype =
      (field.options && typeof field.options === "object" && "doctype" in field.options
        ? (field.options as { doctype: string }).doctype
        : undefined) ?? (field as unknown as { linkDoctype?: string }).linkDoctype;
    if (linkDoctype) {
      const dsKey = `link_${field.key}`;
      const linkTarget = (field.options && typeof field.options === "object" && "doctype" in field.options
        ? (field.options as { valueKey?: string; labelKey?: string })
        : {});
      const linkValueKey = linkTarget.valueKey ?? "id";
      const linkLabelKey = linkTarget.labelKey ?? "name";
      // The dataSource itself is declared at the document level (see compileFormPage),
      // here we just bind the Select's options to its rows.
      return {
        id: semanticNodeId("form", meta.name, field.key),
        type: "Column",
        style: { display: "flex", flexDirection: "column", gap: "gap-1" },
        children: [
          {
            id: `${semanticNodeId("form", meta.name, field.key)}-select`,
            type: "Select",
            props: {
              ...baseProps,
              value: { $bind: `state.${field.key}` },
              // Bind to the lookup rows — the DataAdapter will populate state.$data[dsKey]
              options: { $bind: `state.$data.${dsKey}.rows` } as unknown as Array<{ value: string; label: string }>,
              // Lookup rows are the target doctype's own records, so the Select is told which
              // of their keys is the stored value and which is the visible text.
              optionValueKey: linkValueKey,
              optionLabelKey: linkLabelKey,
              placeholder: typeof field.placeholder === "string" ? field.placeholder : field.placeholder?.[lang] ?? `Select ${field.label[lang] ?? field.key}`,
            },
            events: { onChange: [{ setState: { path: field.key, value: null } }] },
          },
          {
            id: `${semanticNodeId("form", meta.name, field.key)}-loading`,
            type: "Text",
            props: { value: "Loading…" },
            style: { fontSize: "text-xs", color: "{primitives.color.text-secondary}" },
            visibility: { condition: { "==": [{ path: `state.$data.${dsKey}.status` }, { literal: "loading" }] } },
          },
          {
            id: `${semanticNodeId("form", meta.name, field.key)}-error`,
            type: "Text",
            props: { value: "Failed to load options" },
            style: { fontSize: "text-xs", color: "{primitives.color.error}" },
            visibility: { condition: { "==": [{ path: `state.$data.${dsKey}.status` }, { literal: "error" }] } },
          },
          {
            id: `${semanticNodeId("form", meta.name, field.key)}-empty`,
            type: "Text",
            props: { value: "No options" },
            style: { fontSize: "text-xs", color: "{primitives.color.text-secondary}" },
            visibility: {
              condition: {
                and: [
                  { "==": [{ path: `state.$data.${dsKey}.status` }, { literal: "success" }] },
                  { "==": [{ path: `state.$data.${dsKey}.rows.length` }, { literal: 0 }] },
                ],
              },
            },
          },
        ],
      };
    }
    let optionsList: Array<{ value: string; label: string }> = [];
    if (field.options && Array.isArray(field.options)) optionsList = field.options;
    return {
      id: semanticNodeId("form", meta.name, field.key),
      type: "Select",
      props: {
        ...baseProps,
        value: { $bind: `state.${field.key}` },
        options: optionsList,
        placeholder: typeof field.placeholder === "string" ? field.placeholder : field.placeholder?.[lang] ?? `Select ${field.label[lang] ?? field.key}`,
      },
      events: { onChange: [{ setState: { path: field.key, value: null } }] },
    };
  }

  const customPlaceholder =
    typeof field.placeholder === "object"
      ? field.placeholder[lang] ?? ""
      : typeof field.placeholder === "string"
        ? field.placeholder
        : "";

  if (field.widget === "Textarea") {
    return {
      id: semanticNodeId("form", meta.name, field.key),
      type: "Textarea",
      props: { ...baseProps, value: { $bind: `state.${field.key}` }, placeholder: customPlaceholder },
      events: { onChange: [{ setState: { path: field.key, value: null } }] },
    };
  }

  if (field.widget === "Currency") {
    return {
      id: semanticNodeId("form", meta.name, field.key),
      type: "TextField",
      props: { ...baseProps, value: { $bind: `state.${field.key}` }, placeholder: customPlaceholder || "0" },
      events: { onChange: [{ setState: { path: field.key, value: null } }] },
    };
  }

  if (field.widget === "Date") {
    return {
      id: semanticNodeId("form", meta.name, field.key),
      type: "TextField",
      props: { ...baseProps, value: { $bind: `state.${field.key}` }, placeholder: customPlaceholder || "YYYY-MM-DD" },
      events: { onChange: [{ setState: { path: field.key, value: null } }] },
    };
  }

  if (field.widget === "Slider") {
    return {
      id: semanticNodeId("form", meta.name, field.key),
      type: "Slider",
      props: { ...baseProps, value: { $bind: `state.${field.key}` } },
      events: { onChange: [{ setState: { path: field.key, value: null } }] },
    };
  }

  return {
    id: semanticNodeId("form", meta.name, field.key),
    type: "TextField",
    props: { ...baseProps, value: { $bind: `state.${field.key}` }, placeholder: customPlaceholder },
    events: { onChange: [{ setState: { path: field.key, value: null } }] },
  };
}

function formRow(id: string, label: string, control: UIDLNode): UIDLNode {
  return {
    id,
    type: "Row",
    props: { style: { ...MERIDIAN_FORM_ROW_GRID } },
    style: { ...MERIDIAN_FORM_ROW_STYLE },
    children: [
      { id: `${id}-label`, type: "Text", props: { value: label }, style: { ...MERIDIAN_FORM_LABEL_STYLE } },
      {
        id: `${id}-control`,
        type: "Column",
        style: { ...MERIDIAN_FORM_CONTROL_STYLE },
        children: [nameControl(unboxControl(control), label)],
      },
    ],
  };
}

/**
 * Controls/Base: a control inside a form row is borderless and `size="small"` — the row's
 * own rule is what separates one field from the next, so a boxed control reads as a second
 * frame inside it. Applied here rather than at each control builder so every widget a row can
 * hold gets it, including the Select nested inside a link field's wrapper.
 */
function unboxControl(control: UIDLNode): UIDLNode {
  if (BOXED_CONTROLS.has(control.type)) {
    return { ...control, props: { ...MERIDIAN_FORM_CONTROL_PROPS, ...(control.props ?? {}) } };
  }
  if (!control.children?.length) return control;
  return { ...control, children: control.children.map(unboxControl) };
}

const BOXED_CONTROLS = new Set(["TextField", "Textarea", "Select"]);

/**
 * TwoColumnForm prints a field's label in the row's start column, so the control must not
 * print it again — but a control with no name of its own reaches assistive tech as an unnamed
 * input, which is what axe reports as `label` / `select-name`. Naming it the way the static
 * Meridian documents do (`aria-label`, see templates' `formControlNode`) satisfies both.
 */
export function nameControl(control: UIDLNode, label: string): UIDLNode {
  if (NAMEABLE_CONTROLS.has(control.type)) {
    const props = (control.props ?? {}) as Record<string, unknown>;
    if (props["aria-label"] || props.label) return control;
    return { ...control, props: { ...props, "aria-label": label } };
  }
  // A link field wraps its Select in a Column alongside loading/error text, so the name has to
  // reach the control inside rather than settling on the wrapper, where it names nothing.
  if (!control.children?.length) return control;
  let named = false;
  const children = control.children.map((child) => {
    if (named) return child;
    const result = nameControl(child, label);
    if (result !== child) named = true;
    return result;
  });
  return named ? { ...control, children } : control;
}

const NAMEABLE_CONTROLS = new Set(["TextField", "Textarea", "Select", "RadioGroup", "Checkbox", "Switch", "Slider"]);

function sectionHeader(id: string, title: string): UIDLNode {
  return {
    id,
    type: "Text",
    props: { value: title, heading: 3 },
    style: { ...MERIDIAN_SECTION_HEADER_STYLE },
  };
}

function pageHeader(title: string, actions: UIDLNode[]): UIDLNode {
  return {
    id: "form-header",
    type: "Navbar",
    style: { ...MERIDIAN_FORM_HEADER_STYLE },
    children: [
      { id: "form-header-title", type: "Text", props: { value: title, heading: 1 }, style: { fontSize: "text-xl", fontWeight: 600 } },
      { id: "form-header-actions", type: "Toolbar", style: { display: "flex", gap: "gap-2" }, children: actions },
    ],
  };
}

function formPageWrapper(children: UIDLNode[], fullWidth = false): UIDLNode {
  return {
    id: "page",
    type: "Column",
    style: fullWidth ? { ...MERIDIAN_FORM_PAGE_FULL_STYLE } : { ...MERIDIAN_FORM_PAGE_STYLE },
    children,
  };
}

function formShell(children: UIDLNode[]): UIDLNode {
  return {
    id: "form-shell",
    type: "Form",
    style: { ...MERIDIAN_FORM_SHELL_STYLE },
    children,
  };
}

export function compileFormPage(
  meta: FormPageMeta,
  recordId: string,
  options: CompileFormOptions,
): UIDLDocument {
  const isNew = recordId === "new";
  const lang: Language = options.uiPolicy?.lang ?? "id";

  // Host gate
  const gateInput = { recipe: "form" as const, meta, hostCapabilities: options.hostCapabilities };
  const issues = validateHostCapabilities(gateInput);
  if (issues.length > 0) {
    throw new Error(`compileFormPage: hostCapabilities rejected: ${issues.map((i) => i.message).join("; ")}`);
  }

  const docId = options.docId ?? `form-${meta.name.toLowerCase()}-${recordId.toLowerCase()}`;
  const listBase = options.routePolicy?.listBase ?? "/app/list";
  const listRoute = options.listRoute ?? `${listBase}/${meta.name}`.replace("//", "/");

  const title = isNew
    ? lang === "id"
      ? `Buat ${meta.label.id}`
      : `New ${meta.label.en}`
    : `${meta.label[lang] ?? meta.name} (${recordId})`;

  const state: Record<string, unknown> = {
    id: isNew ? "" : recordId,
    formErrors: {},
    formError: "",
    formStatus: "idle",
    savedRecord: null,
    _meta: options.initialVersion !== undefined ? { version: options.initialVersion } : {},
  };

  for (const field of meta.fields) {
    if (field.key === "id") continue;
    if (field.widget === "Table") continue;
    if (options.initialData && field.key in options.initialData) {
      state[field.key] = options.initialData[field.key];
    } else if (field.default !== undefined) {
      state[field.key] = field.default;
    } else if (field.widget === "Checkbox" || field.widget === "Switch") {
      state[field.key] = false;
    } else if (field.widget === "Currency") {
      state[field.key] = 0;
    } else {
      state[field.key] = "";
    }
  }

  if (meta.states) {
    state[meta.states.field] = options.initialData?.[meta.states.field] ?? meta.states.initial;
  }

  // scoped lookup dataSources for Link fields
  const dataSources: Record<string, unknown> = {};
  for (const field of meta.fields) {
    if (field.widget === "Link") {
      const linkDoctype =
        (field.options && typeof field.options === "object" && "doctype" in field.options
          ? (field.options as { doctype: string }).doctype
          : undefined) ?? (field as unknown as { linkDoctype?: string }).linkDoctype;
      if (linkDoctype) {
        const dsKey = `link_${field.key}`;
        dataSources[dsKey] = { $query: { collection: linkDoctype, page: { size: 50 } } };
      }
    }
  }

  // Group by section
  const sectionsMap = new Map<string, typeof meta.fields>();
  for (const field of meta.fields) {
    if (field.widget === "Table") continue;
    const sec = field.section ?? "";
    if (!sectionsMap.has(sec)) sectionsMap.set(sec, []);
    sectionsMap.get(sec)!.push(field);
  }

  const formContentNodes: UIDLNode[] = [];
  for (const [sectionName, sectionFields] of sectionsMap.entries()) {
    if (sectionName.trim()) {
      formContentNodes.push(sectionHeader(`section-${sectionName.toLowerCase().replace(/\s+/g, "-")}`, sectionName));
    }
    for (const field of sectionFields) {
      const fieldLabel = `${field.label[lang] ?? field.key}${field.required ? " *" : ""}`;
      const control = buildFormControlNode(field, lang, meta);
      formContentNodes.push(formRow(`row-${field.key}`, fieldLabel, control));
    }
  }

  const childTableNodes: UIDLNode[] = [];
  const hasChildTables = Boolean(meta.childTables && meta.childTables.length > 0);
  if (hasChildTables) {
    for (const childTable of meta.childTables ?? []) {
      const childField = meta.fields.find((f) => f.key === childTable.field);
      const childLabel = childField?.label[lang] ?? childTable.field;
      childTableNodes.push({
        id: `child-table-${childTable.field}`,
        type: "DataTable",
        props: { title: childLabel, dataSource: childTable.field, paginate: false },
        style: { width: "w-full", borderWidth: "border-b", borderColor: BORDER_COLOR },
      });
    }
  }

  const transitionButtons: UIDLNode[] = [];
  if (!isNew && meta.states) {
    for (const tr of meta.states.transitions) {
      transitionButtons.push(buildTransitionButton(meta, tr, lang));
    }
  }

  const headerActions: UIDLNode[] = [
    ...(options.extraHeaderActions ?? []),
    ...transitionButtons,
  ];

  const footerActions: UIDLNode[] = [
    buttonNode("cancel-btn", lang === "id" ? "Batal" : "Cancel", listRoute),
    ...(options.extraFormActions ?? []),
    buildSaveButton(meta, isNew, listRoute, lang),
  ];

  const useFullWidth = options.useFullWidth ?? hasChildTables;

  const headerNode = pageHeader(title, headerActions);

  const formFooterNode: UIDLNode = {
    id: "form-actions",
    type: "Toolbar",
    style: { ...MERIDIAN_FORM_FOOTER_STYLE },
    children: footerActions,
  };

  const errorNode: UIDLNode = {
    id: "form-error",
    type: "Text",
    props: { value: { $bind: "state.formError" } },
    style: { padding: "px-4", color: "{primitives.color.error}" },
    visibility: { condition: { "!=": [{ path: "state.formError" }, { literal: "" }] } },
  };

  let rootNode: UIDLNode;
  if (useFullWidth) {
    // No gap: TwoColumnForm rows sit flush and are separated by their own bottom rule.
    const formNode: UIDLNode = { id: "form", type: "Form", style: { display: "flex", flexDirection: "column" }, children: [...formContentNodes, ...childTableNodes] };
    rootNode = formPageWrapper([headerNode, formNode, errorNode, formFooterNode], true);
  } else {
    rootNode = formPageWrapper([formShell([headerNode, ...formContentNodes, ...childTableNodes, errorNode, formFooterNode])]);
  }

  return {
    version: "1.0.0",
    id: docId,
    name: title,
    state,
    dataSources: Object.keys(dataSources).length > 0 ? dataSources : undefined,
    root: rootNode,
  };
}
