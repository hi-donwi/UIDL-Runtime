import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `uidl-runtime/recipes` is built from `compiler/index.ts` and promised to need nothing at run
 * time: no React, no zod, no package at all. A compiler, a server, or a CLI imports it to build
 * pages. This walks every value import reachable from that entry and fails on the first one
 * that would pull a package or a component file into the bundle.
 *
 * Type-only imports are erased by the build and are allowed.
 */

const compilerDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const entry = resolve(compilerDir, "index.ts");

/** The specifiers a module imports or re-exports as values. */
function valueImports(source: string): string[] {
  const specifiers: string[] = [];
  const statement = /^\s*(import|export)\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/gm;
  for (const match of source.matchAll(statement)) {
    const [, , typeOnly, clause, specifier] = match;
    if (typeOnly) continue;
    // `import { type A, type B } from` is type-only too, once every binding says so.
    const bindings = clause!.replace(/[{}]/g, "").split(",").map((b) => b.trim()).filter(Boolean);
    if (bindings.length > 0 && bindings.every((b) => b.startsWith("type "))) continue;
    specifiers.push(specifier!);
  }
  for (const match of source.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) specifiers.push(match[1]!);
  return specifiers;
}

function resolveModule(from: string, specifier: string): string | undefined {
  const base = resolve(dirname(from), specifier.replace(/\.js$/, ""));
  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

function reachableModules(): { modules: string[]; problems: string[] } {
  const seen = new Set<string>();
  const problems: string[] = [];
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (file.endsWith(".tsx")) problems.push(`${file} is a component file`);
    for (const specifier of valueImports(readFileSync(file, "utf8"))) {
      if (!specifier.startsWith(".")) {
        problems.push(`${file} imports the package '${specifier}'`);
        continue;
      }
      const resolved = resolveModule(file, specifier);
      if (!resolved) {
        problems.push(`${file} imports '${specifier}', which does not resolve`);
        continue;
      }
      queue.push(resolved);
    }
  }
  return { modules: [...seen], problems };
}

describe("uidl-runtime/recipes needs nothing at run time", () => {
  it("reaches no package and no component file from compiler/index.ts", () => {
    const { modules, problems } = reachableModules();
    expect(problems).toEqual([]);
    // The walk has to have actually walked: the entry, the recipes, and their helpers.
    expect(modules.length).toBeGreaterThan(8);
  });

  it("sees through a type-only import and catches a value import", () => {
    expect(valueImports(`import type { A } from "react";`)).toEqual([]);
    expect(valueImports(`import { type A, type B } from "react";`)).toEqual([]);
    expect(valueImports(`export type { A } from "react";`)).toEqual([]);
    expect(valueImports(`import { useState } from "react";`)).toEqual(["react"]);
    expect(valueImports(`import { type A, b } from "./b.js";`)).toEqual(["./b.js"]);
    expect(valueImports(`export { compileListPage } from "./list.js";`)).toEqual(["./list.js"]);
    expect(valueImports(`import "./style.css";`)).toEqual(["./style.css"]);
  });
});
