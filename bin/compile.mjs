#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { compilePage, CapabilityValidationError, DocumentSchema } from "../dist/uidl-runtime.js";

const args = process.argv.slice(2);

function printHelp() {
  console.log(`Usage: uidl-compile <recipe-input.json> [options]

Compile a high-level UIDL recipe into a validated UIDL document.

Options:
  --out <file.json>       Output file destination (default: stdout)
  --recipe <type>         Override recipe type (list, form, report, dashboard, settings, tree, wizard)
  --capabilities <file>   Host capabilities allowlist JSON
  --pretty                Format JSON output with 2-space indentation
  --help, -h              Show this help message

Examples:
  uidl-compile order-list.json --pretty
  uidl-compile order-form.json --out order-form.uidl.json --pretty
`);
}

if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
  printHelp();
  process.exit(args.length === 0 ? 1 : 0);
}

let inputFile = null;
let outputFile = null;
let recipeOverride = null;
let capabilitiesFile = null;
let pretty = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--out") {
    outputFile = args[++i];
  } else if (arg === "--recipe") {
    recipeOverride = args[++i];
  } else if (arg === "--capabilities") {
    capabilitiesFile = args[++i];
  } else if (arg === "--pretty") {
    pretty = true;
  } else if (!arg.startsWith("-") && !inputFile) {
    inputFile = arg;
  }
}

if (!inputFile) {
  console.error("Error: Input recipe file required.");
  process.exit(1);
}

let raw;
try {
  raw = readFileSync(inputFile, "utf-8");
} catch (err) {
  console.error(`Error reading ${inputFile}: ${err.message}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  console.error(`Error parsing ${inputFile} as JSON: ${err.message}`);
  process.exit(1);
}

let hostCaps = data.hostCapabilities;
if (capabilitiesFile) {
  try {
    const capsRaw = readFileSync(capabilitiesFile, "utf-8");
    hostCaps = JSON.parse(capsRaw);
  } catch (err) {
    console.error(`Error reading capabilities file ${capabilitiesFile}: ${err.message}`);
    process.exit(1);
  }
}

const recipe = recipeOverride || data.recipe;
if (!recipe) {
  console.error("Error: Recipe type must be specified either in the JSON ('recipe') or via --recipe flag.");
  process.exit(1);
}

const meta = data.meta || data;

// If capabilities not specified, construct permissive fallback matching the recipe
if (!hostCaps) {
  const coll = meta.name || "default";
  hostCaps = {
    collections: [coll],
    commands: [],
    mutationCollections: [coll],
  };
}

const compileInput = {
  recipe,
  meta,
  hostCapabilities: hostCaps,
  uiPolicy: data.uiPolicy,
  routePolicy: data.routePolicy,
  responsivePolicy: data.responsivePolicy,
  recordId: data.recordId,
  listRoute: data.listRoute,
  queryParams: data.queryParams,
};

let doc;
try {
  doc = compilePage(compileInput);
} catch (err) {
  if (err instanceof CapabilityValidationError) {
    console.error(`[ERROR] Capability Validation Error: ${err.message}`);
  } else {
    console.error(`[ERROR] Compilation Failed: ${err.message}`);
  }
  process.exit(1);
}

// Validate generated document against canonical DocumentSchema
const validation = DocumentSchema.safeParse(doc);
if (!validation.success) {
  console.error("[ERROR] Generated document failed DocumentSchema validation:");
  for (const issue of validation.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const outputJson = JSON.stringify(doc, null, pretty ? 2 : undefined);

if (outputFile) {
  try {
    writeFileSync(outputFile, outputJson, "utf-8");
    console.log(`[OK] Compiled ${recipe} recipe -> ${outputFile} (id: ${doc.id})`);
  } catch (err) {
    console.error(`Error writing output to ${outputFile}: ${err.message}`);
    process.exit(1);
  }
} else {
  process.stdout.write(outputJson + "\n");
}
