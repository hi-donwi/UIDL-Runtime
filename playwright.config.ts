import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const webServerUrl = process.env.PLAYWRIGHT_WEB_SERVER_URL ?? baseURL;

// VITE_DATA_MODE=http proof: the same journey the mock adapter runs also runs
// against the real HTTP adapter + mock-server.mjs, with no change to the app under test —
// this config just starts a second process the app happens to talk to over the network.
const useHttpDataMode = process.env.PLAYWRIGHT_DATA_MODE === "http";
const mockApiUrl = process.env.PLAYWRIGHT_MOCK_API_URL ?? "http://127.0.0.1:8787";

export default defineConfig({
  testDir: "./e2e",
  // In http mode every worker shares one mock-server process (a real backend, not a
  // per-context localStorage sandbox), so parallel workers race each other's record-id
  // counters. Force serial execution only for that mode; mock mode stays parallel.
  fullyParallel: !useHttpDataMode,
  workers: useHttpDataMode ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: useHttpDataMode
    ? [
        {
          command: process.env.PLAYWRIGHT_MOCK_API_COMMAND ?? "npm run mock:api",
          url: `${mockApiUrl}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
        {
          command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? "npm run dev:reference:http",
          url: webServerUrl,
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
      ]
    : {
        command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? "npm run dev:reference",
        url: webServerUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.001 },
  },
});
