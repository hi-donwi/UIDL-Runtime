/**
 * Client-Side CSV and JSON Export & Import Utilities
 * Provides seamless export/import functionality for datasets in uidl-runtime.
 */

export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]).filter((k) => k !== "route" && k !== "$action");
  const escapeCsv = (val: unknown) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map((h) => escapeCsv(h)).join(","),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  triggerDownload(filename.endsWith(".csv") ? filename : `${filename}.csv`, blob);
}

export function exportToJson(filename: string, data: unknown) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  triggerDownload(filename.endsWith(".json") ? filename : `${filename}.json`, blob);
}

export function parseCsvText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === headers.length) {
      const record: Record<string, string> = {};
      headers.forEach((h, idx) => {
        record[h] = values[idx] ?? "";
      });
      records.push(record);
    }
  }

  return records;
}

export async function parseCsvFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || "";
        resolve(parseCsvText(text));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read CSV file"));
    reader.readAsText(file);
  });
}

export function parseJsonText(text: string): Record<string, unknown>[] {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
    if (typeof parsed === "object" && parsed !== null) {
      if (Array.isArray(parsed.rows)) return parsed.rows as Record<string, unknown>[];
      if (Array.isArray(parsed.data)) return parsed.data as Record<string, unknown>[];
      return [parsed as Record<string, unknown>];
    }
    return [];
  } catch {
    return [];
  }
}

export async function parseJsonFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || "[]";
        resolve(parseJsonText(text));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read JSON file"));
    reader.readAsText(file);
  });
}

function triggerDownload(filename: string, blob: Blob) {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
