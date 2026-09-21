import { afterEach, describe, expect, it } from "vitest";
import { startMockHttpServer, type RunningMockHttpServer } from "../testing/mockHttpServer";

describe("mock http server health check", () => {
  let running: RunningMockHttpServer | undefined;

  afterEach(async () => {
    await running?.close();
    running = undefined;
  });

  it("responds 200 on GET {basePath}/health so process orchestrators (Playwright, CI) can poll readiness", async () => {
    running = await startMockHttpServer({ basePath: "/api" });

    const response = await fetch(`${running.url}/api/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });
});
