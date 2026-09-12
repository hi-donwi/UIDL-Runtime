import { z } from "zod";
import type { Action } from "../types/actions";

const SetStateActionSchema = z.object({
  setState: z.object({
    path: z.string(),
    value: z.unknown(),
  }),
});

const NavigateActionSchema = z.object({
  navigate: z.object({
    route: z.union([z.string(), z.record(z.string(), z.unknown())]),
  }),
});

const ApiActionSchema = z.object({
  api: z.object({
    url: z.string(),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]),
    body: z.record(z.string(), z.unknown()).optional(),
    dataSource: z.string().optional(),
  }),
});

const BoundActionValueSchema = z.object({ $bind: z.string() });
const ExprActionValueSchema = z.object({ $expr: z.unknown() });
const ResolvableStringSchema = z.union([z.string(), BoundActionValueSchema, ExprActionValueSchema]);
const ResolvableIdSchema = z.union([z.string(), z.number(), BoundActionValueSchema, ExprActionValueSchema]);
const ResolvableRecordSchema = z.union([
  z.record(z.string(), z.unknown()),
  BoundActionValueSchema,
  ExprActionValueSchema,
]);
const ResolvableNumberSchema = z.union([z.number(), BoundActionValueSchema, ExprActionValueSchema]);

const MutationActionSchema = z.object({
  mutate: z.object({
    operation: z.enum(["create", "update", "delete", "transition"]),
    collection: ResolvableStringSchema,
    id: ResolvableIdSchema.optional(),
    payload: ResolvableRecordSchema.optional(),
    transition: ResolvableStringSchema.optional(),
    version: ResolvableNumberSchema.optional(),
    resultPath: z.string().optional(),
    errorPath: z.string().optional(),
    fieldErrorsPath: z.string().optional(),
    statusPath: z.string().optional(),
    onSuccess: z.lazy(() => ActionSchema).optional(),
    onError: z.lazy(() => ActionSchema).optional(),
  }),
});

const CommandActionSchema = z.object({
  command: z.object({
    name: ResolvableStringSchema,
    payload: ResolvableRecordSchema.optional(),
    resultPath: z.string().optional(),
    errorPath: z.string().optional(),
    statusPath: z.string().optional(),
    onSuccess: z.lazy(() => ActionSchema).optional(),
    onError: z.lazy(() => ActionSchema).optional(),
  }),
});

const ShowSnackbarActionSchema = z.object({
  showSnackbar: z.object({
    message: z.string(),
    duration: z.number().optional(),
  }),
});

const ShowDialogActionSchema = z.object({
  showDialog: z.object({
    title: z.string(),
    content: z.string(),
  }),
});

const ValidateActionSchema = z.object({
  validate: z.object({
    fields: z.array(z.string()),
  }),
});

const SequenceActionSchema = z.object({
  sequence: z.array(z.lazy(() => ActionSchema)),
});

const IfActionSchema = z.object({
  if: z.object({
    condition: z.record(z.string(), z.unknown()),
    then: z.lazy(() => ActionSchema),
    else: z.lazy(() => ActionSchema).optional(),
  }),
});

export const ActionSchema: z.ZodType<Action> = z.union([
  SetStateActionSchema,
  NavigateActionSchema,
  ApiActionSchema,
  MutationActionSchema,
  CommandActionSchema,
  ShowSnackbarActionSchema,
  ShowDialogActionSchema,
  ValidateActionSchema,
  SequenceActionSchema,
  IfActionSchema,
]);

export const ActionsSchema = z.array(ActionSchema);

export type ActionInput = z.input<typeof ActionSchema>;
