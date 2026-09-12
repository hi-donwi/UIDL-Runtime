import { useEffect, useMemo, useState } from "react";
import { UIDocumentRenderer } from "~/renderer/UIDocumentRenderer";
import { DocumentSchema } from "~/schemas/document";
import { createDocumentState } from "~/state/createDocumentState";
import { meridianDarkTheme, meridianLightTheme } from "~/theme/meridianPreset";
import { buildReportPage } from "@uidl-runtime/templates/domain/generators";
import { buildSchoolDunningReport, type SchoolDunningReport } from "@uidl-runtime/templates/domain/services/schoolDunningService";
import { formatIDR } from "@uidl-runtime/templates/domain/services/posService";
import type { DataAdapter } from "~/data/types";

interface SchoolDunningReportRouteProps {
  dataAdapter: DataAdapter;
  isDark?: boolean;
}

const AS_OF = "2026-08-28";

export function SchoolDunningReportRoute({ dataAdapter, isDark }: SchoolDunningReportRouteProps) {
  const [report, setReport] = useState<SchoolDunningReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildSchoolDunningReport(dataAdapter, { companyId: "school-abc", asOf: AS_OF })
      .then((nextReport) => {
        if (!cancelled) setReport(nextReport);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : "Failed to build dunning report");
      });
    return () => {
      cancelled = true;
    };
  }, [dataAdapter]);

  const document = useMemo(() => {
    if (!report) return null;
    return DocumentSchema.parse(buildReportPage({
      name: "SchoolDunningReport",
      label: { id: "Laporan Tunggakan Sekolah", en: "School Dunning Report" },
      summaries: [
        { label: { id: "Outstanding", en: "Outstanding" }, value: formatIDR(report.summary.totalOutstanding) },
        { label: { id: "Overdue", en: "Overdue" }, value: formatIDR(report.summary.overdueOutstanding) },
        { label: { id: "Overdue Invoices", en: "Overdue Invoices" }, value: report.summary.overdueInvoiceCount },
        { label: { id: "Highest Aging", en: "Highest Aging" }, value: `${report.summary.highestDaysOverdue} days` },
      ],
      columns: [
        { key: "studentName", label: { id: "Siswa", en: "Student" } },
        { key: "grade", label: { id: "Kelas", en: "Grade" } },
        { key: "dueDate", label: { id: "Due Date", en: "Due Date" } },
        { key: "outstanding", label: { id: "Outstanding", en: "Outstanding" }, align: "right" },
        { key: "daysOverdue", label: { id: "Aging", en: "Aging" }, align: "right" },
        { key: "stage", label: { id: "Reminder Stage", en: "Reminder Stage" } },
        { key: "dunningCount", label: { id: "Notices", en: "Notices" }, align: "right" },
      ],
      dataSource: report.rows.map((row) => ({
        ...row,
        outstanding: formatIDR(row.outstandingAmount),
        daysOverdue: `${row.daysOverdue} days`,
      })),
    }, { company: "school-abc", lang: "en", docId: "school-dunning-report" }));
  }, [report]);

  const stateStore = useMemo(() => (document ? createDocumentState(document.state ?? {}).getState() : undefined), [document]);

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }
  if (!document || !stateStore) {
    return <div className="p-6 text-sm text-slate-500">Loading school dunning report...</div>;
  }

  return <UIDocumentRenderer document={document} theme={isDark ? meridianDarkTheme : meridianLightTheme} dataSources={document.dataSources} stateStore={stateStore} />;
}
