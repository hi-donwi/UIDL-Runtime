import { beforeAll, describe, expect, it } from "vitest";
import { execFileSync, execSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DocumentSchema } from "../../schemas/document.js";

describe("uidl-compile CLI binary", () => {
  const binPath = join(process.cwd(), "bin/compile.mjs");

  beforeAll(() => {
    const distPath = join(process.cwd(), "dist/uidl-runtime.js");
    if (!existsSync(distPath)) {
      execSync("npm run build", { stdio: "ignore" });
    }
  }, 120000);

  it("compiles a list recipe file to stdout", () => {
    const tempInput = join(tmpdir(), `test-recipe-${Date.now()}.json`);
    const recipeData = {
      recipe: "list",
      meta: {
        name: "customers",
        label: { en: "Customers", id: "Pelanggan" },
        titleField: "name",
        fields: [
          { key: "name", label: { en: "Name", id: "Nama" }, widget: "TextField" },
        ],
        columns: [{ field: "name" }],
        defaultSort: { field: "name", dir: "asc" },
      },
    };

    writeFileSync(tempInput, JSON.stringify(recipeData), "utf-8");

    try {
      const stdout = execFileSync("node", [binPath, tempInput, "--pretty"], {
        encoding: "utf-8",
      });

      const doc = JSON.parse(stdout);
      expect(doc.id).toBe("list-customers");
      expect(DocumentSchema.safeParse(doc).success).toBe(true);
    } finally {
      if (existsSync(tempInput)) unlinkSync(tempInput);
    }
  });

  it("compiles with --out flag to an output file", () => {
    const tempInput = join(tmpdir(), `test-recipe-in-${Date.now()}.json`);
    const tempOutput = join(tmpdir(), `test-recipe-out-${Date.now()}.json`);
    const recipeData = {
      recipe: "dashboard",
      meta: {
        name: "overview",
        label: { en: "Overview", id: "Ikhtisar" },
        kpis: [
          { label: { en: "Total", id: "Total" }, value: "100" },
        ],
      },
    };

    writeFileSync(tempInput, JSON.stringify(recipeData), "utf-8");

    try {
      execFileSync("node", [binPath, tempInput, "--out", tempOutput, "--pretty"], {
        encoding: "utf-8",
      });

      expect(existsSync(tempOutput)).toBe(true);
      const outputRaw = readFileSync(tempOutput, "utf-8");
      const doc = JSON.parse(outputRaw);
      expect(doc.id).toBe("dashboard-overview");
      expect(DocumentSchema.safeParse(doc).success).toBe(true);
    } finally {
      if (existsSync(tempInput)) unlinkSync(tempInput);
      if (existsSync(tempOutput)) unlinkSync(tempOutput);
    }
  });

  it("fails with exit code 1 if file does not exist", () => {
    expect(() => {
      execFileSync("node", [binPath, "non-existent-file.json"], {
        encoding: "utf-8",
        stdio: "pipe",
      });
    }).toThrow();
  });
});
