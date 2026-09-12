import { useEffect, useMemo, useState } from "react";
import { UIDocumentRenderer } from "~/renderer/UIDocumentRenderer";
import { DocumentSchema } from "~/schemas/document";
import { meridianDarkTheme, meridianLightTheme } from "~/theme/meridianPreset";
import { MeridianShell } from "./MeridianShell";
import { MeridianReferenceRoute } from "@uidl-runtime/templates/meridian/MeridianReferenceRoute";
import { ShoePosScreen } from "./shoe/ShoePosScreen";
import { SchoolDunningReportRoute } from "./school/SchoolDunningReportRoute";
import { HospitalReconciliationReportRoute } from "./hospital/HospitalReconciliationReportRoute";
import { HelpdeskSlaReportRoute } from "./helpdesk/HelpdeskSlaReportRoute";
import { KoperasiCollectibilityReportRoute } from "./koperasi/KoperasiCollectibilityReportRoute";
import { Drawer, Snackbar } from "~/components/primitives";
import { Icon } from "~/components/icons";
import { createDocumentState } from "~/state/createDocumentState";
import { PlaygroundRoute } from "./PlaygroundRoute";
import { CommandPalette } from "./CommandPalette";
import { GalleryRoute } from "./gallery/GalleryRoute";
import { exportToCsv, exportToJson, parseCsvFile, parseJsonFile } from "@uidl-runtime/templates/utils/exportImport";
import { FloatingToolsMenu } from "./FloatingToolsMenu";
import { dataAdapter, mutationHandler } from "@uidl-runtime/templates/config/data.config";
import { useConsoleDataset } from "@uidl-runtime/templates/domain/hooks/useConsoleDataset";
import { parseAppRoute } from "./router";
import {
  companies,
  companyPath,
  createConsoleDocument,
  defaultCompanyPath,
  findDoctype,
  legacyConsolePath,
  navGroups,
  parseRoute,
  resolveConsoleModuleRoute,
  type CompanyDemo,
} from "@uidl-runtime/templates/console";

interface ActiveDrawerState {
  title: string;
  subtitle?: string;
  fields: Array<{ label: string; key: string; value: string | number }>;
  rawRecord: Record<string, unknown>;
  printUrl?: string;
  printLabel?: string;
  printIcon?: string;
}

interface DrawerPrintConfig {
  label: string;
  icon: string;
  url: (row: Record<string, unknown>) => string;
}

const DRAWER_PRINT_CONFIG: Record<string, DrawerPrintConfig> = {
  "shoe-company": {
    label: "Cetak Struk Kasir POS & QRIS",
    icon: "receipt-percent",
    url: (row) => `/meridian/print/pos-receipt/shoe-company/${row.id ?? "POS-001"}`,
  },
  "school-abc": {
    label: "Cetak Surat Tagihan SPP",
    icon: "academic-cap",
    url: (row) => `/meridian/print/tuition-invoice/school-abc/${row.nis ?? row.id ?? "NIS-2027-0104"}`,
  },
  "factory-abc": {
    label: "Cetak Surat Perintah Kerja (SPK)",
    icon: "wrench",
    url: (row) => `/meridian/print/work-order/factory-abc/${row.wo ?? row.id ?? "WO-2027-001"}`,
  },
  "food-roasters": {
    label: "Cetak Roasting Log & Cupping Score",
    icon: "beaker",
    url: (row) => `/meridian/print/roasting-profile/food-roasters/${row.id ?? "ROAST-001"}`,
  },
  "epc-contractor": {
    label: "Cetak Berita Acara (BAST Proyek)",
    icon: "clipboard-check",
    url: (row) => `/meridian/print/bast-milestone/epc-contractor/${row.wbs ?? row.id ?? "BAST-001"}`,
  },
  "crm-pipeline": {
    label: "Cetak Penawaran Komersial (Quotation)",
    icon: "document-text",
    url: (row) => `/meridian/print/commercial-quotation/crm-pipeline/${row.id ?? "QUO-001"}`,
  },
  "koperasi-bmt": {
    label: "Cetak Surat Akad Murabahah",
    icon: "document-text",
    url: (row) => `/meridian/print/akad-murabahah/koperasi-bmt/${row.account ?? "MRB-2027-0104"}`,
  },
  "hospital-medika": {
    label: "Cetak Salinan Resep Dokter",
    icon: "printer",
    url: (row) => `/meridian/print/medical-prescription/hospital-medika/${row.norm ?? row.noAntrean ?? "RM-2027-0412"}`,
  },
  "medical-device": {
    label: "Cetak Certificate of Analysis (CoA)",
    icon: "document-check",
    url: (row) => `/meridian/print/certificate-of-analysis/medical-device/${row.noDhr ?? "DHR-2027-B091"}`,
  },
  "omnichannel-dist": {
    label: "Cetak Shipping Label & Packing Slip",
    icon: "truck",
    url: (row) => `/meridian/print/packing-slip/omnichannel-dist/${row.noPesanan ?? "ORD-SHP-99210"}`,
  },
  helpdesk: {
    label: "Cetak Laporan Resolusi & SLA Incident",
    icon: "shield-check",
    url: (row) => `/meridian/print/sla-incident/helpdesk/${row.ticketId ?? row.id ?? "TICK-001"}`,
  },
};

