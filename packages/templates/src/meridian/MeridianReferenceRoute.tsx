import { useMemo } from "react";
import { UIDocumentRenderer } from "~/renderer/UIDocumentRenderer";
import { meridianDarkTheme, meridianLightTheme } from "~/theme/meridianPreset";
import { DocumentSchema } from "~/schemas/document";
import { createDocumentState } from "~/state/createDocumentState";
import { MeridianShell } from "../MeridianShell";
import { dataAdapter, mutationHandler } from "../config/data.config";
import { MERIDIAN_SIDEBAR } from "./sidebarConfig";
import { getPageRegistryEntry } from "./pages";
import { parseMeridianRoute, routeTitle } from "./routing";
import { buildChartOfAccountsDocument, buildDashboardDocument, getReportBuilder } from "./reports";
import { buildPosDocument } from "./pointOfSale";
import {
  buildCustomizeFormDocument,
  buildGetStartedDocument,
  buildImportWizardDocument,
  buildSettingsDocument,
  buildTemplateBuilderDocument,
  buildErpCloudSyncDocument,
  buildBackupRestoreDocument,
  buildSetupWizardDocument,
} from "./settingsAndMeta";
import {
  buildTaxInvoicePrintDocument,
  buildDeliveryNotePrintDocument,
  buildPurchaseOrderPrintDocument,
  buildCertificateOfAnalysisPrintDocument,
  buildMedicalPrescriptionPrintDocument,
  buildAkadMurabahahPrintDocument,
  buildPackingSlipPrintDocument,
  buildPosReceiptPrintDocument,
  buildTuitionInvoicePrintDocument,
  buildWorkOrderPrintDocument,
  buildRoastingProfilePrintDocument,
  buildBastPrintDocument,
  buildCommercialQuotationPrintDocument,
  buildSlaIncidentReportPrintDocument,
} from "./printFormats";
import { Icon } from "./icons";
import { MeridianSalesLedgerReport } from "./MeridianSalesLedgerReport";
import { MeridianPosShiftReport } from "./MeridianPosShiftReport";
import { MeridianReceivablesReport } from "./MeridianReceivablesReport";
import { MeridianPayablesReport } from "./MeridianPayablesReport";
import { MeridianJournalEntryForm } from "./MeridianJournalEntryForm";
import { MeridianImportWizard } from "./MeridianImportWizard";
import { MeridianStockValuationReport } from "./MeridianStockValuationReport";
import {
  MeridianBalanceSheetReport,
  MeridianDashboard,
  MeridianGeneralLedgerReport,
  MeridianProfitAndLossReport,
  MeridianTrialBalanceReport,
} from "./MeridianFinancialReports";
import { MeridianPosScreen } from "./MeridianPosScreen";

const FINANCIAL_STATEMENT_COMPONENTS: Record<
  string,
  (props: { dataAdapter: typeof dataAdapter; isDark?: boolean }) => React.ReactElement
> = {
  GeneralLedger: MeridianGeneralLedgerReport,
  TrialBalance: MeridianTrialBalanceReport,
  ProfitAndLoss: MeridianProfitAndLossReport,
  BalanceSheet: MeridianBalanceSheetReport,
};

export interface MeridianReferenceRouteProps {
  path: string;
  onNavigate: (path: string) => void;
  onBack: () => void;
  isDark?: boolean;
}

