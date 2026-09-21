/**
 * `DoctypeMeta` — one declaration a generator (`buildListPage`/`buildFormPage`/
 * `buildWorkspacePage`/`buildReportPage`) turns into a full list + form + report,
 * replacing the 150 hand-typed console pages this SDK's demo currently has (see
 * `.notes/plan/00-audit-kondisi-saat-ini.md`). Lives in the demo layer, not `src/` — the SDK
 * doesn't need to know what a "doctype" is, only how to render a `UIDLDocument`.
 *
 * `DoctypeMetaSchema` validates a meta against itself: dangling references (a listView column
 * naming a field that doesn't exist, a transition's `from`/`to` naming a state that isn't
 * declared) are rejected at parse time, not discovered later as a blank column or a dead button.
 */
import { z } from "zod";

export const LocalizedTextSchema = z.object({ id: z.string(), en: z.string() });
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const FieldWidgetSchema = z.enum([
  "TextField",
  "Textarea",
  "Select",
  "RadioGroup",
  "Checkbox",
  "Switch",
  "Slider",
  "Link",
  "Currency",
  "Date",
  "Table",
]);
export type FieldWidget = z.infer<typeof FieldWidgetSchema>;

export const FieldOptionSchema = z.object({ value: z.string(), label: z.string() });

export const FieldValidateSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  message: LocalizedTextSchema.optional(),
});

export const FieldMetaSchema = z.object({
  key: z.string().min(1),
  label: LocalizedTextSchema,
  widget: FieldWidgetSchema,
  required: z.boolean().optional(),
  /** `true`, or an `$expr`-shaped condition (e.g. `{"path": "state.status"}` gated elsewhere) —
   *  kept as `unknown` here since `$expr` itself is an SDK concept this module doesn't import. */
  readOnly: z.union([z.boolean(), z.unknown()]).optional(),
  options: z.union([z.array(FieldOptionSchema), z.object({ doctype: z.string() })]).optional(),
  placeholder: z.union([z.string(), LocalizedTextSchema]).optional(),
  default: z.unknown().optional(),
  validate: FieldValidateSchema.optional(),
  section: z.string().optional(),
  /** `$expr`-shaped computed value, e.g. `qty * rate` — evaluated host-side, not by extending
   *  the SDK's expression language (deliberate scope boundary, see 01-arsitektur-target.md §9.6). */
  computed: z.unknown().optional(),
});
export type FieldMeta = z.infer<typeof FieldMetaSchema>;

export const ListViewColumnSchema = z.object({
  field: z.string(),
  width: z.string().optional(),
  align: z.enum(["left", "right", "center"]).optional(),
});

export const ListViewFilterSchema = z.object({
  field: z.string(),
  widget: z.enum(["Select", "TextField", "DateRange"]),
  label: LocalizedTextSchema.optional(),
  options: z.array(FieldOptionSchema).optional(),
});

export const ListViewSummarySchema = z.object({
  label: LocalizedTextSchema,
  agg: z.enum(["sum", "count", "avg"]),
  field: z.string(),
});

export const ListViewSchema = z.object({
  columns: z.array(ListViewColumnSchema).min(1),
  filters: z.array(ListViewFilterSchema).optional(),
  defaultSort: z.object({ field: z.string(), dir: z.enum(["asc", "desc"]) }),
  pageSize: z.number().int().positive().default(20),
  statusField: z.string().optional(),
  summaries: z.array(ListViewSummarySchema).optional(),
});

export const StateTransitionSchema = z.object({
  name: z.string().min(1),
  label: LocalizedTextSchema,
  from: z.array(z.string()).min(1),
  to: z.string(),
  /** `$expr`-shaped guard, evaluated by documentService before the transition runs. */
  guard: z.unknown().optional(),
  permission: z.string().optional(),
  confirm: LocalizedTextSchema.optional(),
  posting: z.boolean().optional(),
});

export const StatesSchema = z.object({
  field: z.string(),
  /** The full set of valid values for `field` — `initial` and every transition's `from`/`to`
   *  must be drawn from this list; that's what lets a dangling transition be caught at parse
   *  time instead of silently rendering a button that goes nowhere. */
  values: z.array(z.string()).min(1),
  initial: z.string(),
  transitions: z.array(StateTransitionSchema),
});

export const PostingLineRuleSchema = z.object({
  account: z.string(),
  side: z.enum(["debit", "credit"]),
  /** `$expr`-shaped amount, e.g. a path into the document (`"lines[].amount"` summed) —
   *  interpreted by postingService, not by this schema. */
  amount: z.unknown(),
});

export const PostingRuleSchema = z.object({
  /** Which transition triggers posting — must name a transition with `posting: true`. */
  onTransition: z.string(),
  lines: z.array(PostingLineRuleSchema).min(2),
});

