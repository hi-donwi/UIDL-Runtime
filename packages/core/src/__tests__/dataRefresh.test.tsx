import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { UIDocumentRenderer } from "../renderer/UIDocumentRenderer";
import { createDocumentState } from "../state/createDocumentState";
import type { DataAdapter } from "../data/types";
import type { UIDLDocument } from "../types";

describe("UIDocumentRenderer data refresh token", () => {
  it("re-runs unchanged queries when the host invalidates live data", async () => {
    const query = vi.fn(async () => ({ rows: [], total: 0, page: 1, pageSize: 20 }));
    const adapter = { query } as unknown as DataAdapter;
    const stateStore = createDocumentState().getState();
    const document: UIDLDocument = {
      version: "1.0.0",
      id: "refresh-test",
      name: "Refresh Test",
      dataSources: {
        items: { $query: { collection: "Invoice", page: { number: 1, size: 20 } } },
      },
      root: { id: "root", type: "Column", children: [] },
    };

    const view = render(
      <UIDocumentRenderer
        document={document}
        stateStore={stateStore}
        dataAdapter={adapter}
        dataRefreshToken={0}
      />,
    );

    await waitFor(() => expect(query).toHaveBeenCalledTimes(1));
    view.rerender(
      <UIDocumentRenderer
        document={document}
        stateStore={stateStore}
        dataAdapter={adapter}
        dataRefreshToken={1}
      />,
    );
    await waitFor(() => expect(query).toHaveBeenCalledTimes(2));
  });
});
