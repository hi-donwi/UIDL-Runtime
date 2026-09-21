/**
 * `FieldMeta[]` -> per-field validation, returning exactly the shape `DataError.fields` already
 * uses (`Record<field, message>`) — see src/data/errors.ts. That shape match is the whole point:
 * a caller (documentService, or a form's onSubmit) can throw
 * `new DataError("...", "validation", validateRecord(fields, data))` and `useRecord`
 * maps `.fields` straight onto `state.formErrors.*` with no translation step in between, exactly
 * as it already would for a server-side validation error from HttpAdapter.
 */
import type { FieldMeta } from "../doctypes/types";
import type { Language } from "~/utils/i18n";

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/** Validates one field's value against its own `required`/`validate` rules. Returns the
 *  localized message, or undefined if the value passes. `min`/`max` are interpreted as numeric
 *  bounds when the value is a number, or string-length bounds when it's a string — `FieldValidate`
 *  is deliberately one shape for both, since a widget's own type already disambiguates which
 *  applies (Currency/Slider produce numbers; TextField/Textarea produce strings). */
export function validateField(field: FieldMeta, value: unknown, lang: Language): string | undefined {
  const custom = lang === "id" ? field.validate?.message?.id : field.validate?.message?.en;

  if (field.required && isEmpty(value)) {
    return custom ?? (lang === "id" ? `${field.label.id} wajib diisi` : `${field.label.en} is required`);
  }

  if (isEmpty(value)) return undefined; // an optional, empty field has nothing further to check

  const rules = field.validate;
  if (!rules) return undefined;

  if (typeof value === "number") {
    if (rules.min !== undefined && value < rules.min) {
      return custom ?? (lang === "id" ? `${field.label.id} minimal ${rules.min}` : `${field.label.en} must be at least ${rules.min}`);
    }
    if (rules.max !== undefined && value > rules.max) {
      return custom ?? (lang === "id" ? `${field.label.id} maksimal ${rules.max}` : `${field.label.en} must be at most ${rules.max}`);
    }
  }

  if (typeof value === "string") {
    if (rules.min !== undefined && value.length < rules.min) {
      return (
        custom ?? (lang === "id" ? `${field.label.id} minimal ${rules.min} karakter` : `${field.label.en} must be at least ${rules.min} characters`)
      );
    }
    if (rules.max !== undefined && value.length > rules.max) {
      return (
        custom ?? (lang === "id" ? `${field.label.id} maksimal ${rules.max} karakter` : `${field.label.en} must be at most ${rules.max} characters`)
      );
    }
    if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
      return custom ?? (lang === "id" ? `Format ${field.label.id} tidak valid` : `${field.label.en} has an invalid format`);
    }
  }

  return undefined;
}

/** Validates every field against `data`, returning `DataError.fields`-shaped errors, or `null`
 *  when everything passes (never an empty object — callers can `if (errors) throw ...` directly). */
export function validateRecord(fields: FieldMeta[], data: Record<string, unknown>, lang: Language = "id"): Record<string, string> | null {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const message = validateField(field, data[field.key], lang);
    if (message) errors[field.key] = message;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}
