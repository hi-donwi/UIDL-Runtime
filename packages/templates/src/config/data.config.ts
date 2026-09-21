/**
 * The single switch between mock and a real backend. See
 * `.notes/PROJECT.md` §3 — this is the only file that should ever import
 * `createInMemoryAdapter` or `createHttpAdapter`. No document,
 * generator, or component imports an adapter directly.
 *
 * Switch to a real backend without touching anything else:
 *
 *   VITE_DATA_MODE=http VITE_API_BASE_URL=https://erp.example.com/api npm run build:reference
 */
// Relative into src/, matching the convention every reference file already uses
// (e.g. MeridianReferenceRoute.tsx's `import ... from "~/renderer/UIDocumentRenderer"`) —
// not the "uidl-runtime" package alias, which only vite.config.ts's dev-server resolver knows
// and which `tsc` would otherwise resolve to the (possibly stale) built dist/index.d.ts.
import { createHttpAdapter, createInMemoryAdapter, type DataAdapter } from "~/data";
import { seed } from "../mock-data/seed";
import {
  DEVICE_BATCH_META,
  FULFILLMENT_ORDER_META,
  JOURNAL_ENTRY_META,
  MURABAHAH_FINANCING_META,
  OPPORTUNITY_META,
  PATIENT_ADMISSION_META,
  PROJECT_MILESTONE_META,
  PURCHASE_INVOICE_META,
  PURCHASE_RECEIPT_META,
  ROASTING_BATCH_META,
  SALES_INVOICE_META,
  SUPPORT_TICKET_META,
  TUITION_FEE_META,
  WORK_ORDER_META,
  shoeCompanyDoctypes,
} from "../console/doctypes";
import { createTransitionAuditHook } from "../domain/services/auditService";
import { createAdapterMutationHandler } from "../domain/services/mutationHandler";
import { createTransitionPostingDispatcher } from "../domain/services/transitionPostingDispatcher";

const MODE = (import.meta.env.VITE_DATA_MODE as string | undefined) ?? "mock";

export const dataAdapter: DataAdapter =
  MODE === "http"
    ? createHttpAdapter({
        baseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://127.0.0.1:8787/api",
      })
    : createInMemoryAdapter({
        seed,
        persist: "localStorage",
        storageKey: "uidl-runtime-mock-db",
        latencyMs: Number(import.meta.env.VITE_MOCK_LATENCY ?? 0),
        failureRate: Number(import.meta.env.VITE_MOCK_FAILURE_RATE ?? 0),
      });

const demoDoctypes = [
  ...shoeCompanyDoctypes,
  SALES_INVOICE_META,
  PURCHASE_INVOICE_META,
  PURCHASE_RECEIPT_META,
  JOURNAL_ENTRY_META,
  TUITION_FEE_META,
  WORK_ORDER_META,
  ROASTING_BATCH_META,
  PROJECT_MILESTONE_META,
  OPPORTUNITY_META,
  MURABAHAH_FINANCING_META,
  PATIENT_ADMISSION_META,
  DEVICE_BATCH_META,
  FULFILLMENT_ORDER_META,
  SUPPORT_TICKET_META,
];

export const mutationHandler = createAdapterMutationHandler({
  adapter: dataAdapter,
  doctypes: demoDoctypes,
  onPosting: createTransitionPostingDispatcher(dataAdapter),
  onAudit: createTransitionAuditHook(dataAdapter, "demo-user"),
});
