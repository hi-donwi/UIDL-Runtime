import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  findRuntimeMessageCatalog,
  formatMessage,
  resolveRuntimeMessages,
  runtimeMessageCatalogs,
  runtimeMessagesEn,
  runtimeMessagesId,
} from "../runtimeMessages";

const placeholders = (template: string) => [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("runtime message catalogs", () => {
  it("define the same keys, all non-empty strings", () => {
    const enKeys = Object.keys(runtimeMessagesEn).sort();
    for (const [locale, catalog] of Object.entries(runtimeMessageCatalogs)) {
      expect(Object.keys(catalog).sort(), locale).toEqual(enKeys);
      for (const [key, value] of Object.entries(catalog)) {
        expect(typeof value === "string" && value.trim().length > 0, `${locale}.${key}`).toBe(true);
      }
    }
  });

  it("keep each template's placeholders identical across languages", () => {
    for (const [locale, catalog] of Object.entries(runtimeMessageCatalogs)) {
      for (const key of Object.keys(runtimeMessagesEn) as Array<keyof typeof runtimeMessagesEn>) {
        expect(placeholders(catalog[key]), `${locale}.${key}`).toEqual(placeholders(runtimeMessagesEn[key]));
      }
    }
  });

  it("are frozen so a host cannot mutate the shared defaults", () => {
    expect(Object.isFrozen(runtimeMessagesEn)).toBe(true);
    expect(Object.isFrozen(runtimeMessagesId)).toBe(true);
    expect(Object.isFrozen(runtimeMessageCatalogs)).toBe(true);
  });

  it("stay importable without React (the module imports nothing)", () => {
    const source = readFileSync(resolve(__dirname, "../runtimeMessages.ts"), "utf8");
    expect(source).not.toMatch(/^\s*import\s/m);
  });
});

describe("findRuntimeMessageCatalog", () => {
  it("matches the exact tag, then the primary language subtag", () => {
    expect(findRuntimeMessageCatalog("id")).toBe(runtimeMessagesId);
    expect(findRuntimeMessageCatalog("id-ID")).toBe(runtimeMessagesId);
    expect(findRuntimeMessageCatalog("ID_id")).toBe(runtimeMessagesId);
    expect(findRuntimeMessageCatalog("en-GB")).toBe(runtimeMessagesEn);
  });

  it("returns undefined for an unset or unknown language", () => {
    expect(findRuntimeMessageCatalog(undefined)).toBeUndefined();
    expect(findRuntimeMessageCatalog("  ")).toBeUndefined();
    expect(findRuntimeMessageCatalog("fr-FR")).toBeUndefined();
  });
});

describe("resolveRuntimeMessages", () => {
  it("defaults to English", () => {
    expect(resolveRuntimeMessages()).toEqual(runtimeMessagesEn);
  });

  it("selects the locale catalog and applies overrides on top", () => {
    const resolved = resolveRuntimeMessages("id", { closeDrawer: "Tutup formulir" });
    expect(resolved.closeDrawer).toBe("Tutup formulir");
    expect(resolved.nextPage).toBe(runtimeMessagesId.nextPage);
  });

  it("falls back to the base for a language without a catalog", () => {
    expect(resolveRuntimeMessages("fr", undefined, runtimeMessagesId)).toEqual(runtimeMessagesId);
    expect(resolveRuntimeMessages("fr")).toEqual(runtimeMessagesEn);
  });

  it("ignores empty, non-string and unknown overrides", () => {
    const loose = { close: "", nextPage: 3, unknownKey: "x" } as unknown as Parameters<typeof resolveRuntimeMessages>[1];
    const resolved = resolveRuntimeMessages("en", loose);
    expect(resolved.close).toBe("Close");
    expect(resolved.nextPage).toBe("Next page");
    expect("unknownKey" in resolved).toBe(false);
  });

  it("returns a fresh object, leaving the catalog untouched", () => {
    const resolved = resolveRuntimeMessages("en", { close: "Done" });
    expect(resolved).not.toBe(runtimeMessagesEn);
    expect(runtimeMessagesEn.close).toBe("Close");
  });
});

describe("formatMessage", () => {
  it("fills named placeholders", () => {
    expect(formatMessage("Page {page} of {pages}", { page: 2, pages: 5 })).toBe("Page 2 of 5");
  });

  it("leaves a placeholder without a value visible", () => {
    expect(formatMessage("Open row {row}")).toBe("Open row {row}");
  });

  it("does not read inherited properties", () => {
    expect(formatMessage("{toString}", {})).toBe("{toString}");
  });
});