export function MeridianReferenceRoute({ path, onNavigate, onBack, isDark }: MeridianReferenceRouteProps) {
  const route = useMemo(() => parseMeridianRoute(path), [path]);

  const listEntry = route.kind === "list" && route.doctype ? getPageRegistryEntry(route.doctype) : undefined;
  const actions = useMemo(() => {
    if (!listEntry?.newRoute) return undefined;
    return [
      {
        label: `+ Add ${route.doctype}`,
        variant: "primary" as const,
        onClick: () => onNavigate(listEntry.newRoute!),
      },
    ];
  }, [listEntry, onNavigate, route.doctype]);

  const document = useMemo(() => {
    if (route.kind === "list" && route.doctype) {
      const entry = getPageRegistryEntry(route.doctype);
      return entry ? DocumentSchema.parse(entry.list()) : null;
    }
    if (route.kind === "edit" && route.doctype && route.id) {
      const entry = getPageRegistryEntry(route.doctype);
      const doc = entry?.form(route.id);
      return doc ? DocumentSchema.parse(doc) : null;
    }
    if (route.kind === "print" && route.templateId && route.id) {
      if (route.templateId === "tax-invoice") {
        const doc = buildTaxInvoicePrintDocument(route.id);
        return doc ? DocumentSchema.parse(doc) : null;
      }
      if (route.templateId === "delivery-note") {
        const doc = buildDeliveryNotePrintDocument(route.id);
        return doc ? DocumentSchema.parse(doc) : null;
      }
      if (route.templateId === "purchase-order") {
        const doc = buildPurchaseOrderPrintDocument(route.id);
        return doc ? DocumentSchema.parse(doc) : null;
      }
      if (route.templateId === "certificate-of-analysis") {
        const doc = buildCertificateOfAnalysisPrintDocument(route.id);
        return doc ? DocumentSchema.parse(doc) : null;
      }
      if (route.templateId === "medical-prescription") {
        const doc = buildMedicalPrescriptionPrintDocument(route.id);
        return doc ? DocumentSchema.parse(doc) : null;
      }
      if (route.templateId === "akad-murabahah") {
        const doc = buildAkadMurabahahPrintDocument(route.id);
        return doc ? DocumentSchema.parse(doc) : null;
      }
      if (route.templateId === "packing-slip") {
        const doc = buildPackingSlipPrintDocument(route.id);
        return doc ? DocumentSchema.parse(doc) : null;
      }
      if (route.templateId === "pos-receipt") {
        const doc = buildPosReceiptPrintDocument(route.id);
        return doc ? DocumentSchema.parse(doc) : null;
      }
      if (route.templateId === "tuition-invoice") {
        const doc = buildTuitionInvoicePrintDocument(route.id);
        return doc ? DocumentSchema.parse(doc) : null;
      }
      if (route.templateId === "work-order") {
        const doc = buildWorkOrderPrintDocument(route.id);
        return doc ? DocumentSchema.parse(doc) : null;
      }
      if (route.templateId === "roasting-profile") {
        const doc = buildRoastingProfilePrintDocument(route.id);
        return doc ? DocumentSchema.parse(doc) : null;
      }
      if (route.templateId === "bast-milestone") {
        const doc = buildBastPrintDocument(route.id);
        return doc ? DocumentSchema.parse(doc) : null;
      }
      if (route.templateId === "commercial-quotation") {
        const doc = buildCommercialQuotationPrintDocument(route.id);
        return doc ? DocumentSchema.parse(doc) : null;
      }
      if (route.templateId === "sla-incident") {
        const doc = buildSlaIncidentReportPrintDocument(route.id);
        return doc ? DocumentSchema.parse(doc) : null;
      }
    }
    if (route.kind === "dashboard") return DocumentSchema.parse(buildDashboardDocument());
    if (route.kind === "chart-of-accounts") return DocumentSchema.parse(buildChartOfAccountsDocument());
    if (route.kind === "report" && route.reportName) {
      const builder = getReportBuilder(route.reportName);
      return builder ? DocumentSchema.parse(builder()) : null;
    }
    if (route.kind === "pos") return DocumentSchema.parse(buildPosDocument());
    if (route.kind === "settings") return DocumentSchema.parse(buildSettingsDocument());
    if (route.kind === "erp-cloud-sync") return DocumentSchema.parse(buildErpCloudSyncDocument());
    if (route.kind === "backup-restore") return DocumentSchema.parse(buildBackupRestoreDocument());
    if (route.kind === "get-started") return DocumentSchema.parse(buildGetStartedDocument());
    if (route.kind === "import-wizard") return DocumentSchema.parse(buildImportWizardDocument());
    if (route.kind === "customize-form") return DocumentSchema.parse(buildCustomizeFormDocument());
    if (route.kind === "template-builder") return DocumentSchema.parse(buildTemplateBuilderDocument());
    if (route.kind === "setup-wizard") return DocumentSchema.parse(buildSetupWizardDocument());
    return null;
  }, [route]);

  // Form documents carry pre-filled values in `document.state`, bound via `state.<field>` — a
  // stateStore has to be constructed from that same state or every field renders empty with an
  // "Unrecognized binding prefix" warning (UIDocumentRenderer never auto-creates one).
  const stateStore = useMemo(() => (document ? createDocumentState(document.state ?? {}).getState() : undefined), [document]);
  const activeTheme = isDark ? meridianDarkTheme : meridianLightTheme;

  // Behavioural Sales Invoice ↔ GL reconciliation — an adapter-backed async report, so it is a
  // React child of the shell rather than a statically-built UIDL document.
  if (route.kind === "report" && route.reportName === "SalesInvoiceLedger") {
    return (
      <MeridianShell
        company="Meridian Trading Co."
        title="Sales Invoice Ledger"
        groups={MERIDIAN_SIDEBAR}
        activePath={path}
        onNavigate={onNavigate}
        onBack={onBack}
        isDark={isDark}
      >
        <MeridianSalesLedgerReport dataAdapter={dataAdapter} isDark={isDark} />
      </MeridianShell>
    );
  }

  if (route.kind === "report" && route.reportName === "POSShiftLedger") {
    return (
      <MeridianShell
        company="Meridian Trading Co."
        title="POS Shift Ledger"
        groups={MERIDIAN_SIDEBAR}
        activePath={path}
        onNavigate={onNavigate}
        onBack={onBack}
        isDark={isDark}
      >
        <MeridianPosShiftReport dataAdapter={dataAdapter} isDark={isDark} />
      </MeridianShell>
    );
  }

  if (route.kind === "report" && route.reportName === "AccountsReceivable") {
    return (
      <MeridianShell
        company="Meridian Trading Co."
        title="Accounts Receivable"
        groups={MERIDIAN_SIDEBAR}
        activePath={path}
        onNavigate={onNavigate}
        onBack={onBack}
        isDark={isDark}
      >
        <MeridianReceivablesReport dataAdapter={dataAdapter} isDark={isDark} />
      </MeridianShell>
    );
  }

  // Behavioural Import Wizard — paste CSV → validated adapter record creation.
  if (route.kind === "import-wizard") {
    return (
      <MeridianShell
        company="Meridian Trading Co."
        title="Import Wizard"
        groups={MERIDIAN_SIDEBAR}
        activePath={path}
        onNavigate={onNavigate}
        onBack={onBack}
        isDark={isDark}
      >
        <MeridianImportWizard dataAdapter={dataAdapter} isDark={isDark} />
      </MeridianShell>
    );
  }

  // Behavioural ad-hoc Journal Entry — real Submit/Cancel → GL via meridianJournalEntryService.
  if (route.kind === "edit" && route.doctype === "JournalEntry" && route.id?.startsWith("JE-NIMB")) {
    return (
      <MeridianShell
        company="Meridian Trading Co."
        title="Journal Entry"
        groups={MERIDIAN_SIDEBAR}
        activePath={path}
        onNavigate={onNavigate}
        onBack={onBack}
        isDark={isDark}
      >
        <MeridianJournalEntryForm dataAdapter={dataAdapter} entryId={route.id} isDark={isDark} onNavigate={onNavigate} />
      </MeridianShell>
    );
  }

  if (route.kind === "report" && route.reportName === "AccountsPayable") {
    return (
      <MeridianShell
        company="Meridian Trading Co."
        title="Accounts Payable"
        groups={MERIDIAN_SIDEBAR}
        activePath={path}
        onNavigate={onNavigate}
        onBack={onBack}
        isDark={isDark}
      >
        <MeridianPayablesReport dataAdapter={dataAdapter} isDark={isDark} />
      </MeridianShell>
    );
  }

  if (route.kind === "report" && route.reportName === "StockValuationLedger") {
    return (
      <MeridianShell
        company="Meridian Trading Co."
        title="Stock Valuation Ledger"
        groups={MERIDIAN_SIDEBAR}
        activePath={path}
        onNavigate={onNavigate}
        onBack={onBack}
        isDark={isDark}
      >
        <MeridianStockValuationReport dataAdapter={dataAdapter} isDark={isDark} />
      </MeridianShell>
    );
  }

  // The four financial statements read the adapter GeneralLedger (Meridian tenant) so every
  // behavioural slice flows into them; the sync builders in REPORT_BUILDERS stay as an
  // as-seeded fallback (direct URL / SSR / coverage test).
  if (route.kind === "dashboard") {
    return (
      <MeridianShell
        company="Meridian Trading Co."
        title={routeTitle(route)}
        groups={MERIDIAN_SIDEBAR}
        activePath={path}
        onNavigate={onNavigate}
        onBack={onBack}
        isDark={isDark}
      >
        <MeridianDashboard dataAdapter={dataAdapter} isDark={isDark} />
      </MeridianShell>
    );
  }

  // Real POS: a shift + running-total cart + multi-tender checkout + denomination close,
  // driven by meridianPosService. buildPosDocument() stays as the coverage-test fallback.
  if (route.kind === "pos") {
    return (
      <MeridianShell
        company="Meridian Trading Co."
        title="Point of Sale"
        groups={MERIDIAN_SIDEBAR}
        activePath={path}
        onNavigate={onNavigate}
        onBack={onBack}
        isDark={isDark}
      >
        <MeridianPosScreen dataAdapter={dataAdapter} isDark={isDark} onNavigate={onNavigate} />
      </MeridianShell>
    );
  }

  if (route.kind === "report" && FINANCIAL_STATEMENT_COMPONENTS[route.reportName ?? ""]) {
    const StatementComponent = FINANCIAL_STATEMENT_COMPONENTS[route.reportName!];
    return (
      <MeridianShell
        company="Meridian Trading Co."
        title={routeTitle(route)}
        groups={MERIDIAN_SIDEBAR}
        activePath={path}
        onNavigate={onNavigate}
        onBack={onBack}
        isDark={isDark}
      >
        <StatementComponent dataAdapter={dataAdapter} isDark={isDark} />
      </MeridianShell>
    );
  }

  // Print routes render clean documents without the shell navigation or header
  if (route.kind === "print") {
    return (
      <div className="min-h-screen bg-white print:p-0">
        {document ? (
          <UIDocumentRenderer
            document={document}
            theme={meridianLightTheme}
            dataSources={document.dataSources}
            dataAdapter={dataAdapter}
            mutationHandler={mutationHandler}
            stateStore={stateStore}
            onRouteChange={(nextRoute) => onNavigate(String(nextRoute))}
          />
        ) : (
          <div className="p-8 text-sm text-[#6b7280]">
            <p className="font-semibold text-red-600">Print Template Not Found</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <MeridianShell
      company="Meridian Trading Co."
      // PageHeader shows the page's own title (the doctype / report name), the way Meridian does —
      // the document's `name` is the record identity, which its FormHeader prints inside the page.
      title={routeTitle(route)}
      groups={MERIDIAN_SIDEBAR}
      activePath={path}
      onNavigate={onNavigate}
      onBack={onBack}
      actions={actions}
      isDark={isDark}
    >
      {document ? (
        <UIDocumentRenderer
          document={document}
          theme={activeTheme}
          dataSources={document.dataSources}
          dataAdapter={dataAdapter}
          mutationHandler={mutationHandler}
          stateStore={stateStore}
          onRouteChange={(nextRoute) => onNavigate(String(nextRoute))}
        />
      ) : (
        <div className="p-8 text-sm text-[#6b7280]">
          <p className="flex items-center gap-2 text-base font-semibold text-[#111827] dark:text-gray-25">
            <Icon name="wrench" className="h-5 w-5 text-gray-500" />
            <span>{routeTitle(route)}</span>
          </p>
          <p className="mt-2">This page is on the build roadmap — not implemented yet in this phase.</p>
        </div>
      )}
    </MeridianShell>
  );
}
