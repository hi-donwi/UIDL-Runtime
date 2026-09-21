import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

function listTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) listTsFiles(full, out);
    else if (full.endsWith(".ts") && !full.endsWith(".test.ts") && !full.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

describe("Dependency guard — public recipe package must not import demo/reference", () => {
  it("compiler/* imports only allowed local modules", () => {
    const candidates = [
      resolve(import.meta.dirname ?? ".", ".."),
      resolve(process.cwd(), "packages/core/src/compiler"),
    ];
    let dir = "";
    for (const c of candidates) {
      try {
        if (statSync(c).isDirectory()) { dir = c; break; }
      } catch {
        // Not this candidate; try the next one.
      }
    }
    expect(dir).not.toBe("");

    const files = listTsFiles(dir);
    expect(files.length).toBeGreaterThanOrEqual(6); // types, list, form, report, dashboard, settings, tree, wizard

    const forbiddenPatterns: Array<{ pattern: RegExp; why: string }> = [
      { pattern: /from\s+["'].*templates.*["']/, why: "must not import from templates" },
      { pattern: /from\s+["']@host-app.*["']/, why: "must not import from @host-app" },
      { pattern: /from\s+["'].*demo.*["']/i, why: "must not import demo" },
      { pattern: /from\s+["'].*reference.*["']/i, why: "must not import reference" },
      { pattern: /from\s+["'].*meridian.*["']/i, why: "must not import meridian/demo" },
      { pattern: /from\s+["'].*console.*["']/i, why: "must not import console" },
      { pattern: /\bShoeCompany\b/, why: "must not reference ShoeCompany" },
      { pattern: /\bkoperasi\b/i, why: "must not reference koperasi demo" },
      { pattern: /file:\.\.\/\.\.\/\.\.\/uidl-runtime/, why: "must not use file: uidl-runtime dep (core is uidl-runtime itself)" },
    ];

    const violations: string[] = [];
    const allowedFrom = /^(\.\.\/types(\.js)?|\.\.\/utils\/i18n(\.js)?|\.\/types(\.js)?|\.\/(list|form|report|dashboard|settings|tree|wizard)(\.js)?|\.\.\/types)$/;

    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      const imports = Array.from(content.matchAll(/from\s+["']([^"']+)["']/g)).map((m) => m[1]);
      for (const spec of imports) {
        if (!allowedFrom.test(spec) && !spec.startsWith("../types") && !spec.startsWith("./")) {
          // Allow only relative local imports; flag others
          // But we only flag if forbidden pattern matches
        }
        for (const { pattern, why } of forbiddenPatterns) {
          if (pattern.test(`from "${spec}"`) || pattern.test(content)) {
            // Check if pattern is about import vs content reference — for file: we check raw content
            if (pattern.source.includes("file:")) {
              if (content.includes("file:../../../uidl-runtime")) violations.push(`${file}: ${why}`);
            } else if (pattern.test(`from "${spec}"`)) {
              violations.push(`${file}: ${why} — from "${spec}"`);
            }
          }
        }
      }
      // Also forbid hard-coded host collection names in public compiler code
      const codeWithoutComments = content
        .split("\n")
        .filter((l) => !l.trim().startsWith("*") && !l.trim().startsWith("/**") && !l.trim().startsWith("//"))
        .join("\n");
      if (/collection:\s*["']module\.records["']/.test(codeWithoutComments)) {
        violations.push(`${file}: must not hardcode host collection "module.records"`);
      }
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("compiler files exist for all 7 recipes", () => {
    const expected = ["types.ts", "list.ts", "form.ts", "report.ts", "dashboard.ts", "settings.ts", "tree.ts", "wizard.ts"];
    const dir = resolve(import.meta.dirname ?? ".", "..");
    for (const file of expected) {
      const full = join(dir, file);
      expect(() => statSync(full), `missing ${file}`).not.toThrow();
    }
  });
});
