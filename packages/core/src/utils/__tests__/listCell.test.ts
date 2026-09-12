import { describe, expect, it } from "vitest";
import { formatCellValue, isNumericFormat, statusColor } from "../listCell";

describe("formatCellValue — ListCell's `the column format rule` rules", () => {
  it("prints currency with the declared symbol instead of the raw integer", () => {
    // The defect this exists for: a Sales Order list showed `1500000`.
    expect(formatCellValue(1500000, "currency", { locale: "id-ID", currency: "IDR" }))
      .toMatch(/^Rp\s?1\.500\.000/);
  });

  it("falls back to a grouped number when the host declares no currency", () => {
    expect(formatCellValue(1500000, "currency", { locale: "en-US" })).toBe("1,500,000.00");
  });

  it("formats dates rather than echoing the ISO string", () => {
    expect(formatCellValue("2026-08-31", "date", { locale: "en-US" })).toBe("Aug 31, 2026");
  });

  it("leaves an unparseable date as its own text rather than printing Invalid Date", () => {
    expect(formatCellValue("not a date", "date")).toBe("not a date");
  });

  it("leaves a non-numeric value in a numeric column as itself", () => {
    expect(formatCellValue("n/a", "currency", { currency: "IDR" })).toBe("n/a");
  });

  it("renders nullish cells as empty, never as 'null'", () => {
    expect(formatCellValue(null, "currency", { currency: "IDR" })).toBe("");
    expect(formatCellValue(undefined, "text")).toBe("");
  });

  it("passes text through unchanged", () => {
    expect(formatCellValue("Sales Order 001", "text")).toBe("Sales Order 001");
    expect(formatCellValue("Sales Order 001", undefined)).toBe("Sales Order 001");
  });

  it("prints a check column the way the column format rule does", () => {
    // `titleCase(Boolean(value).toString())` upstream — not a tick, and never blank, which
    // left an Enabled column looking like it had no value at all.
    expect(formatCellValue(true, "check")).toBe("True");
    expect(formatCellValue(false, "check")).toBe("False");
  });

  it("prints a Float as a fixed decimal, never as money", () => {
    // The defect: a "Rate %" column mapped to the Currency widget rendered `IDR 2` for 2%.
    expect(formatCellValue(2, "number", { currency: "IDR", locale: "id-ID" })).toBe("2.00");
    expect(formatCellValue(2.5, "number")).toBe("2.50");
  });

  it("prints an Int truncated and ungrouped, like Math.trunc().toString()", () => {
    expect(formatCellValue(1500000, "integer", { locale: "id-ID" })).toBe("1500000");
    expect(formatCellValue(3.9, "integer")).toBe("3");
  });
});

describe("isNumericFormat — Meridian's right-align rule", () => {
  it("covers exactly the numeric fieldtypes", () => {
    expect(isNumericFormat("currency")).toBe(true);
    expect(isNumericFormat("number")).toBe(true);
    expect(isNumericFormat("integer")).toBe(true);
    expect(isNumericFormat("date")).toBe(false);
    expect(isNumericFormat("status")).toBe(false);
    expect(isNumericFormat(undefined)).toBe(false);
  });
});

describe("statusColor — StatusPill's statusColorMap", () => {
  it("maps known statuses case- and space-insensitively", () => {
    expect(statusColor("Paid")).toBe("green");
    expect(statusColor(" SUBMITTED ")).toBe("blue");
    expect(statusColor("Cancelled")).toBe("red");
  });

  it("falls back to gray for anything unmapped", () => {
    expect(statusColor("Whatever")).toBe("gray");
  });
});
