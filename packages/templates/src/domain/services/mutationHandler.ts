import { DataError } from "~/data/errors";
import type { DataAdapter } from "~/data/types";
import type { MutationHandler, MutationRequest } from "~/types/actions";
import type { Language } from "~/utils/i18n";
import type { DoctypeMeta } from "../doctypes/types";
import { runTransition, type RunTransitionContext } from "./documentService";
import { validateRecord } from "./validationService";

import { createInMemoryCounterStore, createLocalStorageCounterStore, nextDocumentNumber, type NamingSeriesCounterStore } from "./numberingService";

export interface AdapterMutationHandlerOptions extends RunTransitionContext {
  adapter: DataAdapter;
  doctypes?: DoctypeMeta[] | Record<string, DoctypeMeta>;
  lang?: Language;
  counterStore?: NamingSeriesCounterStore;
  defaultCompanyId?: string;
}

function createDoctypeMap(doctypes?: DoctypeMeta[] | Record<string, DoctypeMeta>): Map<string, DoctypeMeta> {
  if (!doctypes) return new Map();
  if (Array.isArray(doctypes)) {
    return new Map(doctypes.map((meta) => [meta.name, meta]));
  }
  return new Map(Object.entries(doctypes));
}

function requireMutationId(request: MutationRequest): string {
  if (request.id === undefined || request.id === null || request.id === "") {
    throw new DataError(`"${request.operation}" mutation for "${request.collection}" requires an id`, "validation", {
      id: "ID is required",
    });
  }
  return String(request.id);
}

function requireTransition(request: MutationRequest): string {
  if (!request.transition) {
    throw new DataError(`"transition" mutation for "${request.collection}" requires a transition name`, "validation", {
      transition: "Transition is required",
    });
  }
  return request.transition;
}

function preparePayload(
  request: MutationRequest,
  meta: DoctypeMeta | undefined,
  lang: Language,
  counterStore: NamingSeriesCounterStore,
  defaultCompanyId?: string,
): Record<string, unknown> {
  const payload = { ...(request.payload ?? {}) };

  // 1. Auto-ID via naming series if id is missing or empty on create
  if (request.operation === "create") {
    if ((payload.id === undefined || payload.id === null || payload.id === "") && meta?.naming) {
      payload.id = nextDocumentNumber(meta.name, meta.naming, counterStore);
    } else if (payload.id === "") {
      delete payload.id;
    }

    if ((payload.companyId === undefined || payload.companyId === "") && defaultCompanyId) {
      payload.companyId = defaultCompanyId;
    }
  }

  // 2. Sanitize Currency fields to numeric values
  if (meta?.fields) {
    for (const field of meta.fields) {
      if (field.widget === "Currency" && field.key in payload) {
        const val = payload[field.key];
        if (typeof val === "string") {
          const num = Number(val.replace(/[^0-9.-]+/g, ""));
          payload[field.key] = isNaN(num) ? 0 : num;
        }
      }
    }
  }

  if (meta && (request.operation === "create" || request.operation === "update")) {
    const errors = validateRecord(meta.fields, payload, lang);
    if (errors) {
      throw new DataError("Validation failed", "validation", errors);
    }
  }

  return payload;
}

export function createAdapterMutationHandler(options: AdapterMutationHandlerOptions): MutationHandler {
  const { adapter, lang = "id", defaultCompanyId } = options;
  const doctypes = createDoctypeMap(options.doctypes);
  const counterStore =
    options.counterStore ??
    (typeof window !== "undefined" ? createLocalStorageCounterStore() : createInMemoryCounterStore());

  return async (request) => {
    const meta = doctypes.get(request.collection);

    switch (request.operation) {
      case "create": {
        const data = preparePayload(request, meta, lang, counterStore, defaultCompanyId);
        return adapter.create({ collection: request.collection, data });
      }
      case "update": {
        const id = requireMutationId(request);
        const data = preparePayload(request, meta, lang, counterStore, defaultCompanyId);
        return adapter.update({
          collection: request.collection,
          id,
          data,
          version: request.version,
        });
      }
      case "delete": {
        const id = requireMutationId(request);
        await adapter.remove(request.collection, id);
        return { id };
      }
      case "transition": {
        const id = requireMutationId(request);
        const transition = requireTransition(request);
        if (!meta) {
          throw new DataError(`"${request.collection}" has no DoctypeMeta for transition "${transition}"`, "validation", {
            collection: "Transition requires DoctypeMeta state metadata",
          });
        }
        return runTransition(meta, adapter, String(id), transition, {
          session: options.session,
          onPosting: options.onPosting,
          onAudit: options.onAudit,
        });
      }
      default:
        throw new DataError(`Unsupported mutation operation "${String(request.operation)}"`, "validation", {
          operation: "Unsupported mutation operation",
        });
    }
  };
}
