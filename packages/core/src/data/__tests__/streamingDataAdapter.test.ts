import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { UIDocumentRenderer } from "../../renderer/UIDocumentRenderer";
import { createDocumentState } from "../../state/createDocumentState";
import type { DataAdapter, Query, QueryResult } from "../types";
import type { UIDLDocument } from "../../types";

describe("Streaming and Reactive DataAdapter", () => {
  it("subscribes to query and streams incoming records directly into document state store", async () => {
    let subscriberCallback: ((data: unknown) => void) | null = null;
    const unsubSpy = vi.fn();

    const mockAdapter: DataAdapter = {
      async query<T>(_q: Query): Promise<QueryResult<T>> {
        return { rows: [{ id: "1", value: "initial" }] as unknown as T[], total: 1, page: 1, pageSize: 20 };
      },
      async get() { return undefined; },
      async create() { throw new Error("not implemented"); },
      async update() { throw new Error("not implemented"); },
      async remove() { },
      async transition() { throw new Error("not implemented"); },
      async report<T>(_name: string, _params: Record<string, unknown>): Promise<T> { return {} as T; },
      subscribe(_q: Query, onData: (data: unknown) => void) {
        subscriberCallback = onData;
        return unsubSpy;
      },
    };

    const stateStore = createDocumentState({}).getState();

    const doc: UIDLDocument = {
      version: "1.0.0",
      id: "live-telemetry",
      name: "Live Telemetry",
      dataSources: {
        readings: {
          $query: {
            collection: "telemetry",
          },
        },
      },
      root: {
        id: "root-1",
        type: "Container",
        children: [
          {
            id: "status-text",
            type: "Text",
            props: { value: "Monitoring" },
          },
        ],
      },
    };

    const { unmount } = render(
      React.createElement(UIDocumentRenderer, {
        document: doc,
        dataAdapter: mockAdapter,
        stateStore: stateStore,
      })
    );

    // Initial query should resolve
    await waitFor(() => {
      expect(subscriberCallback).not.toBeNull();
    });

    // Simulate streaming SSE/WebSocket event
    subscriberCallback!({
      rows: [
        { id: "1", value: "initial" },
        { id: "2", value: "live-point-2" },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    });

    expect(stateStore.getValue("$data.readings.total")).toBe(2);
    expect(stateStore.getValue("$data.readings.rows")).toEqual([
      { id: "1", value: "initial" },
      { id: "2", value: "live-point-2" },
    ]);

    // Cleanup should trigger unsubscribe
    unmount();
    expect(unsubSpy).toHaveBeenCalled();
  });
});
