import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";

const stylesheet = readFileSync("dist/style.css", "utf8");
const fixtures = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", "e2e/fixtures/render-layout.ts"], { encoding: "utf8" })) as { pagination: string; light: string; dark: string; projected?: string };
// Common host integration: action-button styling must not turn a pager into a tall sliver.
const hostCss = ".meridian-ui button{min-height:40px;border:1px solid #64748b;border-radius:8px;background:#e2e8f0;color:#0f172a}";

function contrast(foreground: string, background: string): number {
  const luminance = (color: string) => {
    const values = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
  };
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

for (const width of [320, 768, 1440]) {
  test(`pagination retains square targets and aligned status at ${width}px under host CSS`, async ({ page }) => {
    await page.setViewportSize({ width, height: 600 });
    const html = fixtures.pagination;
    await page.setContent(`<style>${stylesheet}</style><style>${hostCss}</style>${html}`);
    const previous = page.getByRole("button", { name: "Previous page" });
    const bounds = await previous.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThanOrEqual(32);
    expect(Math.abs(bounds!.width - bounds!.height)).toBeLessThanOrEqual(1);
    const glyph = await previous.locator("svg").boundingBox();
    expect(glyph!.width).toBe(16);
    expect(glyph!.height).toBe(16);
    const next = await page.getByRole("button", { name: "Next page" }).boundingBox();
    expect(Math.abs(next!.y - bounds!.y)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await test.info().attach("pagination", { body: await page.screenshot(), contentType: "image/png" });
  });
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [320, 768, 1440]) {
    test(`administration form has bounded fields and separated actions at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.setContent(`<style>${stylesheet}</style>${fixtures[theme]}`);
      const name = await page.getByLabel("Name", { exact: true }).boundingBox();
      const email = await page.getByLabel("Owner email").boundingBox();
      expect(name!.width).toBeLessThanOrEqual(672);
      expect(email!.y - (name!.y + name!.height)).toBeGreaterThanOrEqual(16);
      const save = await page.getByRole("button", { name: "Save configuration" }).boundingBox();
      const reload = await page.getByRole("button", { name: "Reload configuration" }).boundingBox();
      const gap = reload!.y >= save!.y + save!.height
        ? reload!.y - (save!.y + save!.height)
        : reload!.x - (save!.x + save!.width);
      expect(gap).toBeGreaterThanOrEqual(8);
      expect(save!.height).toBeGreaterThanOrEqual(40);
      expect(save!.width).toBeLessThanOrEqual(260);
      const foreground = await page.getByText("Basic workspace details.", { exact: true }).evaluate(el => getComputedStyle(el).color);
      const background = await page.locator("main").evaluate(el => getComputedStyle(el).backgroundColor);
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("button", { name: "Save configuration" }).focus();
      expect(await page.getByRole("button", { name: "Save configuration" }).evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
      await test.info().attach("administration-form", { body: await page.screenshot(), contentType: "image/png" });
    });
  }
}

test("administration layout reflows with doubled text size on a narrow surface", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.setContent(`<style>${stylesheet}</style><style>html{font-size:200%}</style>${fixtures.light}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("line-table form composition can use the wider content region", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.setContent(`<style>${stylesheet}</style>${fixtures.light}`);
  const form = page.locator("form");
  await form.evaluate(el => el.classList.add("uidl-admin-form-wide"));
  expect((await form.boundingBox())!.width).toBeGreaterThan(672);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

if (fixtures.projected) {
  for (const width of [320, 768, 1440]) {
    test(`external synthetic projection retains bounded grouped fields at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.setContent(`<style>${stylesheet}</style>${fixtures.projected}`);
      const name = await page.getByLabel("Name", { exact: true }).boundingBox();
      const email = await page.getByLabel("Email", { exact: true }).boundingBox();
      expect(name!.width).toBeLessThanOrEqual(672);
      expect(email!.y - (name!.y + name!.height)).toBeGreaterThanOrEqual(16);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await test.info().attach("projected-form", { body: await page.screenshot(), contentType: "image/png" });
    });
  }
}
