import { DataError, type DataAdapter } from "~/data/types";

/**
 * Meridian (core accounting) Import Wizard — the behavioural counterpart to the illustrative
 * "Import Wizard" page. Parses pasted CSV, maps columns to a target doctype's fields, validates
 * every row (required columns, id shape, in-batch + against-collection uniqueness), then creates
 * the valid rows as adapter records and reports the rest. It never partially corrupts a row:
 * a row either validates and is created, or it is skipped with a reason.
 */

export interface ImportTarget {
  doctype: string;
  collection: string;
  label: string;
  /** Columns the CSV must supply (case-insensitive header match). */
  requiredColumns: string[];
  /** All columns the importer will map, in a sensible order (for the template + preview). */
  columns: string[];
  /** Column whose value becomes the record id. */
  idColumn: string;
  /** Builds the adapter record from a row object (already validated non-empty on requiredColumns). */
  buildRecord: (row: Record<string, string>) => Record<string, unknown>;
}

const TENANT = "meridian";

export const IMPORT_TARGETS: Record<string, ImportTarget> = {
  Customer: {
    doctype: "Customer",
    collection: "Customer",
    label: "Customers",
    requiredColumns: ["id", "name"],
    columns: ["id", "name", "customerGroup", "territory", "email", "phone"],
    idColumn: "id",
    buildRecord: (row) => ({
      id: row.id,
      name: row.name,
      customerGroup: row.customerGroup || "Retail",
      territory: row.territory || "Indonesia",
      email: row.email || "",
      phone: row.phone || "",
      route: `/app/meridian/edit/Customer/${row.id}`,
    }),
  },
  Supplier: {
    doctype: "Supplier",
    collection: "Supplier",
    label: "Suppliers",
    requiredColumns: ["id", "name"],
    columns: ["id", "name", "supplierGroup", "email", "phone"],
    idColumn: "id",
    buildRecord: (row) => ({
      id: row.id,
      name: row.name,
      supplierGroup: row.supplierGroup || "Bahan Baku & Jasa",
      email: row.email || "",
      phone: row.phone || "",
      route: `/app/meridian/edit/Supplier/${row.id}`,
    }),
  },
  MeridianItem: {
    doctype: "MeridianItem",
    collection: "MeridianItem",
    label: "Items",
    requiredColumns: ["id", "name"],
    columns: ["id", "name", "stockUOM", "valuationRate", "warehouse"],
    idColumn: "id",
    buildRecord: (row) => ({
      id: row.id,
      tenant: TENANT,
      name: row.name,
      stockUOM: row.stockUOM || "Nos",
      warehouse: row.warehouse || "Gudang Utama Meridian",
      stockQty: 0,
      stockValue: 0,
      valuationRate: toNumber(row.valuationRate) ?? 0,
    }),
  },
};

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/** Minimal CSV: comma-separated, `"`-quoted fields with `""` escaping, CRLF or LF rows. */
export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/\r\n?/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((cell) => cell.trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  const [headerRow, ...dataRows] = nonEmpty;
  return { headers: headerRow.map((h) => h.trim()), rows: dataRows.map((r) => r.map((c) => c.trim())) };
}

export interface ImportRowResult {
  index: number;
  values: Record<string, string>;
  record?: Record<string, unknown>;
  error?: string;
}

export interface ImportPreview {
  target: string;
  columns: string[];
  rows: ImportRowResult[];
  validCount: number;
  invalidCount: number;
}

export interface RunImportResult {
  target: string;
  created: string[];
  skipped: Array<{ index: number; id: string; reason: string }>;
}

function resolveTarget(targetName: string): ImportTarget {
  const target = IMPORT_TARGETS[targetName];
  if (!target) throw new DataError(`Unknown import target "${targetName}"`, "validation", { target: "Unknown" });
  return target;
}

function rowObject(headers: string[], values: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((header, i) => {
    obj[header] = (values[i] ?? "").trim();
  });
  return obj;
}

/** Validates one row against a target; returns the record or a human-readable error. */
function validateRow(
  target: ImportTarget,
  row: Record<string, string>,
  seenIds: Set<string>,
  existingIds: Set<string>,
): { record?: Record<string, unknown>; error?: string } {
  const missing = target.requiredColumns.filter((col) => !row[col] || row[col].trim() === "");
  if (missing.length > 0) return { error: `Missing ${missing.join(", ")}` };

  const id = row[target.idColumn].trim();
  if (!/^[A-Za-z0-9][\w./-]*$/.test(id)) return { error: `Invalid id "${id}"` };
  if (existingIds.has(id)) return { error: `Id "${id}" already exists` };
  if (seenIds.has(id)) return { error: `Duplicate id "${id}" in this file` };

  return { record: target.buildRecord(row) };
}

export async function previewImport(
  adapter: DataAdapter,
  input: { target: string; csv: string },
): Promise<ImportPreview> {
  const target = resolveTarget(input.target);
  const parsed = parseCsv(input.csv);
  if (parsed.headers.length === 0) {
    return { target: target.doctype, columns: target.columns, rows: [], validCount: 0, invalidCount: 0 };
  }
  const missingHeaders = target.requiredColumns.filter(
    (col) => !parsed.headers.some((h) => h.toLowerCase() === col.toLowerCase()),
  );
  if (missingHeaders.length > 0) {
    throw new DataError(`CSV is missing required column(s): ${missingHeaders.join(", ")}`, "validation", {
      csv: "Missing columns",
    });
  }

  const existing = await adapter.query<Record<string, unknown>>({ collection: target.collection });
  const existingIds = new Set(existing.rows.map((r) => String(r.id)));
  const seenIds = new Set<string>();

  const rows: ImportRowResult[] = parsed.rows.map((values, index) => {
    const obj = rowObject(parsed.headers, values);
    const { record, error } = validateRow(target, obj, seenIds, existingIds);
    if (record) seenIds.add(String(record.id));
    return { index, values: obj, record, error };
  });

  return {
    target: target.doctype,
    columns: parsed.headers,
    rows,
    validCount: rows.filter((r) => r.record).length,
    invalidCount: rows.filter((r) => r.error).length,
  };
}

export async function runImport(
  adapter: DataAdapter,
  input: { target: string; csv: string },
): Promise<RunImportResult> {
  const preview = await previewImport(adapter, input);
  const created: string[] = [];
  const skipped: RunImportResult["skipped"] = [];

  for (const row of preview.rows) {
    const id = String(row.values[IMPORT_TARGETS[input.target].idColumn] ?? "");
    if (!row.record) {
      skipped.push({ index: row.index, id, reason: row.error ?? "Invalid row" });
      continue;
    }
    try {
      await adapter.create({ collection: preview.target, data: row.record });
      created.push(String(row.record.id));
    } catch (err) {
      skipped.push({ index: row.index, id, reason: err instanceof Error ? err.message : "Create failed" });
    }
  }

  return { target: preview.target, created, skipped };
}

export function importTemplateCsv(targetName: string): string {
  const target = resolveTarget(targetName);
  return target.columns.join(",") + "\n";
}

function toNumber(value: string | undefined): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const n = Number(value.replace(/[,_\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}
