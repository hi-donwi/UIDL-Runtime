import { describe, expect, it } from "vitest";
import * as sdk from "../index";

/**
 * README dan arsitektur SDK ini menjanjikan satu seam data yang bisa diganti, dengan
 * perilaku setara antara mode in-memory dan HTTP. Sebelum test ini ada, hanya
 * `InMemoryAdapter` yang benar-benar diekspor paket publik — konsumen paket tidak punya
 * cara memakai mode HTTP sama sekali, meski adapternya ada di dalam repo.
 *
 * Test ini mengunci kedua adapter tetap menjadi bagian dari permukaan publik.
 */
describe("permukaan data publik", () => {
  it("mengekspor kedua adapter dan pabriknya", () => {
    expect(typeof sdk.createInMemoryAdapter).toBe("function");
    expect(typeof sdk.createHttpAdapter).toBe("function");
    expect(typeof sdk.InMemoryAdapter).toBe("function");
    expect(typeof sdk.HttpAdapter).toBe("function");
  });

  it("membuat HttpAdapter yang memenuhi bentuk DataAdapter", () => {
    const adapter = sdk.createHttpAdapter({ baseUrl: "https://example.test/api" });
    for (const method of ["query", "get", "create", "update", "remove", "transition", "report"] as const) {
      expect(typeof adapter[method]).toBe("function");
    }
  });
});
