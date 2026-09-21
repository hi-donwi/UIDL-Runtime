import { useEffect, useMemo, useState } from "react";
import { UIDocumentRenderer } from "~/renderer/UIDocumentRenderer";
import { DocumentSchema } from "~/schemas/document";
import { createDocumentState } from "~/state/createDocumentState";
import { meridianDarkTheme, meridianLightTheme } from "~/theme/meridianPreset";
import type { DataAdapter } from "~/data/types";
import { buildReportPage } from "../domain/generators";
import { buildDashboardDocument, type DashboardFinancials, type DashboardInvoiceSources } from "./reports";
import { totalPayables } from "./ledger";
import {
  buildMeridianLedgerReport,
  loadMeridianLedgerPostings,
  type LedgerPostingRow,
  type MeridianLedgerReport as LedgerSummaryReport,
} from "../domain/services/meridianLedgerService";
import { formatIDR } from "../domain/services/posService";

/**
 * The four Meridian financial statements, read from the adapter `GeneralLedger` (Meridian tenant)
 * so every behavioural slice — Sales Invoice submit/cancel, POS, payments, stock — flows into
 * them. `MeridianReferenceRoute` renders these instead of the static `meridian/ledger.ts` builders
 * (which stay registered as an as-seeded fallback for direct URLs / SSR / the coverage test).
 */

interface ReportProps {
  dataAdapter: DataAdapter;
  isDark?: boolean;
}

function useRenderedDocument(document: ReturnType<typeof DocumentSchema.parse> | null, isDark?: boolean) {
  const stateStore = useMemo(
    () => (document ? createDocumentState(document.state ?? {}).getState() : undefined),
    [document],
  );
  if (!document || !stateStore) return null;
  return (
    <UIDocumentRenderer
      document={document}
      theme={isDark ? meridianDarkTheme : meridianLightTheme}
      dataSources={document.dataSources}
      stateStore={stateStore}
    />
  );
}

// --- General Ledger ---------------------------------------------------------

export function MeridianGeneralLedgerReport({ dataAdapter, isDark }: ReportProps) {
  const [rows, setRows] = useState<LedgerPostingRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadMeridianLedgerPostings(dataAdapter).then((next) => !cancelled && setRows(next));
    return () => {
      cancelled = true;
    };
  }, [dataAdapter]);

  const document = useMemo(() => {
    if (!rows) return null;
    const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0);
    const totalCredit = rows.reduce((sum, row) => sum + row.credit, 0);
    return DocumentSchema.parse(
      buildReportPage(
        {
          name: "GeneralLedger",
          label: { id: "Buku Besar", en: "General Ledger" },
          summaries: [
            { label: { id: "Total Debit", en: "Total Debit" }, value: formatIDR(totalDebit) },
            { label: { id: "Total Kredit", en: "Total Credit" }, value: formatIDR(totalCredit) },
            { label: { id: "Selisih", en: "Difference" }, value: formatIDR(totalDebit - totalCredit) },
            { label: { id: "Baris", en: "Lines" }, value: rows.length },
          ],
          columns: [
            { key: "date", label: { id: "Tanggal", en: "Date" } },
            { key: "voucher", label: { id: "Voucher", en: "Voucher" } },
            { key: "accountName", label: { id: "Akun", en: "Account" } },
            { key: "remarks", label: { id: "Keterangan", en: "Narration" } },
            { key: "debit", label: { id: "Debit", en: "Debit" }, align: "right" },
            { key: "credit", label: { id: "Kredit", en: "Credit" }, align: "right" },
          ],
          dataSource: rows.map((row) => ({
            ...row,
            debit: row.debit ? formatIDR(row.debit) : "—",
            credit: row.credit ? formatIDR(row.credit) : "—",
          })),
        },
        { company: "meridian", lang: "en", docId: "meridian-general-ledger" },
      ),
    );
  }, [rows]);

  const rendered = useRenderedDocument(document, isDark);
  return rendered ?? <div className="p-6 text-sm text-[#6b7280]">Loading general ledger…</div>;
}

// --- Trial Balance --------------------------------------------------------

