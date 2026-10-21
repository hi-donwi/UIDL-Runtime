import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { defaultDarkTheme, defaultLightTheme } from "../presets";
import { meridianDarkTheme, meridianLightTheme } from "../meridianPreset";

// The shipped presets are the single source of truth; conformance/themes/*.json is the
// generated, platform-neutral export every non-TS harness (Android, Flutter, Java) reads.
const shippedThemes: Record<string, unknown> = {
  "default-light": defaultLightTheme,
  "default-dark": defaultDarkTheme,
  "meridian-light": meridianLightTheme,
  "meridian-dark": meridianDarkTheme,
};

const themesDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../..", "conformance", "themes");

describe("conformance/themes export", () => {
  it("mirrors the shipped theme presets exactly", () => {
    const files = readdirSync(themesDir)
      .filter((entry) => entry.endsWith(".json"))
      .sort();
    expect(files).toEqual(
      Object.keys(shippedThemes)
        .map((name) => `${name}.json`)
        .sort(),
    );

    for (const [name, theme] of Object.entries(shippedThemes)) {
      const exported = JSON.parse(readFileSync(join(themesDir, `${name}.json`), "utf8"));
      expect(exported, `${name}.json is stale — regenerate with \`pnpm export:themes\``).toEqual(theme);
    }
  });
});