export const ChildTableRefSchema = z.object({ field: z.string(), doctype: z.string() });

export const PermissionSchema = z.object({
  read: z.boolean(),
  write: z.boolean(),
  submit: z.boolean(),
  delete: z.boolean(),
});

export const DoctypeMetaSchemaBase = z.object({
  name: z.string().min(1),
  label: LocalizedTextSchema,
  module: z.string(),
  /** Naming series, e.g. "SINV-.YYYY.-.#####" — interpreted by numberingService. */
  naming: z.string(),
  titleField: z.string(),
  fields: z.array(FieldMetaSchema).min(1),
  listView: ListViewSchema,
  states: StatesSchema.optional(),
  posting: PostingRuleSchema.optional(),
  print: z.array(z.string()).optional(),
  permissions: z.record(z.string(), PermissionSchema),
  childTables: z.array(ChildTableRefSchema).optional(),
});

export const DoctypeMetaSchema = DoctypeMetaSchemaBase.superRefine((meta, ctx) => {
  const fieldKeys = new Set(meta.fields.map((f) => f.key));

  for (const [index, column] of meta.listView.columns.entries()) {
    if (!fieldKeys.has(column.field) && column.field !== "id") {
      ctx.addIssue({
        code: "custom",
        path: ["listView", "columns", index, "field"],
        message: `listView.columns references field "${column.field}", which is not declared in fields[]`,
      });
    }
  }

  if (!fieldKeys.has(meta.titleField) && meta.titleField !== "id") {
    ctx.addIssue({
      code: "custom",
      path: ["titleField"],
      message: `titleField "${meta.titleField}" is not declared in fields[]`,
    });
  }

  if (meta.states) {
    const { values, initial, transitions } = meta.states;
    const valueSet = new Set(values);

    if (!valueSet.has(initial)) {
      ctx.addIssue({
        code: "custom",
        path: ["states", "initial"],
        message: `states.initial "${initial}" is not one of states.values [${values.join(", ")}]`,
      });
    }

    for (const [index, transition] of transitions.entries()) {
      if (!valueSet.has(transition.to)) {
        ctx.addIssue({
          code: "custom",
          path: ["states", "transitions", index, "to"],
          message: `transition "${transition.name}".to "${transition.to}" is not one of states.values [${values.join(", ")}]`,
        });
      }
      for (const [fromIndex, from] of transition.from.entries()) {
        if (!valueSet.has(from)) {
          ctx.addIssue({
            code: "custom",
            path: ["states", "transitions", index, "from", fromIndex],
            message: `transition "${transition.name}".from "${from}" is not one of states.values [${values.join(", ")}]`,
          });
        }
      }
    }
  }

  if (meta.posting) {
    const transitionNames = new Set((meta.states?.transitions ?? []).map((t) => t.name));
    if (!transitionNames.has(meta.posting.onTransition)) {
      ctx.addIssue({
        code: "custom",
        path: ["posting", "onTransition"],
        message: `posting.onTransition "${meta.posting.onTransition}" does not name a declared states.transitions[].name`,
      });
    } else {
      const transition = meta.states!.transitions.find((t) => t.name === meta.posting!.onTransition)!;
      if (!transition.posting) {
        ctx.addIssue({
          code: "custom",
          path: ["posting", "onTransition"],
          message: `transition "${transition.name}" must have posting: true to be named by posting.onTransition`,
        });
      }
    }

    const debitCount = meta.posting.lines.filter((l) => l.side === "debit").length;
    const creditCount = meta.posting.lines.filter((l) => l.side === "credit").length;
    if (debitCount === 0 || creditCount === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["posting", "lines"],
        message: "posting.lines must include at least one debit line and one credit line",
      });
    }
  }

  for (const [index, ref] of (meta.childTables ?? []).entries()) {
    if (!fieldKeys.has(ref.field)) {
      ctx.addIssue({
        code: "custom",
        path: ["childTables", index, "field"],
        message: `childTables references field "${ref.field}", which is not declared in fields[]`,
      });
    }
  }
});

export type DoctypeMeta = z.infer<typeof DoctypeMetaSchemaBase>;
export type FieldOption = z.infer<typeof FieldOptionSchema>;
export type ListViewColumn = z.infer<typeof ListViewColumnSchema>;
export type ListViewFilter = z.infer<typeof ListViewFilterSchema>;
export type ListViewSummary = z.infer<typeof ListViewSummarySchema>;
export type StateTransition = z.infer<typeof StateTransitionSchema>;
export type States = z.infer<typeof StatesSchema>;
export type PostingRule = z.infer<typeof PostingRuleSchema>;
export type Permission = z.infer<typeof PermissionSchema>;

export function parseDoctypeMeta(input: unknown): DoctypeMeta {
  return DoctypeMetaSchema.parse(input);
}
