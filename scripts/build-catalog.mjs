#!/usr/bin/env node
/**
 * Publish the gallery: every document the manifest lists, validated, into dist/catalog/.
 *
 *   dist/catalog/gallery.json      metadata and every document inline, for a gallery UI
 *   dist/catalog/<id>.<lang>.json  one document, for a consumer that loads one at a time
 *
 * A document that does not validate fails the build, so the package never ships one.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { DocumentSchema } from "../dist/uidl-runtime.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const galleryDir = path.join(root, "packages/templates/src/catalog/gallery");
const outDir = path.join(root, "dist/catalog");
const manifest = JSON.parse(readFileSync(path.join(galleryDir, "gallery.json"), "utf8"));

mkdirSync(outDir, { recursive: true });
const failures = [];
const entries = manifest.entries.map((entry) => {
  const documents = {};
  const files = {};
  for (const [lang, file] of Object.entries(entry.locales)) {
    const document = JSON.parse(readFileSync(path.join(galleryDir, file), "utf8"));
    const parsed = DocumentSchema.safeParse(document);
    if (!parsed.success) {
      failures.push(`${entry.id} (${lang}): ${parsed.error.issues[0]?.message ?? "invalid"}`);
      continue;
    }
    const name = `${entry.id}.${lang}.json`;
    writeFileSync(path.join(outDir, name), `${JSON.stringify(document, null, 2)}\n`);
    documents[lang] = document;
    files[lang] = name;
  }
  const { locales: _locales, ...meta } = entry;
  return { ...meta, files, documents };
});

if (failures.length > 0) {
  console.error(`Catalog documents failed validation:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}

writeFileSync(
  path.join(outDir, "gallery.json"),
  `${JSON.stringify({ gallery: manifest.gallery, description: manifest.description, entries }, null, 2)}\n`,
);
console.log(`Generated dist/catalog/gallery.json with ${entries.length} entries`);
