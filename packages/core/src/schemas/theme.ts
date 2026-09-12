import { z } from "zod";
import type { Theme, ThemePreset, PrimitiveTokens, SemanticTokens } from "../types/theme";

export const TypographyTokenSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.string().optional(),
  fontWeight: z.union([z.number(), z.string()]).optional(),
  lineHeight: z.string().optional(),
  letterSpacing: z.string().optional(),
});

function responsiveValueSchema<T>(valueSchema: z.ZodType<T>) {
  return z.union([
    valueSchema,
    z.object({
      base: valueSchema.optional(),
    }).refine((obj) => Object.keys(obj).length > 0, {
      message: "Responsive value must have at least one breakpoint or base",
    }),
  ]);
}

export const StyleIntentSchema = z.object({
  gap: responsiveValueSchema(z.string()).optional(),
  padding: responsiveValueSchema(z.string()).optional(),
  paddingTop: responsiveValueSchema(z.string()).optional(),
  paddingRight: responsiveValueSchema(z.string()).optional(),
  paddingBottom: responsiveValueSchema(z.string()).optional(),
  paddingLeft: responsiveValueSchema(z.string()).optional(),
  margin: responsiveValueSchema(z.string()).optional(),
  marginTop: responsiveValueSchema(z.string()).optional(),
  marginRight: responsiveValueSchema(z.string()).optional(),
  marginBottom: responsiveValueSchema(z.string()).optional(),
  marginLeft: responsiveValueSchema(z.string()).optional(),
  width: responsiveValueSchema(z.string()).optional(),
  height: responsiveValueSchema(z.string()).optional(),
  minWidth: responsiveValueSchema(z.string()).optional(),
  maxWidth: responsiveValueSchema(z.string()).optional(),
  minHeight: responsiveValueSchema(z.string()).optional(),
  maxHeight: responsiveValueSchema(z.string()).optional(),
  flexDirection: responsiveValueSchema(
    z.enum(["row", "column", "row-reverse", "column-reverse"]),
  ).optional(),
  justifyContent: responsiveValueSchema(
    z.enum([
      "start",
      "center",
      "end",
      "space-between",
      "space-around",
      "space-evenly",
    ]),
  ).optional(),
  alignItems: responsiveValueSchema(
    z.enum(["start", "center", "end", "stretch", "baseline"]),
  ).optional(),
  display: responsiveValueSchema(z.string()).optional(),
  position: responsiveValueSchema(
    z.enum(["static", "relative", "absolute", "fixed", "sticky"]),
  ).optional(),
  inset: responsiveValueSchema(z.string()).optional(),
  top: responsiveValueSchema(z.string()).optional(),
  right: responsiveValueSchema(z.string()).optional(),
  bottom: responsiveValueSchema(z.string()).optional(),
  left: responsiveValueSchema(z.string()).optional(),
  zIndex: responsiveValueSchema(z.number()).optional(),
  background: responsiveValueSchema(z.string()).optional(),
  color: responsiveValueSchema(z.string()).optional(),
  fontSize: responsiveValueSchema(z.string()).optional(),
  fontWeight: responsiveValueSchema(z.union([z.number(), z.string()])).optional(),
  lineHeight: responsiveValueSchema(z.string()).optional(),
  letterSpacing: responsiveValueSchema(z.string()).optional(),
  borderRadius: responsiveValueSchema(z.string()).optional(),
  borderWidth: responsiveValueSchema(z.string()).optional(),
  borderColor: responsiveValueSchema(z.string()).optional(),
  shadow: responsiveValueSchema(z.string()).optional(),
  opacity: responsiveValueSchema(z.number()).optional(),
  typography: z.string().optional(),
});

export const ComponentVariantSchema = z.object({
  name: z.string(),
  props: z.record(z.string(), z.unknown()).optional(),
  style: StyleIntentSchema.optional(),
  className: z.string().optional(),
});

export const PrimitiveTokensSchema: z.ZodType<PrimitiveTokens> = z.object({
  color: z.record(z.string(), z.string()),
  spacing: z.record(z.string(), z.string()),
  radius: z.record(z.string(), z.string()),
  shadow: z.record(z.string(), z.string()),
  font: z.record(z.string(), z.string()),
  border: z.record(z.string(), z.string()),
});

export const SemanticTokensSchema: z.ZodType<SemanticTokens> = z.object({
  color: z.record(z.string(), z.string()),
  spacing: z.record(z.string(), z.string()),
  radius: z.record(z.string(), z.string()),
  shadow: z.record(z.string(), z.string()),
  typography: z.record(z.string(), TypographyTokenSchema),
});

export const ThemeSchema: z.ZodType<Theme> = z.object({
  id: z.string(),
  name: z.string(),
  mode: z.enum(["light", "dark"]),
  breakpoints: z.record(z.string(), z.string()),
  primitives: PrimitiveTokensSchema,
  semantics: SemanticTokensSchema,
  variants: z.record(z.string(), z.array(ComponentVariantSchema)),
});

export const ThemePresetSchema: z.ZodType<ThemePreset> = z.object({
  id: z.string(),
  label: z.string(),
  mode: z.enum(["light", "dark"]),
  theme: ThemeSchema,
});

export type ThemeInput = z.input<typeof ThemeSchema>;
export type ThemePresetInput = z.input<typeof ThemePresetSchema>;
