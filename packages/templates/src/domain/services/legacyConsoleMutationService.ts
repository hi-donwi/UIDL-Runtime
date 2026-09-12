import { mockApi } from "../../meridian/mockApiController";
import { companies } from "../../console";
import type { CompanyDemo } from "../../console/types";
import { DataError } from "~/data/errors";

export interface LegacyConsoleStore {
  create(collection: string, record: Record<string, unknown>): Record<string, unknown>;
  update(collection: string, id: string, patch: Record<string, unknown>): Record<string, unknown> | undefined;
  remove(collection: string, id: string): boolean;
  resetAll(): void;
}

export type LegacyConsoleAuditAction = "create" | "update" | "transition" | "delete" | "reset" | "import" | "export";

export interface LegacyConsoleAuditEvent {
  action: LegacyConsoleAuditAction;
  companyId?: string;
  pageId?: string;
  collection?: string;
  recordId?: string;
  detail?: string;
  timestamp: string;
}

export interface ConsoleMutationResult {
  dataset: CompanyDemo[];
  record: Record<string, unknown>;
  toast: string;
  audit: LegacyConsoleAuditEvent;
}

export interface ConsoleExportResult {
  filename: string;
  rows: Array<Record<string, unknown>>;
  toast: string;
  audit: LegacyConsoleAuditEvent;
}

export interface ConsoleResetResult {
  dataset: CompanyDemo[];
  toast: string;
  audit: LegacyConsoleAuditEvent;
}

const DEFAULT_STORE: LegacyConsoleStore = {
  create: (collection, record) => mockApi.create(collection, record),
  update: (collection, id, patch) => mockApi.update(collection, id, patch),
  remove: (collection, id) => mockApi.delete(collection, id),
  resetAll: () => mockApi.resetAll(),
};

const DEFAULT_IMPORT_LIMIT = 500;

const COMPANY_COLLECTION_MAP: Record<string, string> = {
  "shoe-company": "shoesInventory",
  "school-abc": "schoolSpp",
  "factory-abc": "manufacturingWO",
  "food-roasters": "roastBatches",
  "epc-contractor": "epcMilestones",
  "crm-pipeline": "crmDeals",
  "koperasi-bmt": "murabahahContracts",
  "hospital-medika": "patients",
  "medical-device": "medicalDevices",
  "omnichannel-dist": "omniOrders",
  helpdesk: "helpdeskTickets",
};

const LEGACY_ROW_ACTION_STATUS: Record<string, string> = {
  "Terima Pembayaran": "Paid",
  Bayar: "Paid",
  Pay: "Paid",
  Setujui: "Approved",
  Approve: "Approved",
  "QC Release": "Released for Sale",
  Release: "Released for Sale",
  "Pick & Pack": "Dalam Pengiriman",
  Resolve: "Resolved",
  Selesai: "Completed",
  Sesuaikan: "Disesuaikan",
};

function collectionForCompany(companyId: string): string {
  return COMPANY_COLLECTION_MAP[companyId] || "genericRecords";
}

function auditEvent(event: Omit<LegacyConsoleAuditEvent, "timestamp">): LegacyConsoleAuditEvent {
  return { timestamp: new Date().toISOString(), ...event };
}

function findCompanyPage(dataset: CompanyDemo[], companyId: string, pageId: string) {
  const company = dataset.find((entry) => entry.id === companyId);
  const page = company?.pages[pageId];
  if (!company || !page || page.tables.length === 0) return undefined;
  return { company, page };
}

function getRecordIdentity(record: Record<string, unknown>): { key: string; id: string } {
  const keys = Object.keys(record).filter((key) => key !== "route" && key !== "$action");
  const key =
    keys.find(
      (candidate) =>
        candidate.toLowerCase().includes("id") ||
        candidate.toLowerCase().includes("no") ||
        candidate === "sku" ||
        candidate === "code" ||
        candidate === "ticketId" ||
        candidate === "noDhr" ||
        candidate === "norm" ||
        candidate === "noPesanan" ||
        candidate === "account" ||
        candidate === "invoice" ||
        candidate === "wo" ||
        candidate === "wbs" ||
        candidate === "doc" ||
        candidate === "profile",
    ) ?? keys[0];
  return { key, id: String(record[key] ?? record.id) };
}

