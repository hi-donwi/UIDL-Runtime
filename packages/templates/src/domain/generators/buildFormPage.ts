/**
 * `buildFormPage(meta, id, options)` — DoctypeMeta-driven form page generator.
 *
 * Generates full create ("new") and edit forms from a single `DoctypeMeta` declaration.
 *
 * Includes:
 *   - "new" and "edit" modes with default value initialization
 *   - Sections grouping (`field.section`)
 *   - Field controls by widget (`TextField`, `Select`, `Currency`, `Date`, `Checkbox`, `Textarea`, `RadioGroup`, `Table`)
 *   - Field `readOnly` and conditional readOnly states
 *   - Child tables rendering (`meta.childTables`)
 *   - State machine transition action buttons (`meta.states.transitions`)
 *   - Validation error message hooks (`state.formErrors.*`)
 *   - Save / Cancel action buttons navigating to list route
 */

import type { UIDLDocument, UIDLNode } from "~/types";
import type { Language } from "~/utils/i18n";
import type { DoctypeMeta, FieldMeta } from "../doctypes/types";
import { parseDoctypeMeta } from "../doctypes/types";
import {
  meridianFormPage,
  meridianFormRow,
  meridianFormShell,
  meridianPageHeader,
  meridianSectionHeader,
  button,
} from "../../meridian/meridianLayout";

export interface BuildFormPageOptions {
  /** Company / tenant identifier (e.g. "shoe-company" or "meridian"). */
  company?: string;
  /** Language for labels and placeholders ("id" | "en"). Defaults to "id". */
  lang?: Language;
  /** Custom document ID. Defaults to `form-${meta.name.toLowerCase()}-${id}`. */
  docId?: string;
  /** Return route for Cancel and Save actions. Defaults to `/app/${company}/list/${meta.name}` or `/meridian/list/${meta.name}`. */
  listRoute?: string | ((meta: DoctypeMeta) => string);
  /** Initial record data for pre-populating fields in edit mode. */
  initialData?: Record<string, unknown>;
  /** Optimistic concurrency version returned by the adapter when this record was loaded. */
  initialVersion?: number;
  /** Extra actions to place in the form header toolbar. */
  extraHeaderActions?: UIDLNode[];
  /** Extra actions to place in the form footer toolbar. */
  extraFormActions?: UIDLNode[];
  /** Force full-width layout instead of centered card. */
  useFullWidth?: boolean;
}

const BORDER_COLOR = "{primitives.color.border}";

function buildFormPayload(meta: DoctypeMeta): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of meta.fields) {
    if (field.key === "id") continue;
    payload[field.key] = { $expr: { path: `state.${field.key}` } };
  }
  return payload;
}

function buildSaveButton(meta: DoctypeMeta, isNew: boolean, listRoute: string, lang: Language): UIDLNode {
  const saveButton = button("save-btn", lang === "id" ? "Simpan" : "Save", listRoute, "primary");
  saveButton.events = {
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
  return saveButton;
}

function buildTransitionButton(
  meta: DoctypeMeta,
  transition: NonNullable<DoctypeMeta["states"]>["transitions"][number],
  lang: Language,
): UIDLNode {
  const states = meta.states!;
  const transitionLabel = transition.label[lang] ?? transition.name;
  const isPrimary = transition.posting === true || transition.name === "submit";

  return {
    id: `transition-${transition.name}`,
    type: "Button",
    props: {
      label: transitionLabel,
      variant: isPrimary ? "primary" : "secondary",
    },
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
                {
                  setState: {
                    path: states.field,
                    value: { $bind: `event.record.${states.field}` },
                  },
                },
                {
                  setState: {
                    path: "_meta.version",
                    value: { $bind: "event.meta.version" },
                  },
                },
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
              or: transition.from.map((fromState) => ({
                "==": [{ path: `state.${states.field}` }, { literal: fromState }],
              })) as [unknown, unknown],
            },
    },
  };
}

/**
 * Builds a `UIDLNode` form control for a given `FieldMeta`.
 */
