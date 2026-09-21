import { useEffect, useMemo, useState } from "react";
import { UIDocumentRenderer } from "~/renderer/UIDocumentRenderer";
import { DocumentSchema } from "~/schemas/document";
import { createDocumentState } from "~/state/createDocumentState";
import { meridianDarkTheme, meridianLightTheme } from "~/theme/meridianPreset";
import { buildReportPage } from "@uidl-runtime/templates/domain/generators";
import {
  buildHelpdeskSlaReport,
  type HelpdeskSlaReport,
} from "@uidl-runtime/templates/domain/services/helpdeskSlaService";
import { HELPDESK_SLA_AS_OF } from "@uidl-runtime/templates/mock-data/generators/helpdeskSlaTimeline";
import type { DataAdapter } from "~/data/types";

interface HelpdeskSlaReportRouteProps {
  dataAdapter: DataAdapter;
  isDark?: boolean;
}

export function HelpdeskSlaReportRoute({ dataAdapter, isDark }: HelpdeskSlaReportRouteProps) {
  const [report, setReport] = useState<HelpdeskSlaReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildHelpdeskSlaReport(dataAdapter, { companyId: "helpdesk", asOf: HELPDESK_SLA_AS_OF })
      .then((nextReport) => {
        if (!cancelled) setReport(nextReport);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : "Failed to build SLA report");
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
          name: "HelpdeskSlaReport",
          label: { id: "Laporan SLA & Eskalasi Helpdesk", en: "Helpdesk SLA Report" },
          summaries: [
            { label: { id: "SLA Attainment", en: "SLA Attainment" }, value: `${(summary.slaAttainmentPct * 100).toFixed(1)}%` },
            { label: { id: "Breach", en: "Breached" }, value: summary.breachedCount },
            { label: { id: "At Risk", en: "At Risk" }, value: summary.atRiskCount },
            { label: { id: "Tereskalasi", en: "Escalated" }, value: summary.escalatedCount },
            { label: { id: "Jam Ter-pause", en: "Paused Hours" }, value: `${(summary.totalPausedMinutes / 60).toFixed(1)}h` },
          ],
          columns: [
            { key: "ticketId", label: { id: "Tiket", en: "Ticket" } },
            { key: "priority", label: { id: "Prioritas", en: "Priority" } },
            { key: "status", label: { id: "Status", en: "Status" } },
            { key: "slaDue", label: { id: "SLA (mnt)", en: "SLA (min)" }, align: "right" },
            { key: "elapsed", label: { id: "Elapsed (mnt)", en: "Elapsed (min)" }, align: "right" },
            { key: "paused", label: { id: "Pause (mnt)", en: "Paused (min)" }, align: "right" },
            { key: "consumed", label: { id: "Terpakai", en: "Consumed" }, align: "right" },
            { key: "breachStatus", label: { id: "Status SLA", en: "SLA Status" } },
            { key: "escalation", label: { id: "Eskalasi", en: "Escalation" } },
          ],
          dataSource: report.rows.map((row) => ({
            ...row,
            slaDue: row.slaDueMinutes,
            elapsed: row.elapsedMinutes,
            paused: row.pausedMinutes,
            consumed: `${Math.round(row.slaConsumedPct * 100)}%`,
            escalation: row.escalated ? "Escalated" : row.escalationRecommended ? "Recommend" : "—",
          })),
        },
        { company: "helpdesk", lang: "en", docId: "helpdesk-sla-report" },
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
    return <div className="p-6 text-sm text-slate-500">Loading helpdesk SLA report...</div>;
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
