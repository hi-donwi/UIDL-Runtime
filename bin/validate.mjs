#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { DocumentSchema } from "../dist/uidl-runtime.js";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: uidl-validate <file.json> [<file2.json> ...]");
  process.exit(1);
}

let hasError = false;
for (const filePath of args) {
  let raw;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch (err) {
    console.error(`✗ ${filePath}: cannot read file (${err.message})`);
    hasError = true;
    continue;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`✗ ${filePath}: invalid JSON (${err.message})`);
    hasError = true;
    continue;
  }

  const result = DocumentSchema.safeParse(parsed);
  if (result.success) {
    console.log(`✓ ${filePath}`);
  } else {
    console.error(`✗ ${filePath}`);
    for (const issue of result.error.issues) {
      const issuePath = issue.path.join(".") || "(root)";
      console.error(`  - ${issuePath}: ${issue.message}`);
    }
    hasError = true;
  }
}

process.exit(hasError ? 1 : 0);
