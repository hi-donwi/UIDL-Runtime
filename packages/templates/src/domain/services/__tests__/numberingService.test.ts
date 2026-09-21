import { describe, expect, it } from "vitest";
import { createInMemoryCounterStore, createLocalStorageCounterStore, nextDocumentNumber } from "../numberingService";

const FIXED_DATE = new Date("2027-03-15T00:00:00Z");

describe("nextDocumentNumber · formatting", () => {
  it("matches the SINV-YYYY-##### format already used in mockData.ts", () => {
    const store = createInMemoryCounterStore();
    expect(nextDocumentNumber("SalesInvoice", "SINV-.YYYY.-.#####", store, FIXED_DATE)).toBe("SINV-2027-00001");
  });

  it("supports MM and DD tokens", () => {
    const store = createInMemoryCounterStore();
    expect(nextDocumentNumber("Batch", "B.YYYY.MM.DD.-.###", store, FIXED_DATE)).toBe("B20270315-001");
  });

  it("pads the counter to the declared width", () => {
    const store = createInMemoryCounterStore();
    expect(nextDocumentNumber("X", "X-.##.", store, FIXED_DATE)).toBe("X-01");
  });
});

describe("nextDocumentNumber · sequencing", () => {
  it("1000 sequential calls produce 1000 unique, sequential numbers", () => {
    const store = createInMemoryCounterStore();
    const numbers = Array.from({ length: 1000 }, () => nextDocumentNumber("SalesInvoice", "SINV-.YYYY.-.#####", store, FIXED_DATE));
    expect(new Set(numbers).size).toBe(1000);
    expect(numbers[0]).toBe("SINV-2027-00001");
    expect(numbers[999]).toBe("SINV-2027-01000");
    for (let i = 1; i < numbers.length; i++) {
      const prevCounter = Number(numbers[i - 1].split("-")[2]);
      const curCounter = Number(numbers[i].split("-")[2]);
      expect(curCounter).toBe(prevCounter + 1);
    }
  });

  it("counters for different collections are independent", () => {
    const store = createInMemoryCounterStore();
    expect(nextDocumentNumber("SalesInvoice", "SINV-.YYYY.-.#####", store, FIXED_DATE)).toBe("SINV-2027-00001");
    expect(nextDocumentNumber("PurchaseInvoice", "PINV-.YYYY.-.#####", store, FIXED_DATE)).toBe("PINV-2027-00001");
    expect(nextDocumentNumber("SalesInvoice", "SINV-.YYYY.-.#####", store, FIXED_DATE)).toBe("SINV-2027-00002");
  });

  it("counters reset per resolved prefix — a new year starts back at 1", () => {
    const store = createInMemoryCounterStore();
    expect(nextDocumentNumber("SalesInvoice", "SINV-.YYYY.-.#####", store, FIXED_DATE)).toBe("SINV-2027-00001");
    expect(nextDocumentNumber("SalesInvoice", "SINV-.YYYY.-.#####", store, FIXED_DATE)).toBe("SINV-2027-00002");
    const nextYear = new Date("2028-01-05T00:00:00Z");
    expect(nextDocumentNumber("SalesInvoice", "SINV-.YYYY.-.#####", store, nextYear)).toBe("SINV-2028-00001");
  });
});

describe("createLocalStorageCounterStore · persistence", () => {
  it("a fresh store instance with the same storageKey continues from where the last one left off", () => {
    const key = "vb-test-numbering-persist";
    window.localStorage.removeItem(key);

    const first = createLocalStorageCounterStore(key);
    expect(nextDocumentNumber("SalesInvoice", "SINV-.YYYY.-.#####", first, FIXED_DATE)).toBe("SINV-2027-00001");
    expect(nextDocumentNumber("SalesInvoice", "SINV-.YYYY.-.#####", first, FIXED_DATE)).toBe("SINV-2027-00002");
    expect(nextDocumentNumber("SalesInvoice", "SINV-.YYYY.-.#####", first, FIXED_DATE)).toBe("SINV-2027-00003");

    // Simulates a reload: a brand new store object, same underlying localStorage key.
    const second = createLocalStorageCounterStore(key);
    expect(nextDocumentNumber("SalesInvoice", "SINV-.YYYY.-.#####", second, FIXED_DATE)).toBe("SINV-2027-00004");

    window.localStorage.removeItem(key);
  });

  it("different storageKeys do not interfere with each other", () => {
    const keyA = "vb-test-numbering-a";
    const keyB = "vb-test-numbering-b";
    window.localStorage.removeItem(keyA);
    window.localStorage.removeItem(keyB);

    const storeA = createLocalStorageCounterStore(keyA);
    const storeB = createLocalStorageCounterStore(keyB);
    expect(nextDocumentNumber("X", "X-.###.", storeA, FIXED_DATE)).toBe("X-001");
    expect(nextDocumentNumber("X", "X-.###.", storeB, FIXED_DATE)).toBe("X-001");
    expect(nextDocumentNumber("X", "X-.###.", storeA, FIXED_DATE)).toBe("X-002");
    expect(nextDocumentNumber("X", "X-.###.", storeB, FIXED_DATE)).toBe("X-002"); // unaffected by storeA

    window.localStorage.removeItem(keyA);
    window.localStorage.removeItem(keyB);
  });
});
