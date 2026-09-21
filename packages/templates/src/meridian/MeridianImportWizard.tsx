/**
 * Behavioural Import Wizard. Plain React: paste CSV, pick a target
 * doctype, preview per-row validation, then create the valid rows as adapter records via
 * `meridianImportService`. `MeridianReferenceRoute` mounts this for `/meridian/import-wizard`;
 * `buildImportWizardDocument` stays as the coverage-test / SSR fallback.
 */
import { useMemo, useState } from "react";
import { DataError, type DataAdapter } from "~/data/types";
import {
  IMPORT_TARGETS,
  importTemplateCsv,
  previewImport,
  runImport,
  type ImportPreview,
  type RunImportResult,
} from "../domain/services/meridianImportService";

const SAMPLE: Record<string, string> = {
  Customer: [
    "id,name,customerGroup,territory,email,phone",
    "CUST-IMP-01,PT Andalan Pangan,Corporate,Indonesia,ap@andalan.co.id,08110001",
    "CUST-IMP-02,Toko Sinar Baru,Retail,Indonesia,,08110002",
    "CUST-IMP-03,,Retail,Indonesia,,08110003",
  ].join("\n"),
  Supplier: [
    "id,name,supplierGroup,email,phone",
    "SUPP-IMP-01,CV Mitra Logistik,Jasa,ops@mitralog.co.id,0217001",
    "SUPP-IMP-02,PT Kertas Prima,Bahan Baku,,0217002",
  ].join("\n"),
  MeridianItem: [
    "id,name,stockUOM,valuationRate,warehouse",
    "ITEM-IMP-01,Amplop Coklat A4,Pak,32000,Gudang Utama Meridian",
    "ITEM-IMP-02,Spidol Whiteboard,Pcs,12500,",
  ].join("\n"),
};

export interface MeridianImportWizardProps {
  dataAdapter: DataAdapter;
  isDark?: boolean;
}

export function MeridianImportWizard({ dataAdapter }: MeridianImportWizardProps) {
  const targets = useMemo(() => Object.values(IMPORT_TARGETS), []);
  const [target, setTarget] = useState<string>(targets[0]?.doctype ?? "Customer");
  const [csv, setCsv] = useState<string>(SAMPLE.Customer);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<RunImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pickTarget(next: string) {
    setTarget(next);
    setCsv(SAMPLE[next] ?? importTemplateCsv(next));
    setPreview(null);
    setResult(null);
    setError(null);
  }

  async function doPreview() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setPreview(await previewImport(dataAdapter, { target, csv }));
    } catch (err) {
      setPreview(null);
      setError(err instanceof DataError ? err.message : err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function doImport() {
    setBusy(true);
    setError(null);
    try {
      const runResult = await runImport(dataAdapter, { target, csv });
      setResult(runResult);
      setPreview(await previewImport(dataAdapter, { target, csv }));
    } catch (err) {
      setError(err instanceof DataError ? err.message : err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const btn = "rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50";

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-bold dark:text-gray-100">Import Wizard</h2>
        <p className="text-sm text-[#6b7280]">
          Paste CSV, map it to a doctype, and create the valid rows. Rows with a missing required field
          or a duplicate id are skipped with a reason — nothing is partially imported.
        </p>
      </div>

      <label className="block text-sm">
        Target doctype
        <select
          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
          aria-label="Target doctype"
          value={target}
          onChange={(e) => pickTarget(e.target.value)}
        >
          {targets.map((t) => (
            <option key={t.doctype} value={t.doctype}>
              {t.label} ({t.doctype})
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        CSV
        <textarea
          className="mt-1 block h-40 w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs dark:border-slate-600 dark:bg-slate-800"
          aria-label="CSV"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
      </label>

      <div className="flex gap-2">
        <button type="button" className={`${btn} bg-gray-100 dark:bg-gray-800`} onClick={doPreview} disabled={busy} data-testid="import-preview">
          Preview
        </button>
        <button
          type="button"
          className={`${btn} bg-emerald-600 text-white`}
          onClick={doImport}
          disabled={busy || !preview || preview.validCount === 0}
          data-testid="import-run"
        >
          Import {preview ? `${preview.validCount} valid row(s)` : "rows"}
        </button>
      </div>

      {error ? <div className="text-sm text-red-600" data-testid="import-error">{error}</div> : null}

      {result ? (
        <div className="rounded-md border border-emerald-300 p-3 text-sm dark:border-emerald-800" data-testid="import-result">
          <div className="font-semibold text-emerald-700">
            Created {result.created.length} {result.target} record(s); skipped {result.skipped.length}.
          </div>
          {result.skipped.length > 0 ? (
            <ul className="mt-1 list-disc pl-5 text-xs text-[#6b7280]">
              {result.skipped.map((s) => (
                <li key={s.index}>
                  Row {s.index + 1} ({s.id || "—"}): {s.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {preview && preview.rows.length > 0 ? (
        <table className="w-full border text-xs dark:border-gray-800" data-testid="import-preview-table">
          <thead className="border-b bg-gray-50 text-left uppercase text-[#6b7280] dark:border-gray-800 dark:bg-gray-900">
            <tr>
              <th className="px-2 py-1">#</th>
              {preview.columns.map((c) => (
                <th key={c} className="px-2 py-1">
                  {c}
                </th>
              ))}
              <th className="px-2 py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row) => (
              <tr key={row.index} className="border-b dark:border-gray-800">
                <td className="px-2 py-1">{row.index + 1}</td>
                {preview.columns.map((c) => (
                  <td key={c} className="px-2 py-1">
                    {row.values[c] ?? ""}
                  </td>
                ))}
                <td className={`px-2 py-1 ${row.error ? "text-red-600" : "text-emerald-700"}`}>
                  {row.error ?? "OK"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {preview && preview.rows.length > 0 ? (
        <div className="text-xs text-[#6b7280]" data-testid="import-summary">
          {preview.validCount} valid · {preview.invalidCount} invalid
        </div>
      ) : null}
    </div>
  );
}