function stripUiMetadata(row: Record<string, unknown>): Record<string, unknown> {
  const result = { ...row };
  delete result.route;
  delete result.$action;
  return result;
}

function updatePageDataset(
  dataset: CompanyDemo[],
  companyId: string,
  pageId: string,
  updateTables: (tables: CompanyDemo["pages"][string]["tables"]) => CompanyDemo["pages"][string]["tables"],
): CompanyDemo[] {
  return dataset.map((company) => {
    if (company.id !== companyId) return company;
    const page = company.pages[pageId];
    if (!page || page.tables.length === 0) return company;
    return {
      ...company,
      pages: {
        ...company.pages,
        [pageId]: {
          ...page,
          tables: updateTables(page.tables),
        },
      },
    };
  });
}

export function createConsoleRecord({
  dataset,
  companyId,
  pageId,
  moduleName,
  record,
  store = DEFAULT_STORE,
}: {
  dataset: CompanyDemo[];
  companyId: string;
  pageId: string;
  moduleName: string;
  record: Record<string, unknown>;
  store?: LegacyConsoleStore;
}): ConsoleMutationResult | undefined {
  if (!findCompanyPage(dataset, companyId, pageId)) return undefined;

  const collection = collectionForCompany(companyId);
  const savedRecord = store.create(collection, record);
  return {
    dataset: updatePageDataset(dataset, companyId, pageId, (tables) => {
      const updatedTables = [...tables];
      updatedTables[0] = {
        ...updatedTables[0],
        rows: [savedRecord, ...updatedTables[0].rows],
      };
      return updatedTables;
    }),
    record: savedRecord,
    toast: `Record ${savedRecord.id} berhasil ditambahkan dan dibukukan ke ${moduleName}`,
    audit: auditEvent({ action: "create", companyId, pageId, collection, recordId: String(savedRecord.id ?? "") }),
  };
}

export function transitionConsoleRecord({
  dataset,
  companyId,
  pageId,
  actionName,
  record,
  store = DEFAULT_STORE,
}: {
  dataset: CompanyDemo[];
  companyId: string;
  pageId: string;
  actionName: string;
  record: Record<string, unknown>;
  store?: LegacyConsoleStore;
}): ConsoleMutationResult | undefined {
  const targetStatus = LEGACY_ROW_ACTION_STATUS[actionName];
  if (!targetStatus || !findCompanyPage(dataset, companyId, pageId)) return undefined;

  const { key, id } = getRecordIdentity(record);
  const updatedRecord = { ...record, status: targetStatus };
  const collection = collectionForCompany(companyId);
  store.update(collection, id, { status: targetStatus });

  return {
    dataset: updatePageDataset(dataset, companyId, pageId, (tables) =>
      tables.map((table) => ({
        ...table,
        rows: table.rows.map((row) => (String(row[key] ?? row.id) === id ? { ...row, status: targetStatus } : row)),
      })),
    ),
    record: updatedRecord,
    toast: `Aksi [${actionName}] berhasil: Status ${id} diubah menjadi [${targetStatus}]`,
    audit: auditEvent({ action: "transition", companyId, pageId, collection, recordId: id, detail: actionName }),
  };
}

export function updateConsoleRecord({
  dataset,
  companyId,
  pageId,
  record,
  patch,
  store = DEFAULT_STORE,
}: {
  dataset: CompanyDemo[];
  companyId: string;
  pageId: string;
  record: Record<string, unknown>;
  patch: Record<string, string>;
  store?: LegacyConsoleStore;
}): ConsoleMutationResult | undefined {
  if (!findCompanyPage(dataset, companyId, pageId)) return undefined;

  const { key, id } = getRecordIdentity(record);
  const updatedRecord = { ...record, ...patch };
  delete updatedRecord.$action;

  const collection = collectionForCompany(companyId);
  store.update(collection, id, patch);
  return {
    dataset: updatePageDataset(dataset, companyId, pageId, (tables) =>
      tables.map((table) => ({
        ...table,
        rows: table.rows.map((row) => (String(row[key] ?? row.id) === id ? { ...row, ...patch } : row)),
      })),
    ),
    record: updatedRecord,
    toast: `Data ${id} berhasil diperbarui!`,
    audit: auditEvent({ action: "update", companyId, pageId, collection, recordId: id }),
  };
}

