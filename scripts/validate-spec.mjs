#!/usr/bin/env node
/**
 * Spec validation script.
 *
 * - Compiles every *.schema.json under spec/schema/ and conformance/schema/ (draft 2020-12).
 * - Validates every real shipped document against document.schema.json.
 * - Validates every conformance case against the case schema.
 *
 * Zero network: it only parses identifiers. Exit 1 on the first failure.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const scan = (dir, suffix) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...scan(full, suffix));
    else if (entry.endsWith(suffix)) out.push(full);
  }
  return out;
};

const scanJson = (dir) => scan(dir, ".json");

const load = (file) => JSON.parse(readFileSync(file, "utf8"));

const sherpa = new Ajv2020({ strict: true, allErrors: true, allowUnionTypes: true });
const errors = [];
const schemaFiles = [...scan(join(root, "spec", "schema"), ".schema.json"), ...scan(join(root, "conformance", "schema"), ".schema.json")];
for (const schemaFile of schemaFiles) {
  const schema = load(schemaFile);
  try {
    sherpa.addSchema(schema);
  } catch (error) {
    errors.push(`schema load failed for ${basename(schemaFile)}:\n  ${error.message}`);
  }
}
for (const schemaFile of schemaFiles) {
  const schema = load(schemaFile);
  try {
    if (!sherpa.getSchema(schema.$id)) {
      errors.push(`schema compile failure for ${basename(schemaFile)}: not registered`);
    } else {
      console.log(`schema ok  ${basename(schemaFile)}`);
    }
  } catch (error) {
    errors.push(`schema compile failed for ${schemaFile}:\n  ${error.message}`);
  }
}

const documentSchema = join(root, "spec", "schema", "document.schema.json");
const validateDocument = sherpa.getSchema("https://uidl.dev/schema/v1/document.schema.json");
const templateDocs = scanJson(join(root, "packages", "templates", "src", "documents"));
for (const docFile of templateDocs) {
  const doc = load(docFile);
  if (!validateDocument(doc)) {
    errors.push(
      `document invalid ${docFile}:\n  ${validateDocument.errors.map((e) => `${e.instancePath} ${e.message}`).join("\n  ")}`,
    );
  } else {
    console.log(`document ok ${basename(docFile)}`);
  }
}
if (errors.length === 0) console.log(`all ${templateDocs.length} documents validate against document.schema.json`);

const caseSchema = join(root, "conformance", "schema", "conformance-case.schema.json");
const validateCase = sherpa.getSchema("https://uidl.dev/schema/v1/conformance-case.schema.json");
let caseCount = 0;
for (const glob of scanJson(join(root, "conformance", "cases"))) {
  const data = load(glob);
  if (!validateCase(data)) {
    errors.push(`case invalid ${glob}: ${validateCase.errors.map((e) => `${e.instancePath} ${e.message}`).join(", ")}`);
  } else caseCount += 1;
}
if (errors.length === 0) console.log(`conformance: ${caseCount} cases validated`);

if (errors.length > 0) {
  console.error(`\n[schema-validate] ${errors.length} problem(s)`);
  for (const error of errors) console.error(error);
  process.exit(1);
}
console.log("validate:spec OK");