function buildFormControlNode(
  field: FieldMeta,
  lang: Language,
  meta: DoctypeMeta,
): UIDLNode {
  const isCheckbox = field.widget === "Checkbox" || field.widget === "Switch";
  const isSelect = field.widget === "Select" || field.widget === "RadioGroup";
  const isReadOnly = field.readOnly === true;

  let optionsList: Array<{ value: string; label: string }> | undefined;
  if (isSelect) {
    if (field.options && Array.isArray(field.options)) {
      optionsList = field.options;
    } else if (meta.states && field.key === meta.states.field) {
      optionsList = meta.states.values.map((v) => ({ value: v, label: v }));
    }
  }

  const baseProps: Record<string, unknown> = {
    "aria-label": field.label[lang] ?? field.key,
    size: "small",
    ...(isReadOnly ? { disabled: true } : {}),
    ...(isCheckbox ? {} : { error: { $bind: `state.formErrors.${field.key}` } }),
  };

  if (isCheckbox) {
    return {
      id: `field-${field.key}`,
      type: field.widget,
      props: {
        ...baseProps,
        checked: { $bind: `state.${field.key}` },
      },
      events: {
        onChange: [{ setState: { path: field.key, value: null } }],
      },
    };
  }

  if (field.widget === "Select") {
    return {
      id: `field-${field.key}`,
      type: "Select",
      props: {
        ...baseProps,
        value: { $bind: `state.${field.key}` },
        options: optionsList ?? [],
      },
      events: {
        onChange: [{ setState: { path: field.key, value: null } }],
      },
    };
  }

  if (field.widget === "RadioGroup") {
    return {
      id: `field-${field.key}`,
      type: "RadioGroup",
      props: {
        ...baseProps,
        value: { $bind: `state.${field.key}` },
        options: optionsList ?? [],
      },
      events: {
        onChange: [{ setState: { path: field.key, value: null } }],
      },
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
      id: `field-${field.key}`,
      type: "Textarea",
      props: {
        ...baseProps,
        value: { $bind: `state.${field.key}` },
        placeholder: customPlaceholder,
      },
      events: {
        onChange: [{ setState: { path: field.key, value: null } }],
      },
    };
  }

  if (field.widget === "Currency") {
    return {
      id: `field-${field.key}`,
      type: "TextField",
      props: {
        ...baseProps,
        value: { $bind: `state.${field.key}` },
        placeholder: customPlaceholder || "0",
      },
      events: {
        onChange: [{ setState: { path: field.key, value: null } }],
      },
    };
  }

  if (field.widget === "Date") {
    return {
      id: `field-${field.key}`,
      type: "TextField",
      props: {
        ...baseProps,
        value: { $bind: `state.${field.key}` },
        placeholder: customPlaceholder || "YYYY-MM-DD",
      },
      events: {
        onChange: [{ setState: { path: field.key, value: null } }],
      },
    };
  }

  // Default: TextField
  return {
    id: `field-${field.key}`,
    type: "TextField",
    props: {
      ...baseProps,
      value: { $bind: `state.${field.key}` },
      placeholder: customPlaceholder,
    },
    events: {
      onChange: [{ setState: { path: field.key, value: null } }],
    },
  };
}

/**
 * Builds a `UIDLDocument` for a form page (create mode with `id === "new"` or edit mode).
 */
