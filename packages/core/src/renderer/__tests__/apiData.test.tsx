import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createDocumentState } from "../../state/createDocumentState";
import { defaultLightTheme } from "../../theme/presets";
import type { UIDLDocument } from "../../types";
import { UIDocumentRenderer } from "../UIDocumentRenderer";

describe("API-backed data rendering", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads API data into state and rerenders DataTable and Chart rows", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.includes("/dashboard/revenue-trend")) {
        return new Response(JSON.stringify({
          rows: [
            { month: "Apr", value: 128000 },
            { month: "May", value: 164000 },
          ],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (href.includes("/dashboard/segments")) {
        return new Response(JSON.stringify({
          rows: [
            { segment: "Enterprise", revenue: "$238K" },
            { segment: "Mid Market", revenue: "$142K" },
          ],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("Not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const document: UIDLDocument = {
      version: "1.0.0",
      id: "api-dashboard",
      name: "API Dashboard",
      state: { api: { revenueTrend: { rows: [] }, segments: { rows: [] } } },
      root: {
        id: "root",
        type: "Column",
        children: [
          {
            id: "load-api",
            type: "Button",
            props: { label: "Load API Data" },
            events: {
              onClick: [
                { api: { method: "GET", url: "https://mock.uidl-runtime.local/dashboard/revenue-trend", dataSource: "api.revenueTrend" } },
                { api: { method: "GET", url: "https://mock.uidl-runtime.local/dashboard/segments", dataSource: "api.segments" } },
              ],
            },
          },
          {
            id: "api-chart",
            type: "Chart",
            props: {
              title: "API Revenue Trend",
              rows: { "$bind": "state.api.revenueTrend.rows" },
              xKey: "month",
              yKey: "value",
            },
          },
          {
            id: "api-table",
            type: "DataTable",
            props: {
              title: "API Segments",
              rows: { "$bind": "state.api.segments.rows" },
              columns: [
                { key: "segment", label: "Segment" },
                { key: "revenue", label: "Revenue", align: "right" },
              ],
            },
          },
        ],
      },
    };
    const stateStore = createDocumentState(document.state).getState();

    render(<UIDocumentRenderer
      document={document}
      theme={defaultLightTheme}
      stateStore={stateStore}
      apiAllowlist={["mock.uidl-runtime.local"]}
    />);

    fireEvent.click(screen.getByText("Load API Data"));

    await waitFor(() => {
      expect(screen.getByText("Enterprise")).toBeInTheDocument();
      expect(screen.getByText("Apr")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("$238K")).toBeInTheDocument();
    expect(stateStore.getValue("api.segments.rows")).toEqual([
      { segment: "Enterprise", revenue: "$238K" },
      { segment: "Mid Market", revenue: "$142K" },
    ]);
  });
});
