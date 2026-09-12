import { useEffect, useMemo, useState } from "react";
import { UIDocumentRenderer } from "~/renderer/UIDocumentRenderer";
import { DocumentSchema } from "~/schemas/document";
import { createDocumentState } from "~/state/createDocumentState";
import { meridianDarkTheme, meridianLightTheme } from "~/theme/meridianPreset";
import { buildReportPage } from "@uidl-runtime/templates/domain/generators";
import {
  buildHospitalReconciliationReport,
  type HospitalReconciliationReport,
} from "@uidl-runtime/templates/domain/services/hospitalReconciliationService";
import { formatIDR } from "@uidl-runtime/templates/domain/services/posService";
import type { DataAdapter } from "~/data/types";

interface HospitalReconciliationReportRouteProps {
  dataAdapter: DataAdapter;
  isDark?: boolean;
}

const AS_OF = "2026-08-28";

export function HospitalReconciliationReportRoute({ dataAdapter, isDark }: HospitalReconciliationReportRouteProps) {
  const [report, setReport] = useState<HospitalReconciliationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildHospitalReconciliationReport(dataAdapter, { companyId: "hospital-medika", asOf: AS_OF })
      .then((nextReport) => {
        if (!cancelled) setReport(nextReport);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : "Failed to build reconciliation report");
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
          name: "HospitalClaimReconciliation",
          label: { id: "Rekonsiliasi Tagihan & Klaim RS", en: "Hospital Claim Reconciliation" },
          summaries: [
            { label: { id: "Outstanding", en: "Outstanding" }, value: formatIDR(summary.totalOutstanding) },
            { label: { id: "Ditagih", en: "Billed" }, value: formatIDR(summary.totalBilled) },
            { label: { id: "Write-off", en: "Write-off" }, value: formatIDR(summary.totalWriteOff) },
            { label: { id: "Disengketakan", en: "Disputed" }, value: formatIDR(summary.totalDisputed) },
            { label: { id: "Approval Klaim", en: "Claim Approval" }, value: `${(summary.claimApprovalRate * 100).toFixed(1)}%` },
          ],
          columns: [
            { key: "patientName", label: { id: "Pasien", en: "Patient" } },
            { key: "payer", label: { id: "Penjamin", en: "Payer" } },
            { key: "billed", label: { id: "Ditagih", en: "Billed" }, align: "right" },
            { key: "approved", label: { id: "Disetujui", en: "Approved" }, align: "right" },
            { key: "writeOff", label: { id: "Write-off", en: "Write-off" }, align: "right" },
            { key: "paid", label: { id: "Dibayar", en: "Paid" }, align: "right" },
            { key: "outstanding", label: { id: "Outstanding", en: "Outstanding" }, align: "right" },
            { key: "status", label: { id: "Status", en: "Status" } },
          ],
          dataSource: report.rows.map((row) => ({
            ...row,
            billed: formatIDR(row.billedAmount),
            approved: row.approvedAmount == null ? "—" : formatIDR(row.approvedAmount),
            writeOff: formatIDR(row.writeOffAmount),
            paid: formatIDR(row.paidAmount),
            outstanding: formatIDR(row.outstandingAmount),
          })),
        },
        { company: "hospital-medika", lang: "en", docId: "hospital-claim-reconciliation" },
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
    return <div className="p-6 text-sm text-slate-500">Loading hospital reconciliation report...</div>;
  }

  return (
    <div className="space-y-4">
      <UIDocumentRenderer
        document={document}
        theme={isDark ? meridianDarkTheme : meridianLightTheme}
        dataSources={document.dataSources}
        stateStore={stateStore}
      />
      <ul className="mx-6 mb-6 list-disc space-y-1 pl-5 text-xs text-slate-500 dark:text-slate-400">
        {report.controls.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
