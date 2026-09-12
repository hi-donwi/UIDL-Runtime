import { z } from "zod";
import { DocumentSchema, DesignTokensSchema, ThemePresetsSchema } from "../schemas/document";
import { ActionSchema } from "../schemas/actions";

export interface JsonSchemaExport {
  filename: string;
  id: string;
  schema: Record<string, unknown>;
}

const SCHEMA_BASE_URL = "https://uidl-runtime.local/schema";

function toJsonSchema(filename: string, zodSchema: z.ZodType): JsonSchemaExport {
  const id = `${SCHEMA_BASE_URL}/${filename}`;
  const schema = z.toJSONSchema(zodSchema, { target: "draft-2020-12" }) as Record<string, unknown>;
  schema.$id = id;
  return { filename, id, schema };
}

/**
 * Generates standalone JSON Schema (draft 2020-12) documents for every public
 * UIDL contract, so non-TypeScript hosts and AI agents can validate documents
 * without depending on this package's Zod schemas directly.
 */
export function generateJsonSchemas(): JsonSchemaExport[] {
  return [
    toJsonSchema("uidl-document.schema.json", DocumentSchema),
    toJsonSchema("action.schema.json", ActionSchema),
    toJsonSchema("theme-presets.schema.json", ThemePresetsSchema),
    toJsonSchema("design-tokens.schema.json", DesignTokensSchema),
  ];
}