export function MeridianTrialBalanceReport({ dataAdapter, isDark }: ReportProps) {
  const [report, setReport] = useState<LedgerSummaryReport | null>(null);
  useEffect(() => {
    let cancelled = false;
    buildMeridianLedgerReport(dataAdapter).then((next) => !cancelled && setReport(next));
    return () => {
      cancelled = true;
    };
  }, [dataAdapter]);

  const document = useMemo(() => {
    if (!report) return null;
    const totalDebit = report.rows.reduce((sum, row) => sum + row.debit, 0);
    const totalCredit = report.rows.reduce((sum, row) => sum + row.credit, 0);
    return DocumentSchema.parse(
      buildReportPage(
        {
          name: "TrialBalance",
          label: { id: "Neraca Saldo", en: "Trial Balance" },
          summaries: [
            { label: { id: "Total Debit", en: "Total Debit" }, value: formatIDR(totalDebit) },
            { label: { id: "Total Kredit", en: "Total Credit" }, value: formatIDR(totalCredit) },
            { label: { id: "Selisih", en: "Difference" }, value: formatIDR(totalDebit - totalCredit) },
          ],
          columns: [
            { key: "account", label: { id: "Kode", en: "Code" } },
            { key: "accountName", label: { id: "Akun", en: "Account" } },
            { key: "rootType", label: { id: "Tipe", en: "Type" } },
            { key: "debit", label: { id: "Debit", en: "Debit" }, align: "right" },
            { key: "credit", label: { id: "Kredit", en: "Credit" }, align: "right" },
          ],
          dataSource: report.rows.map((row) => ({
            ...row,
            debit: row.debit ? formatIDR(row.debit) : "—",
            credit: row.credit ? formatIDR(row.credit) : "—",
          })),
        },
        { company: "meridian", lang: "en", docId: "meridian-trial-balance" },
      ),
    );
  }, [report]);

  const rendered = useRenderedDocument(document, isDark);
  return rendered ?? <div className="p-6 text-sm text-[#6b7280]">Loading trial balance…</div>;
}

// --- Profit and Loss ----------------------------------------------------

export function MeridianProfitAndLossReport({ dataAdapter, isDark }: ReportProps) {
  const [report, setReport] = useState<LedgerSummaryReport | null>(null);
  useEffect(() => {
    let cancelled = false;
    buildMeridianLedgerReport(dataAdapter).then((next) => !cancelled && setReport(next));
    return () => {
      cancelled = true;
    };
  }, [dataAdapter]);

  const document = useMemo(() => {
    if (!report) return null;
    const { byRootType, netIncome } = report.summary;
    const rows = report.rows
      .filter((row) => row.rootType === "Income" || row.rootType === "Expense")
      .map((row) => ({ section: row.rootType, accountName: row.accountName, amount: formatIDR(row.balance) }));
    return DocumentSchema.parse(
      buildReportPage(
        {
          name: "ProfitAndLoss",
          label: { id: "Laba Rugi", en: "Profit and Loss" },
          summaries: [
            { label: { id: "Total Pendapatan", en: "Total Income" }, value: formatIDR(byRootType.Income) },
            { label: { id: "Total Beban", en: "Total Expense" }, value: formatIDR(byRootType.Expense) },
            { label: { id: "Laba Bersih", en: "Net Profit" }, value: formatIDR(netIncome) },
          ],
          columns: [
            { key: "section", label: { id: "Bagian", en: "Section" } },
            { key: "accountName", label: { id: "Akun", en: "Account" } },
            { key: "amount", label: { id: "Jumlah", en: "Amount" }, align: "right" },
          ],
          dataSource: rows,
        },
        { company: "meridian", lang: "en", docId: "meridian-profit-and-loss" },
      ),
    );
  }, [report]);

  const rendered = useRenderedDocument(document, isDark);
  return rendered ?? <div className="p-6 text-sm text-[#6b7280]">Loading profit and loss…</div>;
}

// --- Balance Sheet -----------------------------------------------------

