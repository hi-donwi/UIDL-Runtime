import { useEffect, useMemo, useState } from "react";
import { UIDocumentRenderer } from "~/renderer/UIDocumentRenderer";
import { DocumentSchema } from "~/schemas/document";
import { createDocumentState } from "~/state/createDocumentState";
import { meridianDarkTheme, meridianLightTheme } from "~/theme/meridianPreset";
import { buildReportPage } from "@uidl-runtime/templates/domain/generators";
import {
  buildKoperasiCollectibilityReport,
  KOPERASI_COLLECTIBILITY_AS_OF,
  type KoperasiCollectibilityReport,
} from "@uidl-runtime/templates/domain/services/koperasiCollectibilityService";
import { formatIDR } from "@uidl-runtime/templates/domain/services/posService";
import type { DataAdapter } from "~/data/types";

interface KoperasiCollectibilityReportRouteProps {
  dataAdapter: DataAdapter;
  isDark?: boolean;
}

export function KoperasiCollectibilityReportRoute({ dataAdapter, isDark }: KoperasiCollectibilityReportRouteProps) {
  const [report, setReport] = useState<KoperasiCollectibilityReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildKoperasiCollectibilityReport(dataAdapter, { companyId: "koperasi-bmt", asOf: KOPERASI_COLLECTIBILITY_AS_OF })
      .then((nextReport) => {
        if (!cancelled) setReport(nextReport);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : "Failed to build collectibility report");
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
          name: "KoperasiCollectibilityReport",
          label: { id: "Kolektibilitas Pembiayaan Murabahah", en: "Murabahah Collectibility" },
          summaries: [
            { label: { id: "NPF Ratio", en: "NPF Ratio" }, value: `${(summary.nplRatio * 100).toFixed(1)}%` },
            { label: { id: "Baki Debet", en: "Outstanding" }, value: formatIDR(summary.totalOutstandingPrincipal) },
            { label: { id: "CKPN", en: "CKPN Reserve" }, value: formatIDR(summary.totalCkpnReserve) },
            { label: { id: "Non-Performing", en: "Non-Performing" }, value: formatIDR(summary.nonPerformingOutstanding) },
            { label: { id: "DPD Tertinggi", en: "Highest DPD" }, value: `${summary.highestDaysPastDue} days` },
          ],
          columns: [
            { key: "agreementId", label: { id: "Akad", en: "Agreement" } },
            { key: "memberName", label: { id: "Anggota", en: "Member" } },
            { key: "outstanding", label: { id: "Baki Debet", en: "Outstanding" }, align: "right" },
            { key: "paidProgress", label: { id: "Angsuran", en: "Installments" }, align: "right" },
            { key: "earliestUnpaidDueDate", label: { id: "Jatuh Tempo Tertunggak", en: "Earliest Unpaid Due" } },
            { key: "daysPastDue", label: { id: "DPD", en: "DPD" }, align: "right" },
            { key: "grade", label: { id: "Kolektibilitas", en: "Collectibility" } },
            { key: "ckpn", label: { id: "CKPN", en: "CKPN" }, align: "right" },
          ],
          dataSource: report.rows.map((row) => ({
            ...row,
            outstanding: formatIDR(row.outstandingPrincipal),
            paidProgress: `${row.paidInstallmentCount}/${row.installmentCount}`,
            earliestUnpaidDueDate: row.earliestUnpaidDueDate ?? "—",
            daysPastDue: `${row.daysPastDue}`,
            ckpn: formatIDR(row.ckpnReserve),
          })),
        },
        { company: "koperasi-bmt", lang: "en", docId: "koperasi-collectibility-report" },
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
    return <div className="p-6 text-sm text-slate-500">Loading koperasi collectibility report...</div>;
  }

  return (
    <div className="space-y-4">
      <UIDocumentRenderer
        document={document}
        theme={isDark ? meridianDarkTheme : meridianLightTheme}
        dataSources={document.dataSources}
        stateStore={stateStore}
      />
      <div className="mx-6 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-5 dark:text-slate-300">
        {report.summary.tiers.map((tier) => (
          <div key={tier.tier} className="rounded-md border border-slate-200 p-2 dark:border-slate-700">
            <div className="font-semibold">{tier.grade}</div>
            <div>{tier.agreementCount} akad</div>
            <div>{formatIDR(tier.ckpnReserve)} CKPN</div>
          </div>
        ))}
      </div>
      <ul className="mx-6 mb-6 list-disc space-y-1 pl-5 text-xs text-slate-500 dark:text-slate-400">
        {report.controls.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
