/**
 * Export shipped themes to conformance/themes/<name>.json.
 *
 * The TypeScript presets in packages/core/src/theme are the single source of truth for
 * theme token data. The generated JSON files under conformance/themes/ are what the
 * cross-platform conformance harnesses (Android, Flutter, Java) read so their theme-class
 * cases assert against the same data as the reference runtime.
 *
 * Regenerate deliberately after changing a preset: `pnpm export:themes`.
 * A vitest drift guard (packages/core/src/theme/__tests__/presets.export.test.ts) fails
 * when the exported files no longer mirror the presets.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultDarkTheme, defaultLightTheme } from "../packages/core/src/theme/presets";
import { meridianDarkTheme, meridianLightTheme } from "../packages/core/src/theme/meridianPreset";
import { serializeTheme } from "../packages/core/src/theme/serialize";

const themes = {
  "default-light": defaultLightTheme,
  "default-dark": defaultDarkTheme,
  "meridian-light": meridianLightTheme,
  "meridian-dark": meridianDarkTheme,
} as const;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "conformance", "themes");

mkdirSync(outDir, { recursive: true });
for (const [name, theme] of Object.entries(themes)) {
  writeFileSync(join(outDir, `${name}.json`), `${serializeTheme(theme)}\n`);
  console.log(`theme ok  ${name}.json`);
}
console.log(`exported ${Object.keys(themes).length} themes to conformance/themes/`);
