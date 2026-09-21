import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import { generateJsonSchemas } from "../jsonSchema";
import websiteLanding from "../../../../../packages/templates/src/documents/website-landing.json";
import dashboardAnalytics from "../../../../../packages/templates/src/documents/dashboard-analytics.json";
import slideDeck from "../../../../../packages/templates/src/documents/slide-deck.json";

describe("generateJsonSchemas", () => {
  const schemas = generateJsonSchemas();

  it("produces one draft-2020-12 schema per public contract", () => {
    const filenames = schemas.map((entry) => entry.filename);
    expect(filenames).toEqual([
      "uidl-document.schema.json",
      "action.schema.json",
      "theme-presets.schema.json",
      "design-tokens.schema.json",
    ]);
    for (const entry of schemas) {
      expect(entry.schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
      expect(entry.schema.$id).toBe(`https://uidl-runtime.local/schema/${entry.filename}`);
    }
  });

  it("keeps UIDLDocument's recursive node tree as a $ref, not an inlined infinite structure", () => {
    const documentSchema = schemas.find((entry) => entry.filename === "uidl-document.schema.json")!;
    const rootRef = (documentSchema.schema.properties as Record<string, { $ref?: string }>).root.$ref;
    expect(rootRef).toBeDefined();
    expect(documentSchema.schema.$defs).toBeTruthy();
  });

  it("validates real catalog documents with a standard JSON Schema validator (ajv)", () => {
    const documentSchema = schemas.find((entry) => entry.filename === "uidl-document.schema.json")!;
    const ajv = new Ajv2020({ strict: false });
    const validate = ajv.compile(documentSchema.schema);

    for (const doc of [websiteLanding, dashboardAnalytics, slideDeck]) {
      const valid = validate(doc);
      expect(valid, JSON.stringify(validate.errors)).toBe(true);
    }
  });

  it("rejects a document missing a required field (proves the schema is actually strict, not accept-anything)", () => {
    const documentSchema = schemas.find((entry) => entry.filename === "uidl-document.schema.json")!;
    const ajv = new Ajv2020({ strict: false });
    const validate = ajv.compile(documentSchema.schema);

    const invalid = { version: "1.0", id: "doc-1", name: "Missing root" };
    expect(validate(invalid)).toBe(false);
  });

  it("exports the mutate action contract in the public action JSON Schema", () => {
    const actionSchema = schemas.find((entry) => entry.filename === "action.schema.json")!;
    const ajv = new Ajv2020({ strict: false });
    const validate = ajv.compile(actionSchema.schema);

    const valid = validate({
      mutate: {
        operation: "create",
        collection: "SalesInvoice",
        payload: { customer: "Andalan" },
        resultPath: "mutation.result",
        errorPath: "mutation.error",
        fieldErrorsPath: "mutation.fieldErrors",
        statusPath: "mutation.status",
        onSuccess: { navigate: { route: "/app/shoe-company/list/SalesInvoice" } },
      },
    });

    expect(valid, JSON.stringify(validate.errors)).toBe(true);
  });

  it("rejects malformed mutate actions in the public action JSON Schema", () => {
    const actionSchema = schemas.find((entry) => entry.filename === "action.schema.json")!;
    const ajv = new Ajv2020({ strict: false });
    const validate = ajv.compile(actionSchema.schema);

    const invalid = validate({
      mutate: {
        operation: "submit",
        collection: "SalesInvoice",
      },
    });

    expect(invalid).toBe(false);
  });
});
