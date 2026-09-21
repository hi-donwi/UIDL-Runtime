import { test, expect } from "@playwright/test";

/**
 * Real-browser visual regression coverage for the three complete reference suite drafts (see
 * docs/product/json-first-ai-ui-product-notes.md "Recommended Next Product Slices"). Each suite
 * already has a jsdom mount-and-assert test in src/renderer/__tests__/universalExamples.test.tsx
 * — this suite proves the same documents also render correctly in a real browser (real Tailwind
 * cascade, real fonts/layout, no jsdom approximations) and stay visually stable over time via
 * Playwright's screenshot diffing.
 *
 * Baselines live in e2e/visual-regression.spec.ts-snapshots/ and are committed to the repo.
 * Regenerate them deliberately (a real, reviewed visual change) with:
 *   npm run test:reference:update
 */

const suites = [
  {
    id: "saas-growth-suite",
    expectedText: "MeridianCRM Launch Suite",
  },
  {
    id: "finance-ops-suite",
    expectedText: "Finance Operations Suite",
  },
  {
    id: "knowledge-pack-suite",
    expectedText: "Knowledge Pack Suite",
  },
] as const;

for (const suite of suites) {
  test(`${suite.id} renders with no console errors and matches its visual baseline`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (error) => {
      consoleErrors.push(error.message);
    });

    await page.goto(`/visual-regression.html?doc=${suite.id}`);
    await expect(page.getByText(suite.expectedText).first()).toBeVisible();

    expect(consoleErrors, `console errors on ${suite.id}: ${consoleErrors.join("\n")}`).toEqual([]);

    await expect(page).toHaveScreenshot(`${suite.id}.png`, { fullPage: true });
  });
}
