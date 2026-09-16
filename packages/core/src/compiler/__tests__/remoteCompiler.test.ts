import { describe, expect, it, vi } from "vitest";
import {
  createRemotePageCompiler,
  RemoteCompilerError,
} from "../remoteCompiler.js";
import type { CompilePageInput } from "../types.js";

describe("createRemotePageCompiler", () => {
  const sampleInput: CompilePageInput = {
    recipe: "list",
    meta: {
      name: "orders",
      label: { en: "Orders", id: "Pesanan" },
      titleField: "orderNumber",
      fields: [{ key: "orderNumber", label: { en: "Order #", id: "No" }, widget: "TextField" }],
      columns: [{ field: "orderNumber" }],
      defaultSort: { field: "orderNumber", dir: "desc" },
    },
    hostCapabilities: {
      collections: ["orders"],
      commands: [],
    },
  };

  it("calls /api/v1/compile with JSON payload and returns UIDL document", async () => {
    const mockDoc = {
      version: "1.0.0",
      id: "list-orders",
      name: "Orders",
      root: { id: "root", type: "Container" },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockDoc),
    });

    const client = createRemotePageCompiler({
      baseUrl: "http://localhost:8080",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const result = await client.compilePage(sampleInput);

    expect(result).toEqual(mockDoc);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/compile",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(sampleInput),
      }),
    );
  });

  it("calls /api/v1/validate and returns validation issues", async () => {
    const mockValidateRes = {
      valid: false,
      issues: [
        { code: "unknown_collection", path: "meta.name", message: "collection not allowed" },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockValidateRes),
    });

    const client = createRemotePageCompiler({
      baseUrl: "http://localhost:8080",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const result = await client.validate(sampleInput);

    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/validate",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("calls /api/v1/health and returns status UP", async () => {
    const mockHealth = {
      status: "UP",
      service: "uidl-server",
      version: "1.0.0",
      recipes: ["list", "form", "report", "dashboard", "settings", "tree", "wizard"],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockHealth),
    });

    const client = createRemotePageCompiler({
      baseUrl: "http://localhost:8080",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const result = await client.health();

    expect(result.status).toBe("UP");
    expect(result.recipes).toContain("list");
  });

  it("throws RemoteCompilerError on 400 Bad Request", async () => {
    const errorBody = {
      code: "MISSING_RECIPE",
      message: "Required field 'recipe' is missing",
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify(errorBody),
    });

    const client = createRemotePageCompiler({
      baseUrl: "http://localhost:8080",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    await expect(client.compilePage(sampleInput)).rejects.toThrow(RemoteCompilerError);

    try {
      await client.compilePage(sampleInput);
    } catch (err) {
      expect(err).toBeInstanceOf(RemoteCompilerError);
      const remoteErr = err as RemoteCompilerError;
      expect(remoteErr.status).toBe(400);
      expect(remoteErr.code).toBe("MISSING_RECIPE");
      expect(remoteErr.message).toBe("Required field 'recipe' is missing");
    }
  });
});
