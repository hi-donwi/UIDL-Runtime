import { useEffect, useMemo, useState } from "react";
import { UIDocumentRenderer } from "~/renderer/UIDocumentRenderer";
import { DocumentSchema } from "~/schemas/document";
import { createDocumentState } from "~/state/createDocumentState";
import { meridianDarkTheme, meridianLightTheme } from "~/theme/meridianPreset";
import type { DataAdapter } from "~/data/types";
import { buildReportPage } from "../domain/generators";
import {
  buildMeridianSalesLedgerReport,
  type MeridianSalesLedgerReport as LedgerReport,
} from "../domain/services/meridianSalesLedgerService";
import { formatIDR } from "../domain/services/posService";

interface MeridianSalesLedgerReportProps {
  dataAdapter: DataAdapter;
  isDark?: boolean;
}

export function MeridianSalesLedgerReport({ dataAdapter, isDark }: MeridianSalesLedgerReportProps) {
  const [report, setReport] = useState<LedgerReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildMeridianSalesLedgerReport(dataAdapter)
      .then((next) => {
        if (!cancelled) setReport(next);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : "Failed to build ledger report");
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
          name: "SalesInvoiceLedger",
          label: { id: "Rekonsiliasi Faktur & Buku Besar", en: "Sales Invoice Ledger" },
          summaries: [
            { label: { id: "Terposting", en: "Posted" }, value: `${summary.postedCount}/${summary.invoiceCount}` },
            { label: { id: "Draft (belum posting)", en: "Draft (unposted)" }, value: summary.draftCount },
            { label: { id: "Dibatalkan", en: "Cancelled" }, value: summary.cancelledCount },
            { label: { id: "Nota Kredit", en: "Credit Notes" }, value: formatIDR(summary.totalCreditNotes) },
            { label: { id: "Voucher Tak Seimbang", en: "Unbalanced Vouchers" }, value: summary.unbalancedVoucherCount },
            { label: { id: "Selisih Tie-out", en: "Tie-out Difference" }, value: formatIDR(summary.tieOutDifference) },
          ],
          columns: [
            { key: "invoiceId", label: { id: "Faktur", en: "Invoice" } },
            { key: "customerName", label: { id: "Pelanggan", en: "Customer" } },
            { key: "status", label: { id: "Status", en: "Status" } },
            { key: "total", label: { id: "Nilai", en: "Total" }, align: "right" },
            { key: "postedLabel", label: { id: "Posting GL", en: "GL Posting" } },
            { key: "balancedLabel", label: { id: "Seimbang", en: "Balanced" } },
            { key: "arDebit", label: { id: "Debet Piutang", en: "AR Debit" }, align: "right" },
            { key: "netReceivable", label: { id: "Piutang Neto", en: "Net Receivable" }, align: "right" },
          ],
          dataSource: report.rows.map((row) => ({
            ...row,
            total: formatIDR(row.total),
            arDebit: formatIDR(row.arDebit),
            netReceivable: formatIDR(row.netReceivable),
            postedLabel: row.reversed ? "Reversed" : row.posted ? "Posted" : "Not posted",
            balancedLabel: row.posted ? (row.voucherBalanced ? "Balanced" : "UNBALANCED") : "—",
          })),
        },
        { company: "meridian", lang: "en", docId: "meridian-sales-invoice-ledger" },
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
    return <div className="p-6 text-sm text-[#6b7280]">Loading sales invoice ledger…</div>;
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
