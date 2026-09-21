import { describe, expect, it } from "vitest";
import { DocumentSchema } from "~/schemas/document";
import { parseDoctypeMeta } from "../../domain/doctypes/types";
import { shoeCompany } from "../companies/shoeCompany";
import { shoeCompanyDoctypes } from "../doctypes";
import { resolveConsoleModuleRoute } from "../moduleRuntime";

const REQUIRED_RETAIL_DOCTYPES = [
  "POSShift",
  "POSInvoice",
  "POSPayment",
  "ItemVariant",
  "Customer",
  "Warehouse",
  "StockLedgerEntry",
  "GLEntry",
  "CashClosing",
] as const;

describe("shoe-company retail DoctypeMeta", () => {
  it("declares the required POS and retail accounting doctypes", () => {
    const names = shoeCompanyDoctypes.map((meta) => meta.name);

    expect(names).toContain("ShoeOrder");
    for (const name of REQUIRED_RETAIL_DOCTYPES) {
      expect(names).toContain(name);
    }
  });

  it("parses every retail doctype and exposes state machines for transactional documents", () => {
    const transactional = new Set(["POSShift", "POSInvoice", "POSPayment", "CashClosing"]);

    for (const meta of shoeCompanyDoctypes) {
      const parsed = parseDoctypeMeta(meta);
      expect(parsed.fields.length).toBeGreaterThanOrEqual(4);
      expect(parsed.listView.columns.length).toBeGreaterThanOrEqual(3);

      if (transactional.has(parsed.name)) {
        expect(parsed.states?.transitions.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("resolves generated list and new-form documents for each required doctype", () => {
    for (const doctype of REQUIRED_RETAIL_DOCTYPES) {
      const list = resolveConsoleModuleRoute(`/app/shoe-company/list/${doctype}`, { companies: [shoeCompany] });
      expect(list?.document.id).toBe(`list-${doctype.toLowerCase()}`);
      expect(() => DocumentSchema.parse(list?.document)).not.toThrow();

      const form = resolveConsoleModuleRoute(`/app/shoe-company/edit/${doctype}/new`, { companies: [shoeCompany] });
      expect(form?.document.id).toBe(`form-${doctype.toLowerCase()}-new`);
      expect(() => DocumentSchema.parse(form?.document)).not.toThrow();
    }
  });
});
