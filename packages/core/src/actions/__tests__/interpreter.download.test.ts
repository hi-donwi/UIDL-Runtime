import { describe, expect, it, vi } from "vitest";
import { ActionInterpreter } from "../interpreter";
import { createEventBus } from "../eventBus";
import { createDocumentState } from "../../state/createDocumentState";
import type { DownloadResponse } from "../../types/actions";

function waitForDownloadResponse(bus: ReturnType<typeof createEventBus>) {
  return new Promise<DownloadResponse>((resolve) => {
    bus.on("download-response", (payload) => resolve(payload as DownloadResponse));
  });
}

describe("ActionInterpreter - download", () => {
  it("calls the host downloadHandler with event-resolved values and writes status/result", async () => {
    const store = createDocumentState({ download: {} });
    const bus = createEventBus();
    const downloadHandler = vi.fn().mockResolvedValue({ saved: true });
    const interpreter = new ActionInterpreter({
      stateStore: store.getState(),
      eventBus: bus,
      downloadHandler,
    });

    const responsePromise = waitForDownloadResponse(bus);
    interpreter.execute({
      download: {
        url: { $bind: "event.url" },
        filename: { $bind: "event.filename" },
        statusPath: "download.status",
        resultPath: "download.result",
        errorPath: "download.error",
      },
    }, {
      url: "https://reports.example.com/invoice-march.xlsx",
      filename: "invoice-march.xlsx",
    });

    expect(store.getState().state.download).toMatchObject({ status: "loading" });

    const response = await responsePromise;
    expect(downloadHandler).toHaveBeenCalledWith({
      url: "https://reports.example.com/invoice-march.xlsx",
      filename: "invoice-march.xlsx",
    });
    expect(response).toMatchObject({
      success: true,
      request: {
        url: "https://reports.example.com/invoice-march.xlsx",
        filename: "invoice-march.xlsx",
      },
      data: { saved: true },
    });
    expect(store.getState().state.download).toMatchObject({
      status: "success",
      result: { saved: true },
    });
  });

  it("is fail-closed without a downloadHandler: reports an error, never a silent no-op", async () => {
    const store = createDocumentState({ download: {} });
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({
      stateStore: store.getState(),
      eventBus: bus,
    });

    const responsePromise = waitForDownloadResponse(bus);
    const snackbars: { message: string; duration: number }[] = [];
    bus.on("snackbar", (payload) => snackbars.push(payload as { message: string; duration: number }));

    interpreter.execute({
      download: {
        url: "https://reports.example.com/invoice.xlsx",
        statusPath: "download.status",
        errorPath: "download.error",
      },
    });

    const response = await responsePromise;
expect(store.getState().state.download).toMatchObject({
      status: "error",
      error: expect.stringContaining('"download" actions are disabled by default'),
    });
    expect(response).toMatchObject({
      success: false,
      request: { url: "https://reports.example.com/invoice.xlsx" },
    });
    expect(snackbars[0]).toMatchObject({ duration: 5000 });
  });
});