/**
 * The right-hand record drawer.
 *
 * Four consoles can print a real document for the row you opened; the rest just show its
 * fields. The print label carries an icon name rather than an emoji so the button matches the
 * rest of the chrome.
 */
function getDrawerDataFromRow(row: Record<string, unknown>, companyId: string): ActiveDrawerState {
  const keys = Object.keys(row).filter((k) => k !== "route" && k !== "$action");
  const idKey =
    keys.find(
      (k) =>
        k.toLowerCase().includes("id") ||
        k.toLowerCase().includes("no") ||
        k === "sku" ||
        k === "code" ||
        k === "ticketId" ||
        k === "noDhr" ||
        k === "norm" ||
        k === "noPesanan" ||
        k === "account" ||
        k === "invoice" ||
        k === "wo" ||
        k === "wbs" ||
        k === "doc" ||
        k === "profile",
    ) ?? keys[0];
  const title = String(row[idKey] ?? "Record Detail");

  const printConfig = DRAWER_PRINT_CONFIG[companyId];

  return {
    title: `Detail: ${title}`,
    subtitle: String(row.nama ?? row.customer ?? row.produk ?? row.channel ?? row.subject ?? row.item ?? row.member ?? ""),
    fields: keys.map((key) => ({
      key,
      label: key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()),
      value: String(row[key] ?? "-"),
    })),
    rawRecord: row,
    printUrl: printConfig?.url(row),
    printLabel: printConfig?.label,
    printIcon: printConfig?.icon,
  };
}

function normalizeConsolePath(path: string): string {
  if (!path.startsWith("/console/")) return path;
  const [, , companyId] = path.split("/");
  const company = companies.find((entry) => entry.id === companyId);
  if (!company || Object.keys(company.pages).length > 0) return path;
  return legacyConsolePath(company, path);
}

