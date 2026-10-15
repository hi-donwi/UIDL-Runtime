import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "layout-contract.spec.tsx",
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/layout" }]],
  use: { channel: "chrome", trace: "retain-on-failure" },
  outputDir: "test-results/layout",
});
