import { useEffect, useMemo, useState } from "react";
import { UIDocumentRenderer } from "~/renderer/UIDocumentRenderer";
import { DocumentSchema } from "~/schemas/document";
import { createDocumentState } from "~/state/createDocumentState";
import { meridianDarkTheme, meridianLightTheme } from "~/theme/meridianPreset";
import type { DataAdapter } from "~/data/types";
import { buildReportPage } from "../domain/generators";
import {
  buildMeridianReceivablesReport,
  type MeridianReceivablesReport as ReceivablesReport,
} from "../domain/services/meridianReceivablesService";
import { formatIDR } from "../domain/services/posService";

interface MeridianReceivablesReportProps {
  dataAdapter: DataAdapter;
  isDark?: boolean;
}

export function MeridianReceivablesReport({ dataAdapter, isDark }: MeridianReceivablesReportProps) {
  const [report, setReport] = useState<ReceivablesReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildMeridianReceivablesReport(dataAdapter)
      .then((next) => {
        if (!cancelled) setReport(next);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : "Failed to build receivables report");
      });
    return () => {
      cancelled = true;
    };
  }, [dataAdapter]);

  const document = useMemo(() => {
    if (!report) return null;
    const { summary } = report;
    const openRows = report.rows.filter((row) => row.outstanding > 0);
    return DocumentSchema.parse(
      buildReportPage(
        {
          name: "AccountsReceivable",
          label: { id: "Piutang Usaha (Subledger vs GL)", en: "Accounts Receivable" },
          summaries: [
            { label: { id: "Outstanding", en: "Outstanding" }, value: formatIDR(summary.totalOutstanding) },
            { label: { id: "Ditagih", en: "Billed" }, value: formatIDR(summary.totalBilled) },
            { label: { id: "Diterima", en: "Collected" }, value: formatIDR(summary.totalCollected) },
            { label: { id: "Write-off", en: "Written Off" }, value: formatIDR(summary.totalWrittenOff) },
            { label: { id: "Uang Muka", en: "Customer Advances" }, value: formatIDR(summary.customerAdvances) },
            { label: { id: "Kontrol GL", en: "GL Control" }, value: formatIDR(summary.arControlBalance) },
            { label: { id: "Selisih Tie-out", en: "Tie-out Difference" }, value: formatIDR(summary.tieOutDifference) },
          ],
          columns: [
            { key: "invoiceId", label: { id: "Faktur", en: "Invoice" } },
            { key: "customerName", label: { id: "Pelanggan", en: "Customer" } },
            { key: "total", label: { id: "Nilai", en: "Total" }, align: "right" },
            { key: "allocated", label: { id: "Dibayar", en: "Paid" }, align: "right" },
            { key: "writtenOff", label: { id: "Write-off", en: "Write-off" }, align: "right" },
            { key: "creditNoted", label: { id: "Nota Kredit", en: "Credit Note" }, align: "right" },
            { key: "outstanding", label: { id: "Sisa", en: "Outstanding" }, align: "right" },
            { key: "arStatus", label: { id: "Status", en: "Status" } },
          ],
          dataSource: openRows.map((row) => ({
            ...row,
            total: formatIDR(row.total),
            allocated: formatIDR(row.allocated),
            writtenOff: formatIDR(row.writtenOff),
            creditNoted: formatIDR(row.creditNoted),
            outstanding: formatIDR(row.outstanding),
          })),
        },
        { company: "meridian", lang: "en", docId: "meridian-accounts-receivable" },
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
    return <div className="p-6 text-sm text-[#6b7280]">Loading accounts receivable…</div>;
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
