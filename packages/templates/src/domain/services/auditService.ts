/**
 * Records every create/update/transition/delete to an `AuditLog` collection through the same
 * `DataAdapter` seam everything else uses. Closes pattern P-B from
 * `.notes/plan/00-audit-kondisi-saat-ini.md` §14: 11 console verticals each show an "Audit Trail"
 * table with the same 3 static rows that never grow — a page reading from this collection
 * instead shows what the visitor actually just did, and grows on the next mutation.
 */
import type { DataAdapter } from "~/data/types";
import type { DoctypeMeta, StateTransition } from "../doctypes/types";

export type AuditAction = "create" | "update" | "transition" | "delete";

export interface AuditEvent {
  timestamp: string;
  /** Monotonic per-process counter — the actual sort key `listAuditLog` uses. Millisecond-
   *  resolution `timestamp` alone ties easily when several events are recorded in the same
   *  synchronous burst (e.g. a transition's own audit entry immediately following its posting
   *  lines), which would otherwise leave "most recent first" ordering to chance. */
  seq: number;
  doctype: string;
  recordId: string;
  action: AuditAction;
  detail?: string;
  user?: string;
}

const DEFAULT_AUDIT_COLLECTION = "AuditLog";

let sequenceCounter = 0;

export async function recordAudit(
  adapter: DataAdapter,
  event: Omit<AuditEvent, "timestamp" | "seq"> & { timestamp?: string },
  collection = DEFAULT_AUDIT_COLLECTION,
): Promise<AuditEvent> {
  const full: AuditEvent = { timestamp: event.timestamp ?? new Date().toISOString(), seq: ++sequenceCounter, ...event };
  await adapter.create({ collection, data: { ...full } });
  return full;
}

/** Builds a `documentService.runTransition`'s `onAudit` hook bound to one adapter/user/collection
 *  — so a caller just does `runTransition(meta, adapter, id, name, { onAudit: createTransitionAuditHook(adapter, user) })`. */
export function createTransitionAuditHook(adapter: DataAdapter, user?: string, collection = DEFAULT_AUDIT_COLLECTION) {
  return async ({ meta, transition, record }: { meta: DoctypeMeta; transition: StateTransition; record: Record<string, unknown> }) => {
    await recordAudit(
      adapter,
      { doctype: meta.name, recordId: String(record.id ?? ""), action: "transition", detail: transition.name, user },
      collection,
    );
  };
}

export async function listAuditLog(
  adapter: DataAdapter,
  filters: { doctype?: string; recordId?: string } = {},
  collection = DEFAULT_AUDIT_COLLECTION,
): Promise<AuditEvent[]> {
  const queryFilters = [];
  if (filters.doctype) queryFilters.push({ field: "doctype", op: "eq" as const, value: filters.doctype });
  if (filters.recordId) queryFilters.push({ field: "recordId", op: "eq" as const, value: filters.recordId });

  const result = await adapter.query<AuditEvent>({
    collection,
    filters: queryFilters,
    sort: [{ field: "seq", dir: "desc" }],
  });
  return result.rows;
}
