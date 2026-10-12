import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DocumentSchema } from "@uidl-runtime/core";

/**
 * The gallery is the one copy of every ready-made document a gallery UI shows (Kerangka
 * ADR-0043). UIDL-Builder used to keep its own copies, which drifted; it now reads this, as
 * published at `uidl-runtime/catalog/gallery.json`.
 */

const galleryDir = resolve(dirname(fileURLToPath(import.meta.url)), "../gallery");
const manifest = JSON.parse(readFileSync(join(galleryDir, "gallery.json"), "utf8")) as {
  entries: Array<{ id: string; name: string; category: string; description: string; tags: string[]; locales: Record<string, string> }>;
};

describe("the gallery manifest", () => {
  it("lists each entry once, with an English document and gallery metadata", () => {
    const ids = manifest.entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of manifest.entries) {
      expect(entry.locales.en, `${entry.id} has no English document`).toBeDefined();
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(["industry", "dashboard", "form", "website"]).toContain(entry.category);
    }
  });

  it("points only at documents that exist and validate", () => {
    for (const entry of manifest.entries) {
      for (const [lang, file] of Object.entries(entry.locales)) {
        const path = join(galleryDir, file);
        expect(existsSync(path), `${entry.id} (${lang}): ${file} is missing`).toBe(true);
        const parsed = DocumentSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
        expect(parsed.success, `${entry.id} (${lang}) does not validate`).toBe(true);
      }
    }
  });

  it("leaves no gallery document unlisted", () => {
    const listed = new Set(manifest.entries.flatMap((e) => Object.values(e.locales)));
    const unlisted = readdirSync(galleryDir).filter((f) => f.endsWith(".json") && f !== "gallery.json" && !listed.has(f));
    expect(unlisted).toEqual([]);
  });
});
