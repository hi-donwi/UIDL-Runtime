import { z } from "zod";
import type { UIDLNode, DesignTokens } from "../types";
import { ThemePresetSchema } from "./theme";

export const ResponsiveValueSchema = z.record(z.string(), z.unknown());

export const VisibilitySchema = z.object({
  condition: z.unknown().optional(),
  breakpoints: z.array(z.enum(["mobile", "tablet", "desktop", "wide"])).optional(),
});

export const RepeatSchema = z.object({
  dataSource: z.union([z.array(z.unknown()), z.string()]).optional(),
  itemName: z.string().optional(),
  useIndex: z.boolean().optional(),
});

export const NodeSchema: z.ZodType<UIDLNode> = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  style: z.record(z.string(), z.unknown()).optional(),
  children: z.array(z.lazy(() => NodeSchema)).optional(),
  slots: z.record(z.string(), z.array(z.lazy(() => NodeSchema))).optional(),
  responsive: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("DEPRECATED: responsive overrides are migrating into style values. This field is preserved for backward compatibility only."),
  visibility: VisibilitySchema.optional(),
  bindings: z.record(z.string(), z.unknown()).optional(),
  events: z.record(z.string(), z.unknown()).optional(),
  repeat: RepeatSchema.optional(),
  ref: z.string().optional(),
  componentId: z.string().optional(),
  themeRef: z.string().optional(),
  testId: z.string().optional(),
});

export const ThemePresetsSchema = z.array(ThemePresetSchema);

export const DocumentSchema = z.object({
  $schema: z.string().optional(),
  version: z.string(),
  id: z.string(),
  name: z.string(),
  route: z.string().optional(),
  theme: z.string().optional(),
  state: z.record(z.string(), z.unknown()).optional(),
  // Each entry is either an inline array (resolved synchronously, as it always has been) or a
  // `{ "$query": { collection, filters, sort, page, search, fields } }` descriptor resolved
  // asynchronously against a DataAdapter by <UIDocumentRenderer />'s effect loop — see
  // state/dataSources.ts and .notes/plan/01-arsitektur-target.md §3. Left as z.unknown() rather
  // than a discriminated union so documents authored before this existed keep validating
  // unchanged; state/dataSources.ts's isQueryDataSource() is the actual runtime discriminator.
  dataSources: z.record(z.string(), z.unknown()).optional(),
  definitions: z.record(z.string(), NodeSchema).optional(),
  root: NodeSchema,
});

export const DesignTokensSchema: z.ZodType<DesignTokens> = z.object({
  color: z.record(z.string(), z.string()).optional(),
  font: z.record(z.string(), z.string()).optional(),
  spacing: z.record(z.string(), z.string()).optional(),
  radius: z.record(z.string(), z.string()).optional(),
  shadow: z.record(z.string(), z.unknown()).optional(),
});

export type DocumentInput = z.input<typeof DocumentSchema>;
export type NodeInput = z.input<typeof NodeSchema>;
export type ThemePresetsInput = z.input<typeof ThemePresetsSchema>;