export function ReferenceApp() {
  const [path, setPath] = useState(() => currentPath());
  const [stateVersion, setStateVersion] = useState(0);
  const {
    companyDataset,
    transitionRecord,
    updateRecord,
    importRecords,
    exportRecords,
    resetData,
  } = useConsoleDataset();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isEditingDrawer, setIsEditingDrawer] = useState(false);
  const [drawerEditValues, setDrawerEditValues] = useState<Record<string, string>>({});

  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (window.localStorage?.getItem("uidl-runtime-theme") as "light" | "dark") || "light";
    }
    return "light";
  });
  const [language, setLanguage] = useState<"id" | "en">(() => {
    if (typeof window !== "undefined") {
      return (window.localStorage?.getItem("uidl-runtime-lang") as "id" | "en") || "id";
    }
    return "id";
  });

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        window.localStorage?.setItem("uidl-runtime-theme", next);
      }
      return next;
    });
  };

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === "id" ? "en" : "id";
      if (typeof window !== "undefined") {
        window.localStorage?.setItem("uidl-runtime-lang", next);
      }
      return next;
    });
  };

  useEffect(() => {
    const handlePopState = () => setPath(currentPath());
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const route = parseRoute(path);
  const activeCompany = companyDataset.find((company) => company.id === route.companyId);
  const activePageId = route.pageId ?? "dashboard";
  const activePage = activeCompany?.pages[activePageId];

  const document = useMemo(
    () => (activeCompany && activePage ? DocumentSchema.parse(createConsoleDocument(activeCompany, activePageId, activePage)) : null),
    [activeCompany, activePageId, activePage],
  );
  // Which record (if any) the current path is editing, and the DoctypeMeta needed to fetch it —
  // computed once so the fetch effect below and the editRecord lookup used for rendering always
  // agree on the same key.
  const editTarget = useMemo(() => {
    const parsed = parseAppRoute(path);
    if (parsed.kind !== "edit" || !parsed.company || !parsed.doctype || !parsed.id || parsed.id === "new") return null;
    const company = companyDataset.find((entry) => entry.id === parsed.company);
    const meta = company ? findDoctype(company, parsed.doctype) : undefined;
    if (!meta) return null;
    return { key: `${parsed.company}/${meta.name}/${parsed.id}`, doctypeName: meta.name, recordId: parsed.id };
  }, [path, companyDataset]);

  const [editRecordCache, setEditRecordCache] = useState<{
    key: string;
    record: Record<string, unknown> | null;
    version?: number;
  } | null>(null);

  useEffect(() => {
    if (!editTarget) return;
    if (editRecordCache?.key === editTarget.key) return;
    let cancelled = false;
    dataAdapter.get(editTarget.doctypeName, editTarget.recordId).then((result) => {
      if (cancelled) return;
      setEditRecordCache({ key: editTarget.key, record: result?.record ?? null, version: result?.meta.version });
    });
    return () => {
      cancelled = true;
    };
  }, [editTarget, editRecordCache]);

  // `undefined` (still fetching) vs `null` (fetched, doesn't exist) vs the record — only pass a
  // concrete value into resolveConsoleModuleRoute once the cache actually matches this route, so
  // navigating between two different edit routes doesn't flash the previous record's data.
  const editRecordForRoute = useMemo(
    () =>
      editTarget && editRecordCache?.key === editTarget.key
        ? { record: editRecordCache.record ?? {}, version: editRecordCache.version }
        : undefined,
    [editTarget, editRecordCache],
  );

  const generatedRoute = useMemo(
    () => resolveConsoleModuleRoute(path, { companies: companyDataset, lang: language, editRecord: editRecordForRoute }),
    [path, companyDataset, language, editRecordForRoute],
  );
  const generatedDocument = useMemo(
    () => (generatedRoute ? DocumentSchema.parse(generatedRoute.document) : null),
    [generatedRoute],
  );
  const generatedStateStore = useMemo(
    () => (generatedDocument ? createDocumentState(generatedDocument.state ?? {}).getState() : undefined),
    [generatedDocument],
  );

  const stateStore = useMemo(() => createDocumentState({}).getState(), []);

  useEffect(() => {
    return stateStore.subscribe(() => {
      setStateVersion((v) => v + 1);
    });
  }, [stateStore]);

  // Handle row actions (status transition workflows)
  useEffect(() => {
    const trigger = stateStore.getValue("rowActionTrigger") as { action: string; record: Record<string, unknown> } | null;
    if (!trigger || !trigger.action) return;

    const actionName = trigger.action;
    const current = trigger.record;

    if (activeCompany && activePage && current) {
      const result = transitionRecord({
        companyId: activeCompany.id,
        pageId: activePageId,
        actionName,
        record: current,
      });
      if (!result) return;

      stateStore.setState("toast", result.toast);
      stateStore.setState("selectedRecord", null);
      stateStore.setState("rowActionTrigger", null);
    }
  }, [stateVersion, activeCompany, activePage, activePageId, stateStore, transitionRecord]);

  useEffect(() => {
    stateStore.setState("selectedRecord", null);
    queueMicrotask(() => {
      setIsEditingDrawer(false);
    });
  }, [path, stateStore]);

  void stateVersion;
  const selectedRecord = (stateStore.getValue("selectedRecord") as Record<string, unknown> | null) ?? null;
  const toastMessage = (stateStore.getValue("toast") as string | null) ?? null;

  const navigate = (nextPath: string) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  };

  const handleResetData = () => {
    const result = resetData("floating-tools-reset");
    stateStore.setState("selectedRecord", null);
    setIsEditingDrawer(false);
    stateStore.setState("toast", result.toast);
  };

  const handleExportCsv = () => {
    if (!activeCompany || !activePage || activePage.tables.length === 0) return;
    const result = exportRecords({
      companyId: activeCompany.id,
      pageId: activePageId,
      format: "csv",
    });
    exportToCsv(result.filename, result.rows);
    stateStore.setState("toast", result.toast);
  };

  const handleExportJson = () => {
    if (!activeCompany || !activePage || activePage.tables.length === 0) return;
    const result = exportRecords({
      companyId: activeCompany.id,
      pageId: activePageId,
      format: "json",
    });
    exportToJson(result.filename, result.rows);
    stateStore.setState("toast", result.toast);
  };

  const handleImportFile = async (file: File) => {
    if (!activeCompany || !activePage || activePage.tables.length === 0) {
      stateStore.setState("toast", "Buka salah satu konsol untuk mengimpor data.");
      return;
    }
    try {
      let importedRows: Record<string, unknown>[] = [];
      if (file.name.endsWith(".json")) {
        importedRows = await parseJsonFile(file);
      } else {
        importedRows = await parseCsvFile(file);
      }

      if (importedRows.length === 0) {
        stateStore.setState("toast", "Berkas kosong atau format tidak sesuai.");
        return;
      }

      const result = importRecords({
        companyId: activeCompany.id,
        pageId: activePageId,
        records: importedRows,
      });
      if (result) stateStore.setState("toast", result.toast);
    } catch {
      stateStore.setState("toast", "Gagal membaca berkas.");
    }
  };

  const handleSaveDrawerEdit = () => {
    if (!activeCompany || !activePage || !selectedRecord) return;
    const result = updateRecord({
      companyId: activeCompany.id,
      pageId: activePageId,
      record: selectedRecord,
      patch: drawerEditValues,
    });
    if (!result) return;

    setIsEditingDrawer(false);
    stateStore.setState("selectedRecord", result.record);
    stateStore.setState("toast", result.toast);
  };

  const renderContent = () => {
    if (path.startsWith("/playground")) {
      return <PlaygroundRoute onBack={() => navigate("/")} isDark={themeMode === "dark"} onToggleTheme={toggleTheme} />;
    }

    if (path.startsWith("/gallery")) {
      return (
        <GalleryRoute
          path={path}
          onNavigate={navigate}
          onBack={() => navigate("/")}
          isDark={themeMode === "dark"}
          onToggleTheme={toggleTheme}
        />
      );
    }

    if (path.startsWith("/meridian")) {
      return <MeridianReferenceRoute path={path} onNavigate={navigate} onBack={() => navigate("/")} isDark={themeMode === "dark"} />;
    }

    if (path === "/app/shoe-company/pos") {
      // A composite cart/checkout flow, not a single-record CRUD/transition — genuinely cannot
      // be expressed as a generated UIDL document (the `$expr` language has no arithmetic to
      // compute a running cart total; see the comment atop ShoePosScreen.tsx). Real component,
      // real dataAdapter calls, same posService functions the R2 pilot journey already proved.
      const shoeCompany = companyDataset.find((company) => company.id === "shoe-company");
      if (!shoeCompany) return null;
      return (
        <MeridianShell
          company={shoeCompany.company}
          title="Kasir POS"
          groups={navGroups(shoeCompany)}
          activePath="/app/shoe-company/pos"
          onNavigate={navigate}
          onBack={() => navigate("/")}
          isDark={themeMode === "dark"}
          onToggleTheme={toggleTheme}
          language={language}
          onToggleLanguage={toggleLanguage}
        >
          <ShoePosScreen dataAdapter={dataAdapter} />
        </MeridianShell>
      );
    }

    if (path === "/app/school-abc/report/SchoolDunningReport") {
      const schoolCompany = companyDataset.find((company) => company.id === "school-abc");
      if (!schoolCompany) return null;
      return (
        <MeridianShell
          company={schoolCompany.company}
          title="School Dunning Report"
          groups={navGroups(schoolCompany)}
          activePath="/app/school-abc/report/SchoolDunningReport"
          onNavigate={navigate}
          onBack={() => navigate("/")}
          isDark={themeMode === "dark"}
          onToggleTheme={toggleTheme}
          language={language}
          onToggleLanguage={toggleLanguage}
        >
          <SchoolDunningReportRoute dataAdapter={dataAdapter} isDark={themeMode === "dark"} />
        </MeridianShell>
      );
    }

    if (path === "/app/hospital-medika/report/HospitalClaimReconciliation") {
      const hospitalCompany = companyDataset.find((company) => company.id === "hospital-medika");
      if (!hospitalCompany) return null;
      return (
        <MeridianShell
          company={hospitalCompany.company}
          title="Hospital Claim Reconciliation"
          groups={navGroups(hospitalCompany)}
          activePath="/app/hospital-medika/report/HospitalClaimReconciliation"
          onNavigate={navigate}
          onBack={() => navigate("/")}
          isDark={themeMode === "dark"}
          onToggleTheme={toggleTheme}
          language={language}
          onToggleLanguage={toggleLanguage}
        >
          <HospitalReconciliationReportRoute dataAdapter={dataAdapter} isDark={themeMode === "dark"} />
        </MeridianShell>
      );
    }

    if (path === "/app/helpdesk/report/HelpdeskSlaReport") {
      const helpdeskCompany = companyDataset.find((company) => company.id === "helpdesk");
      if (!helpdeskCompany) return null;
      return (
        <MeridianShell
          company={helpdeskCompany.company}
          title="Helpdesk SLA Report"
          groups={navGroups(helpdeskCompany)}
          activePath="/app/helpdesk/report/HelpdeskSlaReport"
          onNavigate={navigate}
          onBack={() => navigate("/")}
          isDark={themeMode === "dark"}
          onToggleTheme={toggleTheme}
          language={language}
          onToggleLanguage={toggleLanguage}
        >
          <HelpdeskSlaReportRoute dataAdapter={dataAdapter} isDark={themeMode === "dark"} />
        </MeridianShell>
      );
    }

    if (path === "/app/koperasi-bmt/report/KoperasiCollectibilityReport") {
      const koperasiCompany = companyDataset.find((company) => company.id === "koperasi-bmt");
      if (!koperasiCompany) return null;
      return (
        <MeridianShell
          company={koperasiCompany.company}
          title="Koperasi Collectibility Report"
          groups={navGroups(koperasiCompany)}
          activePath="/app/koperasi-bmt/report/KoperasiCollectibilityReport"
          onNavigate={navigate}
          onBack={() => navigate("/")}
          isDark={themeMode === "dark"}
          onToggleTheme={toggleTheme}
          language={language}
          onToggleLanguage={toggleLanguage}
        >
          <KoperasiCollectibilityReportRoute dataAdapter={dataAdapter} isDark={themeMode === "dark"} />
        </MeridianShell>
      );
    }

    if (generatedRoute && generatedDocument && generatedStateStore) {
      const currentTheme = themeMode === "dark" ? meridianDarkTheme : meridianLightTheme;

      return (
        <MeridianShell
          company={generatedRoute.company.company}
          title={generatedRoute.title}
          groups={navGroups(generatedRoute.company)}
          activePath={generatedRoute.activePath}
          onNavigate={navigate}
          onBack={() => navigate("/")}
          isDark={themeMode === "dark"}
          onToggleTheme={toggleTheme}
          language={language}
          onToggleLanguage={toggleLanguage}
        >
          {generatedRoute.loading ? (
            // The record is still being fetched — render nothing interactive rather than the
            // blank generated form, so there is no window where Save/transition could run
            // against a document that only *looks* like the real record. See moduleRuntime.ts's
            // `editRecord`/`loading` contract.
            <div className="p-6 text-sm text-gray-600 dark:text-gray-400">Memuat data…</div>
          ) : (
            <UIDocumentRenderer
              key={path}
              document={generatedDocument}
              theme={currentTheme}
              dataSources={generatedDocument.dataSources}
              dataAdapter={dataAdapter}
              stateStore={generatedStateStore}
              mutationHandler={mutationHandler}
              onRouteChange={(nextRoute) => navigate(String(nextRoute))}
            />
          )}
        </MeridianShell>
      );
    }

    if (!activeCompany || !activePage || !document) {
      return (
        <CatalogLanding
          onOpen={(reference) => navigate(defaultCompanyPath(reference))}
          onOpenMeridian={() => navigate("/meridian/dashboard")}
          isDark={themeMode === "dark"}
          onToggleTheme={toggleTheme}
          language={language}
          onToggleLanguage={toggleLanguage}
        />
      );
    }

    const drawerData = selectedRecord && activeCompany ? getDrawerDataFromRow(selectedRecord, activeCompany.id) : null;
    const currentTheme = themeMode === "dark" ? meridianDarkTheme : meridianLightTheme;

    return (
      <MeridianShell
        company={activeCompany.company}
        title={`${activeCompany.title} - ${activePage.module}`}
        groups={navGroups(activeCompany)}
        activePath={companyPath(activeCompany.id, activePageId)}
        onNavigate={navigate}
        onBack={() => navigate("/")}
        isDark={themeMode === "dark"}
        onToggleTheme={toggleTheme}
        language={language}
        onToggleLanguage={toggleLanguage}
      >
        <UIDocumentRenderer
          document={document}
          theme={currentTheme}
          dataSources={document.dataSources}
          stateStore={stateStore}
          mutationHandler={mutationHandler}
        />

        <Drawer
          open={Boolean(drawerData)}
          onClose={() => {
            stateStore.setState("selectedRecord", null);
            setIsEditingDrawer(false);
          }}
          title={drawerData?.title}
          side="right"
        >
          {drawerData && (
            <div className="space-y-4 text-sm text-[#111827] dark:text-gray-100">
              <div className="flex items-center justify-between border-b pb-2 border-gray-200 dark:border-gray-800">
                <p className="font-medium text-[#4b5563] dark:text-gray-400">{drawerData.subtitle || "Data Detail"}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (!isEditingDrawer) {
                      const initial: Record<string, string> = {};
                      drawerData.fields.forEach((f) => {
                        initial[f.key] = String(f.value);
                      });
                      setDrawerEditValues(initial);
                    }
                    setIsEditingDrawer(!isEditingDrawer);
                  }}
                  className="flex items-center gap-1 rounded bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Icon name={isEditingDrawer ? "close" : "pencil"} className="h-3.5 w-3.5" />
                  <span>{isEditingDrawer ? "Batal Edit" : "Edit Record"}</span>
                </button>
              </div>

              {!isEditingDrawer ? (
                <div className="space-y-2">
                  {drawerData.fields.map((field) => (
                    <div key={field.label} className="flex justify-between border-b border-gray-100 py-1.5 dark:border-gray-800">
                      <span className="font-medium text-[#6b7280] dark:text-gray-400">{field.label}</span>
                      <span className="font-semibold text-[#111827] dark:text-gray-100">{field.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveDrawerEdit();
                  }}
                  className="space-y-3"
                >
                  {drawerData.fields.map((field) => (
                    <div key={field.key}>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{field.label}</label>
                      <input
                        type="text"
                        value={drawerEditValues[field.key] ?? field.value}
                        onChange={(e) =>
                          setDrawerEditValues((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        className="w-full rounded border border-gray-200 bg-gray-25 px-2.5 py-1.5 text-sm text-gray-900 focus:bg-gray-100 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                  ))}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:brightness-95 dark:bg-gray-200 dark:text-black"
                    >
                      <Icon name="check" className="h-4 w-4" />
                      <span>Simpan Perubahan</span>
                    </button>
                  </div>
                </form>
              )}

              {drawerData.printUrl && !isEditingDrawer && (
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      stateStore.setState("selectedRecord", null);
                      navigate(drawerData.printUrl!);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#374151] dark:bg-gray-200 dark:text-black"
                  >
                    <Icon name={drawerData.printIcon ?? "printer"} className="h-4 w-4" />
                    {drawerData.printLabel ?? "Cetak Dokumen"}
                  </button>
                </div>
              )}
            </div>
          )}
        </Drawer>

        <Snackbar message={toastMessage ?? undefined} onClose={() => stateStore.setState("toast", null)} />
      </MeridianShell>
    );
  };

  return (
    <>
      {renderContent()}
      <CommandPalette
        open={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onSelect={navigate}
        isDark={themeMode === "dark"}
      />
      <FloatingToolsMenu
        onNavigate={navigate}
        onResetData={handleResetData}
        onExportJson={activeCompany && activePage ? handleExportJson : undefined}
        onExportCsv={activeCompany && activePage ? handleExportCsv : undefined}
        onImportFile={activeCompany && activePage ? handleImportFile : undefined}
        onOpenSearch={() => setIsCommandOpen(true)}
        isDark={themeMode === "dark"}
      />
    </>
  );
}

/*
 * The catalog entry page.
 *
 * Meridian's "pick a company file" screen (DatabaseSelector) is the reference: a gray-25
 * page, a `text-4xl` title, and a list of files as bordered `rounded-lg` cards with a hairline
 * and a soft shadow — no gradients, no color accents, no uppercase micro-labels. The console
 * cards below follow that, and every control is Button's `h-8 rounded-md text-sm`.
 */
function CatalogLanding({
  onOpen,
  onOpenMeridian,
  isDark = false,
  onToggleTheme,
  language = "id",
  onToggleLanguage,
}: {
  onOpen: (reference: CompanyDemo) => void;
  onOpenMeridian?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  language?: "id" | "en";
  onToggleLanguage?: () => void;
}) {
  const buttonClass =
    "flex h-8 items-center justify-center gap-2 rounded-md bg-gray-200 px-4 text-sm text-gray-700 hover:brightness-95 dark:bg-gray-900 dark:text-gray-200";
  const primaryButtonClass =
    "flex h-8 items-center justify-center gap-2 rounded-md bg-black px-6 text-sm text-white hover:brightness-95 dark:bg-gray-300 dark:font-semibold dark:text-black";
  const cardClass =
    "flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-800 dark:bg-gray-890";
  const tagClass = "pill border border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-400";

  return (
    <main className={`meridian-ui ${isDark ? "dark" : ""} min-h-screen bg-gray-25 dark:bg-gray-875`}>
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold dark:text-white">Reusable finance consoles for real operating models</h1>
            <p className="mt-3 text-base text-gray-700 dark:text-gray-400">
              Katalog 11 konsol industri vertikal lengkap dengan GL posting, multi-stage workflows, format cetak resmi
              (Faktur Pajak, CoA, Resep Dokter, Akad Murabahah, Surat Jalan), dan mock API controller — semuanya digambar
              dengan bahasa visual Meridian.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onToggleLanguage && (
              <button
                type="button"
                onClick={onToggleLanguage}
                className={buttonClass}
                title="Switch Language / Ganti Bahasa"
                aria-label={language === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
              >
                <Icon name="language" className="h-4 w-4" />
                {language === "id" ? "ID" : "EN"}
              </button>
            )}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className={buttonClass}
                title="Toggle Dark / Light Theme"
                aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              >
                <Icon name={isDark ? "sun" : "moon"} className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <article key={company.id} className={cardClass}>
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-xl font-semibold dark:text-white">{company.title}</h2>
                  <span className={tagClass}>JSON UIDL</span>
                </div>
                <p className="mt-2 text-base text-gray-700 dark:text-gray-400">{company.subtitle}</p>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-500">{company.source}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {company.patterns.map((pattern) => (
                    <span key={pattern} className={tagClass}>
                      {pattern}
                    </span>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => onOpen(company)} className={`${primaryButtonClass} mt-4`}>
                Buka Konsol
              </button>
            </article>
          ))}

          <article className={`${cardClass} border-blue-200 dark:border-blue-900/60 shadow-lg relative overflow-hidden`}>
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg">
              CORE ERP
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-xl font-bold text-blue-950 dark:text-blue-200">Meridian Accounting</h2>
              </div>
              <p className="mt-2 text-base text-gray-700 dark:text-gray-400">Full accounting desk: drawers, modals &amp; end-to-end journeys</p>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-500">
                Referensi akuntansi lengkap: QuickEdit Form Drawer, Make Payment Modal, Interactive
                Chart of Accounts tree, POS Touch Screen, GL posting, dan Print Formats.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Form Drawer", "Make Payment Modal", "COA Tree", "POS", "General Ledger"].map((module) => (
                  <span key={module} className="pill bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-medium">
                    {module}
                  </span>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => onOpenMeridian ? (window.location.pathname = "/meridian/dashboard") : undefined} className={`${primaryButtonClass} bg-blue-600 hover:bg-blue-700 text-white mt-4`}>
              Buka Meridian
            </button>
          </article>
        </div>
      </section>
    </main>
  );
}

/*
 * A company console page, laid out the way Meridian lays out its Dashboard (Dashboard):
 * flat `p-4` regions stacked on the page background and separated by rules, never cards on a
 * canvas. The page header is FormHeader's `h-row-large px-4 text-xl font-semibold` bar; the
 * figures row is `meridianKpiRow` (cells divided by `border-e`); charts and tables sit directly on
 * the page, each closed by a `border-b`.
 */

function currentPath() {
  if (typeof window === "undefined") return "/";
  const normalizedPath = normalizeConsolePath(window.location.pathname);
  if (normalizedPath !== window.location.pathname) {
    window.history.replaceState({}, "", normalizedPath);
  }
  return normalizedPath;
}