export function MeridianBalanceSheetReport({ dataAdapter, isDark }: ReportProps) {
  const [report, setReport] = useState<LedgerSummaryReport | null>(null);
  useEffect(() => {
    let cancelled = false;
    buildMeridianLedgerReport(dataAdapter).then((next) => !cancelled && setReport(next));
    return () => {
      cancelled = true;
    };
  }, [dataAdapter]);

  const document = useMemo(() => {
    if (!report) return null;
    const { byRootType, netIncome } = report.summary;
    const rows = [
      ...report.rows.filter((row) => row.rootType === "Asset").map((row) => ({ section: "Asset", accountName: row.accountName, amount: formatIDR(row.balance) })),
      ...report.rows.filter((row) => row.rootType === "Liability").map((row) => ({ section: "Liability", accountName: row.accountName, amount: formatIDR(row.balance) })),
      ...report.rows.filter((row) => row.rootType === "Equity").map((row) => ({ section: "Equity", accountName: row.accountName, amount: formatIDR(row.balance) })),
      { section: "Equity", accountName: "Current Year Earnings", amount: formatIDR(netIncome) },
    ];
    const equityWithEarnings = byRootType.Equity + netIncome;
    return DocumentSchema.parse(
      buildReportPage(
        {
          name: "BalanceSheet",
          label: { id: "Neraca", en: "Balance Sheet" },
          summaries: [
            { label: { id: "Aset", en: "Assets" }, value: formatIDR(byRootType.Asset) },
            { label: { id: "Liabilitas", en: "Liabilities" }, value: formatIDR(byRootType.Liability) },
            { label: { id: "Ekuitas + Laba", en: "Equity + Earnings" }, value: formatIDR(equityWithEarnings) },
            {
              label: { id: "Selisih", en: "Difference" },
              value: formatIDR(byRootType.Asset - byRootType.Liability - equityWithEarnings),
            },
          ],
          columns: [
            { key: "section", label: { id: "Bagian", en: "Section" } },
            { key: "accountName", label: { id: "Akun", en: "Account" } },
            { key: "amount", label: { id: "Jumlah", en: "Amount" }, align: "right" },
          ],
          dataSource: rows,
        },
        { company: "meridian", lang: "en", docId: "meridian-balance-sheet" },
      ),
    );
  }, [report]);

  const rendered = useRenderedDocument(document, isDark);
  return rendered ?? <div className="p-6 text-sm text-[#6b7280]">Loading balance sheet…</div>;
}

// --- Dashboard --------------------------------------------------------

export function MeridianDashboard({ dataAdapter, isDark }: ReportProps) {
  const [report, setReport] = useState<LedgerSummaryReport | null>(null);
  const [invoiceSources, setInvoiceSources] = useState<DashboardInvoiceSources | null>(null);
  useEffect(() => {
    let cancelled = false;
    buildMeridianLedgerReport(dataAdapter).then((next) => !cancelled && setReport(next));
    // Non-financial "Unpaid Invoices" widgets read the live adapter collections so submitted
    // Sales/Purchase invoices move the paid/unpaid split.
    Promise.all([
      dataAdapter.query<Record<string, unknown>>({ collection: "SalesInvoice" }),
      dataAdapter.query<Record<string, unknown>>({ collection: "PurchaseInvoice" }),
    ]).then(([sales, purchase]) => {
      if (cancelled) return;
      const map = (rows: Array<Record<string, unknown>>) =>
        rows
          .filter((row) => row.status !== "Cancelled")
          .map((row) => ({ status: String(row.status ?? ""), total: Number(row.total ?? 0) }));
      setInvoiceSources({ sales: map(sales.rows), purchase: map(purchase.rows) });
    });
    return () => {
      cancelled = true;
    };
  }, [dataAdapter]);

  const document = useMemo(() => {
    if (!report || !invoiceSources) return null;
    const balanceOf = (code: string) => report.rows.find((row) => row.account === code)?.balance ?? 0;
    const financials: DashboardFinancials = {
      receivables: balanceOf("1130"),
      // Live AP control balance (net credit on 2110) from the Meridian purchase cycle; falls
      // back to the static meridian/ledger.ts figure if no purchase vouchers are present.
      payables: balanceOf("2110") || totalPayables(),
      cash: balanceOf("1110") + balanceOf("1125"),
      netProfit: report.summary.netIncome,
      income: report.summary.byRootType.Income,
      expense: report.summary.byRootType.Expense,
      expenseBreakdown: report.rows
        .filter((row) => row.rootType === "Expense" && row.balance !== 0)
        .map((row) => ({ label: row.accountName, value: row.balance })),
    };
    return DocumentSchema.parse(buildDashboardDocument(financials, invoiceSources));
  }, [report, invoiceSources]);

  const rendered = useRenderedDocument(document, isDark);
  return rendered ?? <div className="p-6 text-sm text-[#6b7280]">Loading dashboard…</div>;
}
