import { useEffect, useMemo, useState } from "react";
import { UIDocumentRenderer } from "~/renderer/UIDocumentRenderer";
import { DocumentSchema } from "~/schemas/document";
import { createDocumentState } from "~/state/createDocumentState";
import { meridianDarkTheme, meridianLightTheme } from "~/theme/meridianPreset";
import type { DataAdapter } from "~/data/types";
import { buildReportPage } from "../domain/generators";
import {
  buildMeridianStockValuationReport,
  type MeridianStockValuationReport as ValuationReport,
} from "../domain/services/meridianStockValuationService";
import { formatIDR } from "../domain/services/posService";

interface MeridianStockValuationReportProps {
  dataAdapter: DataAdapter;
  isDark?: boolean;
}

export function MeridianStockValuationReport({ dataAdapter, isDark }: MeridianStockValuationReportProps) {
  const [report, setReport] = useState<ValuationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildMeridianStockValuationReport(dataAdapter)
      .then((next) => {
        if (!cancelled) setReport(next);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : "Failed to build stock valuation report");
      });
    return () => {
      cancelled = true;
    };
  }, [dataAdapter]);

  const document = useMemo(() => {
    if (!report) return null;
    const { summary } = report;
    return DocumentSchema.parse(
      buildReportPage(
        {
          name: "StockValuationLedger",
          label: { id: "Valuasi Persediaan (Moving Average)", en: "Stock Valuation Ledger" },
          summaries: [
            { label: { id: "Nilai Persediaan", en: "Stock Value" }, value: formatIDR(summary.totalStockValue) },
            { label: { id: "Kontrol GL Persediaan", en: "Inventory GL" }, value: formatIDR(summary.inventoryGlBalance) },
            { label: { id: "Selisih Tie-out", en: "Tie-out Difference" }, value: formatIDR(summary.tieOutDifference) },
            { label: { id: "Total Penerimaan", en: "Receipts" }, value: formatIDR(summary.totalReceiptsValue) },
            { label: { id: "HPP (Issue)", en: "COGS (Issues)" }, value: formatIDR(summary.totalIssuesValue) },
          ],
          columns: [
            { key: "item", label: { id: "Item", en: "Item" } },
            { key: "itemName", label: { id: "Nama", en: "Name" } },
            { key: "warehouse", label: { id: "Gudang", en: "Warehouse" } },
            { key: "quantityOnHand", label: { id: "Qty", en: "Qty" }, align: "right" },
            { key: "movingAverageRate", label: { id: "Rata-rata", en: "Avg Rate" }, align: "right" },
            { key: "stockValue", label: { id: "Nilai", en: "Value" }, align: "right" },
            { key: "movementCount", label: { id: "Mutasi", en: "Moves" }, align: "right" },
          ],
          dataSource: report.rows.map((row) => ({
            ...row,
            movingAverageRate: formatIDR(row.movingAverageRate),
            stockValue: formatIDR(row.stockValue),
          })),
        },
        { company: "meridian", lang: "en", docId: "meridian-stock-valuation-ledger" },
      ),
    );
  }, [report]);

  const stateStore = useMemo(
    () => (document ? createDocumentState(document.state ?? {}).getState() : undefined),
    [document],
  );

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }
  if (!document || !stateStore || !report) {
    return <div className="p-6 text-sm text-[#6b7280]">Loading stock valuation ledger…</div>;
  }

  return (
    <div className="space-y-4">
      <UIDocumentRenderer
        document={document}
        theme={isDark ? meridianDarkTheme : meridianLightTheme}
        dataSources={document.dataSources}
        stateStore={stateStore}
      />
      <ul className="mx-6 mb-6 list-disc space-y-1 pl-5 text-xs text-[#6b7280]">
        {report.controls.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