export function importConsoleRecords({
  dataset,
  companyId,
  pageId,
  records,
  store = DEFAULT_STORE,
  maxRecords = DEFAULT_IMPORT_LIMIT,
}: {
  dataset: CompanyDemo[];
  companyId: string;
  pageId: string;
  records: Array<Record<string, unknown>>;
  store?: LegacyConsoleStore;
  maxRecords?: number;
}): ConsoleMutationResult | undefined {
  if (!findCompanyPage(dataset, companyId, pageId)) return undefined;
  if (records.length === 0) {
    throw new DataError("Import requires at least one record", "validation", { import: "No records to import" });
  }
  if (records.length > maxRecords) {
    throw new DataError(`Import is limited to ${maxRecords} records`, "validation", {
      import: `Maximum ${maxRecords} records per import`,
    });
  }

  const collection = collectionForCompany(companyId);
  const createdRecords = records.map((record) => store.create(collection, record));
  return {
    dataset: updatePageDataset(dataset, companyId, pageId, (tables) => {
      const updatedTables = [...tables];
      updatedTables[0] = {
        ...updatedTables[0],
        rows: [...createdRecords, ...updatedTables[0].rows],
      };
      return updatedTables;
    }),
    record: createdRecords[0] ?? {},
    toast: `Berhasil mengimpor ${records.length} record!`,
    audit: auditEvent({ action: "import", companyId, pageId, collection, detail: `${records.length} records` }),
  };
}

export function exportConsoleRecords({
  dataset,
  companyId,
  pageId,
  format,
}: {
  dataset: CompanyDemo[];
  companyId: string;
  pageId: string;
  format: "csv" | "json";
}): ConsoleExportResult {
  const found = findCompanyPage(dataset, companyId, pageId);
  const rows = found?.page.tables[0]?.rows.map(stripUiMetadata) ?? [];
  if (rows.length === 0) {
    throw new DataError("Export requires at least one row", "validation", { export: "No rows to export" });
  }

  const collection = collectionForCompany(companyId);
  return {
    filename: `${companyId}-${pageId}`,
    rows,
    toast: `Data tabel berhasil diexport ke ${format.toUpperCase()}!`,
    audit: auditEvent({ action: "export", companyId, pageId, collection, detail: `${format}:${rows.length} records` }),
  };
}

export function deleteConsoleRecord({
  dataset,
  companyId,
  pageId,
  record,
  store = DEFAULT_STORE,
}: {
  dataset: CompanyDemo[];
  companyId: string;
  pageId: string;
  record: Record<string, unknown>;
  store?: LegacyConsoleStore;
}): ConsoleMutationResult | undefined {
  if (!findCompanyPage(dataset, companyId, pageId)) return undefined;

  const { key, id } = getRecordIdentity(record);
  const collection = collectionForCompany(companyId);
  const removed = store.remove(collection, id);
  if (!removed) {
    throw new DataError(`Record "${id}" was not found`, "not_found", { id: "Record not found" });
  }

  return {
    dataset: updatePageDataset(dataset, companyId, pageId, (tables) =>
      tables.map((table) => ({
        ...table,
        rows: table.rows.filter((row) => String(row[key] ?? row.id) !== id),
      })),
    ),
    record: { ...record, id },
    toast: `Data ${id} berhasil dihapus!`,
    audit: auditEvent({ action: "delete", companyId, pageId, collection, recordId: id }),
  };
}

export function resetConsoleDataset(
  store: LegacyConsoleStore = DEFAULT_STORE,
  initialDataset: CompanyDemo[] = companies,
): CompanyDemo[] {
  store.resetAll();
  return initialDataset;
}

export function resetConsoleCommand({
  store = DEFAULT_STORE,
  initialDataset = companies,
  reason,
}: {
  store?: LegacyConsoleStore;
  initialDataset?: CompanyDemo[];
  reason: string;
}): ConsoleResetResult {
  if (!reason.trim()) {
    throw new DataError("Reset requires a reason", "validation", { reset: "Reason is required" });
  }
  store.resetAll();
  return {
    dataset: initialDataset,
    toast: "Data referensi berhasil direset ke dataset awal!",
    audit: auditEvent({ action: "reset", detail: reason }),
  };
}
