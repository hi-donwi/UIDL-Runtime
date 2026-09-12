import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { useCollection, useRecord, useMutation } from "../useData";
import { useSession } from "../useSession";
import { useLanguage } from "../useLanguage";

const INITIAL_INVOICES = [
  { id: "SINV-001", customer: "PT Andalan", status: "Draft", total: 1000000 },
  { id: "SINV-002", customer: "CV Makmur", status: "Unpaid", total: 2500000 },
  { id: "SINV-003", customer: "PT Sinar", status: "Paid", total: 5000000 },
];

describe("Domain Hooks · useCollection", () => {
  it("fetches rows, supports filtering, sorting, and pagination", async () => {
    const adapter = createInMemoryAdapter({
      seed: { SalesInvoice: [...INITIAL_INVOICES] },
    });

    const { result } = renderHook(() =>
      useCollection("SalesInvoice", { adapter, initialQuery: { page: { number: 1, size: 2 } } }),
    );

    // Initial fetch completes
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.rows.length).toBe(2);
    expect(result.current.total).toBe(3);

    // Set filter
    await act(async () => {
      result.current.setFilter("status", "eq", "Paid");
    });
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.rows.length).toBe(1);
    expect(result.current.rows[0].customer).toBe("PT Sinar");
  });
});

describe("Domain Hooks · useRecord", () => {
  it("fetches record, tracks dirty state, resets, and saves updates", async () => {
    const adapter = createInMemoryAdapter({
      seed: { SalesInvoice: [...INITIAL_INVOICES] },
    });

    const { result } = renderHook(() =>
      useRecord("SalesInvoice", "SINV-001", { adapter }),
    );

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.record?.customer).toBe("PT Andalan");
    expect(result.current.isDirty).toBe(false);

    // Modify field
    act(() => {
      result.current.setField("customer", "PT Andalan Baru");
    });

    expect(result.current.draft.customer).toBe("PT Andalan Baru");
    expect(result.current.isDirty).toBe(true);

    // Reset
    act(() => {
      result.current.reset();
    });
    expect(result.current.draft.customer).toBe("PT Andalan");
    expect(result.current.isDirty).toBe(false);

    // Edit and save
    act(() => {
      result.current.setField("total", 1200000);
    });
    await act(async () => {
      await result.current.save();
    });

    expect(result.current.record?.total).toBe(1200000);
    expect(result.current.isDirty).toBe(false);

    const updatedInAdapter = await adapter.get("SalesInvoice", "SINV-001");
    expect(updatedInAdapter?.record.total).toBe(1200000);
  });
});

describe("Domain Hooks · useMutation", () => {
  it("handles create, update, and optimistic rollback on failure", async () => {
    const adapter = createInMemoryAdapter({
      seed: { SalesInvoice: [...INITIAL_INVOICES] },
    });

    const { result } = renderHook(() => useMutation({ adapter }));

    // Create
    let created: unknown;
    await act(async () => {
      created = await result.current.create("SalesInvoice", {
        customer: "PT Baru",
        status: "Draft",
        total: 800000,
      });
    });

    expect(created).toHaveProperty("id");

    // Failure with rollback
    const failingAdapter = createInMemoryAdapter({
      failureRate: 1, // 100% failure rate
      seed: { SalesInvoice: [...INITIAL_INVOICES] },
    });

    const { result: failingMutation } = renderHook(() =>
      useMutation({ adapter: failingAdapter }),
    );

    let rows = [...INITIAL_INVOICES];
    const setRows = (next: typeof rows | ((prev: typeof rows) => typeof rows)) => {
      rows = typeof next === "function" ? next(rows) : next;
    };

    let errorThrown = false;
    await act(async () => {
      try {
        await failingMutation.current.update(
          "SalesInvoice",
          "SINV-001",
          { total: 9999999 },
          rows,
          setRows as never,
        );
      } catch {
        errorThrown = true;
      }
    });

    expect(errorThrown).toBe(true);
    // Rolled back to original
    expect(rows.find((r) => r.id === "SINV-001")?.total).toBe(1000000);
  });
});

describe("Domain Hooks · useSession", () => {
  it("manages role switching, permissions resolution, and disclaimer", () => {
    const { result } = renderHook(() => useSession("Accounts User"));

    expect(result.current.role).toBe("Accounts User");
    expect(result.current.session.roles).toContain("Accounts User");
    expect(result.current.hasPermission("accounts.read")).toBe(true);
    expect(result.current.hasPermission("accounts.submit")).toBe(false);
    expect(result.current.disclaimer).toContain("UI gating");

    // Switch role to Accounts Manager
    act(() => {
      result.current.setRole("Accounts Manager");
    });

    expect(result.current.role).toBe("Accounts Manager");
    expect(result.current.hasPermission("accounts.submit")).toBe(true);
  });
});

describe("Domain Hooks · useLanguage", () => {
  it("supports reactive language toggling and dictionary lookup", () => {
    const { result } = renderHook(() => useLanguage("id"));

    expect(result.current.lang).toBe("id");
    expect(result.current.t("save")).toBe("Simpan");
    expect(result.current.localize({ id: "Faktur", en: "Invoice" })).toBe("Faktur");

    // Toggle language
    act(() => {
      result.current.toggleLang();
    });

    expect(result.current.lang).toBe("en");
    expect(result.current.t("save")).toBe("Save");
    expect(result.current.localize({ id: "Faktur", en: "Invoice" })).toBe("Invoice");
  });
});