export function buildFormPage(
  metaInput: DoctypeMeta,
  id: string,
  options: BuildFormPageOptions = {},
): UIDLDocument {
  const meta = parseDoctypeMeta(metaInput);
  const isNew = id === "new";
  const lang = options.lang ?? "id";
  const docId = options.docId ?? `form-${meta.name.toLowerCase()}-${id.toLowerCase()}`;

  const listRoute =
    typeof options.listRoute === "function"
      ? options.listRoute(meta)
      : options.listRoute ?? (options.company ? `/app/${options.company}/list/${meta.name}` : `/meridian/list/${meta.name}`);

  const title = isNew
    ? lang === "id"
      ? `Buat ${meta.label.id}`
      : `New ${meta.label.en}`
    : `${meta.label[lang] ?? meta.name} (${id})`;

  // Initialize form state
  const state: Record<string, unknown> = {
    id: isNew ? "" : id,
    formErrors: {},
    formError: "",
    formStatus: "idle",
    savedRecord: null,
    _meta: options.initialVersion !== undefined ? { version: options.initialVersion } : {},
  };

  // Populate field values. `id` is deliberately skipped: it was already set correctly above
  // from the route param, and this doctype's own `id` FieldMeta entry (present on nearly every
  // doctype, usually readOnly) would otherwise fall through to the `else` branch and clobber it
  // back to "" whenever initialData doesn't carry an "id" key — which used to happen on every
  // edit-mode route, since initialData wasn't being fetched at all (see moduleRuntime.ts).
  for (const field of meta.fields) {
    if (field.key === "id") continue;
    if (options.initialData && field.key in options.initialData) {
      state[field.key] = options.initialData[field.key];
    } else if (field.default !== undefined) {
      state[field.key] = field.default;
    } else if (field.widget === "Checkbox" || field.widget === "Switch") {
      state[field.key] = false;
    } else if (field.widget === "Currency") {
      state[field.key] = 0;
    } else if (field.widget === "Table") {
      state[field.key] = [];
    } else {
      state[field.key] = "";
    }
  }

  // Populate state status if state machine is declared
  if (meta.states) {
    state[meta.states.field] =
      options.initialData?.[meta.states.field] ?? meta.states.initial;
  }

  // Group fields by section (skipping Table widgets which render as child tables below)
  const sectionsMap = new Map<string, FieldMeta[]>();
  for (const field of meta.fields) {
    if (field.widget === "Table") continue;
    const sectionName = field.section ?? "";
    if (!sectionsMap.has(sectionName)) {
      sectionsMap.set(sectionName, []);
    }
    sectionsMap.get(sectionName)!.push(field);
  }

  // Build section rows
  const formContentNodes: UIDLNode[] = [];

  for (const [sectionName, sectionFields] of sectionsMap.entries()) {
    if (sectionName.trim()) {
      formContentNodes.push(
        meridianSectionHeader(`section-${sectionName.toLowerCase().replace(/\s+/g, "-")}`, sectionName),
      );
    }

    for (const field of sectionFields) {
      const fieldLabel = `${field.label[lang] ?? field.key}${field.required ? " *" : ""}`;
      const controlNode = buildFormControlNode(field, lang, meta);
      formContentNodes.push(
        meridianFormRow(`row-${field.key}`, fieldLabel, controlNode),
      );
    }
  }

  // Child tables rendering
  const childTableNodes: UIDLNode[] = [];
  const hasChildTables = Boolean(meta.childTables && meta.childTables.length > 0);
  if (hasChildTables) {
    for (const childTable of meta.childTables ?? []) {
      const childField = meta.fields.find((f) => f.key === childTable.field);
      const childLabel = childField?.label[lang] ?? childTable.field;
      childTableNodes.push({
        id: `child-table-${childTable.field}`,
        type: "DataTable",
        props: {
          title: childLabel,
          dataSource: childTable.field,
          paginate: false,
        },
        style: { width: "w-full", borderWidth: "border-b", borderColor: BORDER_COLOR },
      });
    }
  }

const DOCTYPE_PRINT_TEMPLATES: Record<string, (company: string, id: string) => string> = {
  SalesInvoice: (_c, id) => `/meridian/print/tax-invoice/SalesInvoice/${id}`,
  PurchaseInvoice: (_c, id) => `/meridian/print/tax-invoice/PurchaseInvoice/${id}`,
  DeliveryNote: (_c, id) => `/meridian/print/delivery-note/DeliveryNote/${id}`,
  PurchaseOrder: (_c, id) => `/meridian/print/purchase-order/PurchaseOrder/${id}`,
  POSInvoice: (_c, id) => `/meridian/print/pos-receipt/shoe-company/${id}`,
  ShoeOrder: (_c, id) => `/meridian/print/pos-receipt/shoe-company/${id}`,
  TuitionFee: (_c, id) => `/meridian/print/tuition-invoice/school-abc/${id}`,
  WorkOrder: (_c, id) => `/meridian/print/work-order/factory-abc/${id}`,
  RoastingBatch: (_c, id) => `/meridian/print/roasting-profile/food-roasters/${id}`,
  ProjectMilestone: (_c, id) => `/meridian/print/bast-milestone/epc-contractor/${id}`,
  Opportunity: (_c, id) => `/meridian/print/commercial-quotation/crm-pipeline/${id}`,
  MurabahahAgreement: (_c, id) => `/meridian/print/akad-murabahah/koperasi-bmt/${id}`,
  PatientAdmission: (_c, id) => `/meridian/print/medical-prescription/hospital-medika/${id}`,
  DeviceBatch: (_c, id) => `/meridian/print/certificate-of-analysis/medical-device/${id}`,
  FulfillmentOrder: (_c, id) => `/meridian/print/packing-slip/omnichannel-dist/${id}`,
  SupportTicket: (_c, id) => `/meridian/print/sla-incident/helpdesk/${id}`,
};

  // State machine transition buttons (for edit mode)
  const transitionButtons: UIDLNode[] = [];
  if (!isNew && meta.states) {
    for (const transition of meta.states.transitions) {
      transitionButtons.push(buildTransitionButton(meta, transition, lang));
    }
  }

  // Print button for edit mode
  const printUrlBuilder = !isNew ? DOCTYPE_PRINT_TEMPLATES[meta.name] : undefined;
  const printButtonNodes: UIDLNode[] = printUrlBuilder
    ? [button("print-doc-btn", lang === "id" ? "Cetak Dokumen" : "Print Document", printUrlBuilder(options.company ?? "", id), "secondary", "printer")]
    : [];

  // Header Actions
  const headerActions: UIDLNode[] = [
    ...printButtonNodes,
    ...(options.extraHeaderActions ?? []),
    ...transitionButtons,
  ];

  // Footer Actions: Cancel + Save + extra actions
  const footerActions: UIDLNode[] = [
    button("cancel-btn", lang === "id" ? "Batal" : "Cancel", listRoute),
    ...(options.extraFormActions ?? []),
    buildSaveButton(meta, isNew, listRoute, lang),
  ];

  const useFullWidth = options.useFullWidth ?? hasChildTables;

  const headerNode = meridianPageHeader(title, headerActions, "form-header");

  const formFooterNode: UIDLNode = {
    id: "form-actions",
    type: "Toolbar",
    style: {
      display: "flex",
      justifyContent: "end",
      alignItems: "center",
      gap: "gap-2",
      padding: "p-4",
    },
    children: footerActions,
  };

  // Assemble the root node
  let rootNode: UIDLNode;

  if (useFullWidth) {
    rootNode = {
      id: "page",
      type: "Column",
      style: { fontSize: "text-base", width: "w-full" },
      children: [
        headerNode,
        ...formContentNodes,
        ...childTableNodes,
        {
          id: "form-error",
          type: "Text",
          props: { value: { $bind: "state.formError" }, role: "alert" },
          style: { padding: "px-4", color: "{primitives.color.error}" },
          visibility: { condition: { "!=": [{ path: "state.formError" }, { literal: "" }] } },
        },
        formFooterNode,
      ],
    };
  } else {
    rootNode = meridianFormPage([
      meridianFormShell("form-shell", [
        headerNode,
        ...formContentNodes,
        ...childTableNodes,
        {
          id: "form-error",
          type: "Text",
          props: { value: { $bind: "state.formError" }, role: "alert" },
          style: { padding: "px-4", color: "{primitives.color.error}" },
          visibility: { condition: { "!=": [{ path: "state.formError" }, { literal: "" }] } },
        },
        formFooterNode,
      ]),
    ]);
  }

  return {
    version: "1.0.0",
    id: docId,
    name: title,
    state,
    root: rootNode,
  };
}
