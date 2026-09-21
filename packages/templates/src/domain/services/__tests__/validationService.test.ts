import { describe, expect, it } from "vitest";
import { validateField, validateRecord } from "../validationService";
import type { FieldMeta } from "../../doctypes/types";
import { DataError } from "~/data/errors";

const customerField: FieldMeta = {
  key: "customer",
  label: { id: "Pelanggan", en: "Customer" },
  widget: "TextField",
  required: true,
};

const quantityField: FieldMeta = {
  key: "quantity",
  label: { id: "Jumlah", en: "Quantity" },
  widget: "TextField",
  validate: { min: 1, max: 100 },
};

const codeField: FieldMeta = {
  key: "code",
  label: { id: "Kode", en: "Code" },
  widget: "TextField",
  validate: { pattern: "^[A-Z]{3}-\\d{3}$", message: { id: "Kode harus format XXX-000", en: "Code must match XXX-000" } },
};

const optionalField: FieldMeta = {
  key: "notes",
  label: { id: "Catatan", en: "Notes" },
  widget: "Textarea",
};

describe("validateField · required", () => {
  it("rejects undefined, null, and empty string", () => {
    expect(validateField(customerField, undefined, "id")).toBeTruthy();
    expect(validateField(customerField, null, "id")).toBeTruthy();
    expect(validateField(customerField, "", "id")).toBeTruthy();
  });

  it("accepts a non-empty value", () => {
    expect(validateField(customerField, "PT Andalan", "id")).toBeUndefined();
  });

  it("message is localized per language", () => {
    const idMessage = validateField(customerField, "", "id");
    const enMessage = validateField(customerField, "", "en");
    expect(idMessage).toContain("Pelanggan");
    expect(enMessage).toContain("Customer");
    expect(idMessage).not.toBe(enMessage);
  });

  it("an optional empty field passes when there is no further validate rule", () => {
    expect(validateField(optionalField, "", "id")).toBeUndefined();
    expect(validateField(optionalField, undefined, "id")).toBeUndefined();
  });
});

describe("validateField · numeric min/max", () => {
  it("rejects below min and above max", () => {
    expect(validateField(quantityField, 0, "id")).toBeTruthy();
    expect(validateField(quantityField, 101, "id")).toBeTruthy();
  });

  it("accepts within bounds, including the boundary values", () => {
    expect(validateField(quantityField, 1, "id")).toBeUndefined();
    expect(validateField(quantityField, 100, "id")).toBeUndefined();
    expect(validateField(quantityField, 50, "id")).toBeUndefined();
  });
});

describe("validateField · string length min/max", () => {
  const nameField: FieldMeta = {
    key: "name",
    label: { id: "Nama", en: "Name" },
    widget: "TextField",
    validate: { min: 3, max: 10 },
  };

  it("rejects strings shorter than min or longer than max", () => {
    expect(validateField(nameField, "ab", "id")).toBeTruthy();
    expect(validateField(nameField, "a".repeat(11), "id")).toBeTruthy();
  });

  it("accepts strings within bounds", () => {
    expect(validateField(nameField, "abc", "id")).toBeUndefined();
  });
});

describe("validateField · pattern", () => {
  it("rejects a value that doesn't match, using the custom message when provided", () => {
    const message = validateField(codeField, "invalid", "id");
    expect(message).toBe("Kode harus format XXX-000");
    expect(validateField(codeField, "invalid", "en")).toBe("Code must match XXX-000");
  });

  it("accepts a value that matches", () => {
    expect(validateField(codeField, "ABC-123", "id")).toBeUndefined();
  });
});

describe("validateRecord", () => {
  it("returns null when every field passes", () => {
    const result = validateRecord([customerField, quantityField], { customer: "PT Andalan", quantity: 5 }, "id");
    expect(result).toBeNull();
  });

  it("returns a Record<field, message> for every failing field, and only failing fields", () => {
    const result = validateRecord([customerField, quantityField, codeField], { customer: "", quantity: 999, code: "ABC-123" }, "id");
    expect(result).not.toBeNull();
    expect(Object.keys(result!).sort()).toEqual(["customer", "quantity"]);
    expect(result!.customer).toContain("Pelanggan");
  });

  it("the returned shape plugs directly into DataError.fields with no translation step", () => {
    const errors = validateRecord([customerField], { customer: "" }, "id");
    expect(errors).not.toBeNull();
    const error = new DataError("Validation failed", "validation", errors!);
    expect(error.fields).toEqual(errors);
    expect(error.code).toBe("validation");
  });
});
