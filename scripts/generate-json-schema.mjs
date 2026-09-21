#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateJsonSchemas } from "../dist/uidl-runtime.js";

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/schema");
mkdirSync(outDir, { recursive: true });

for (const { filename, schema } of generateJsonSchemas()) {
  const filePath = path.join(outDir, filename);
  writeFileSync(filePath, `${JSON.stringify(schema, null, 2)}\n`);
  console.log(`Generated dist/schema/${filename}`);
}
