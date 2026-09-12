import { useEffect, useMemo, useState } from "react";
import { UIDocumentRenderer } from "~/renderer/UIDocumentRenderer";
import { DocumentSchema } from "~/schemas/document";
import { createDocumentState } from "~/state/createDocumentState";
import { meridianDarkTheme, meridianLightTheme } from "~/theme/meridianPreset";
import type { DataAdapter } from "~/data/types";
import { buildReportPage } from "../domain/generators";
import {
  buildMeridianPosShiftReport,
  type MeridianPosShiftReport as ShiftReport,
} from "../domain/services/meridianPosShiftService";
import { formatIDR } from "../domain/services/posService";

interface MeridianPosShiftReportProps {
  dataAdapter: DataAdapter;
  isDark?: boolean;
}

export function MeridianPosShiftReport({ dataAdapter, isDark }: MeridianPosShiftReportProps) {
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildMeridianPosShiftReport(dataAdapter)
      .then((next) => {
        if (!cancelled) setReport(next);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : "Failed to build POS shift report");
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
          name: "POSShiftLedger",
          label: { id: "Rekonsiliasi Shift POS", en: "POS Shift Ledger" },
          summaries: [
            { label: { id: "Shift", en: "Shifts" }, value: `${summary.closedCount}/${summary.shiftCount} closed` },
            { label: { id: "Seimbang", en: "Balanced" }, value: summary.balancedCount },
            { label: { id: "Kurang / Lebih", en: "Short / Over" }, value: `${summary.shortCount} / ${summary.overCount}` },
            { label: { id: "Selisih Kas Neto", en: "Net Cash Variance" }, value: formatIDR(summary.netCashVariance) },
            { label: { id: "Nilai Faktur POS", en: "POS Invoice Value" }, value: formatIDR(summary.totalInvoiceValue) },
            { label: { id: "Tie-out GL", en: "GL Tie-out" }, value: formatIDR(summary.tieOutDifference) },
          ],
          columns: [
            { key: "shiftId", label: { id: "Shift", en: "Shift" } },
            { key: "cashier", label: { id: "Kasir", en: "Cashier" } },
            { key: "status", label: { id: "Status", en: "Status" } },
            { key: "openingFloat", label: { id: "Modal Awal", en: "Opening Float" }, align: "right" },
            { key: "cashSales", label: { id: "Penjualan Tunai", en: "Cash Sales" }, align: "right" },
            { key: "expectedCash", label: { id: "Kas Diharapkan", en: "Expected Cash" }, align: "right" },
            { key: "countedCashLabel", label: { id: "Kas Dihitung", en: "Counted Cash" }, align: "right" },
            { key: "differenceLabel", label: { id: "Selisih", en: "Difference" }, align: "right" },
            { key: "closeStatusLabel", label: { id: "Hasil", en: "Result" } },
          ],
          dataSource: report.rows.map((row) => ({
            ...row,
            openingFloat: formatIDR(row.openingFloat),
            cashSales: formatIDR(row.cashSales),
            expectedCash: formatIDR(row.expectedCash),
            countedCashLabel: row.countedCash == null ? "—" : formatIDR(row.countedCash),
            differenceLabel: row.differenceAmount == null ? "—" : formatIDR(row.differenceAmount),
            closeStatusLabel: row.closeStatus ?? "Open",
          })),
        },
        { company: "meridian", lang: "en", docId: "meridian-pos-shift-ledger" },
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
    return <div className="p-6 text-sm text-[#6b7280]">Loading POS shift ledger…</div>;
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
