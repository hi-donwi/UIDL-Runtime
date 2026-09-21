/**
 * Runs a `DoctypeMeta` state-machine transition: checks `from`, evaluates the `$expr` guard,
 * checks permission, and only then calls the adapter — in that order, so a rejected transition
 * (wrong state, failed guard, missing permission) leaves the adapter untouched. This is what
 * the former shell-level `TRANSITION_ACTIONS` implementation handled by hand for exactly 11
 * hard-coded labels (see `.notes/plan/00-audit-kondisi-saat-ini.md` §2.1) — this generalizes it
 * to any doctype's declared `states`.
 *
 * Posting and audit logging are deliberately *not* imported here — `runTransition` accepts
 * `onPosting`/`onAudit` hooks instead, so `postingService` and `auditService`
 * can depend on this module without this module depending on them.
 */
import type { DataAdapter } from "~/data/types";
import { DataError } from "~/data/errors";
import { evaluate, type RenderScope } from "~/expr/evaluate";
import type { DoctypeMeta, StateTransition } from "../doctypes/types";

export interface RunTransitionContext {
  session?: Record<string, unknown>;
  /** Called after a transition whose meta marks `posting: true` succeeds at the adapter. Errors
   *  thrown here propagate to the caller — the transition itself already committed, so a
   *  posting failure is a real inconsistency the caller must surface, not silently swallow. */
  onPosting?: (args: { meta: DoctypeMeta; transition: StateTransition; record: Record<string, unknown> }) => Promise<unknown> | unknown;
  /** Called after any successful transition, win or lose on posting. */
  onAudit?: (args: { meta: DoctypeMeta; transition: StateTransition; record: Record<string, unknown> }) => Promise<unknown> | unknown;
}

function findTransition(meta: DoctypeMeta, transitionName: string): StateTransition {
  const transition = meta.states?.transitions.find((t) => t.name === transitionName);
  if (!transition) {
    throw new DataError(`"${meta.name}" has no transition named "${transitionName}"`, "validation", {
      transition: `Unknown transition "${transitionName}"`,
    });
  }
  return transition;
}

/**
 * Runs `transitionName` on `recordId`. Fetches the current record itself (rather than trusting a
 * caller-supplied snapshot) so the `from` check is always against the adapter's live state, not
 * a stale one the caller happened to be holding.
 */
export async function runTransition(
  meta: DoctypeMeta,
  adapter: DataAdapter,
  recordId: string,
  transitionName: string,
  context: RunTransitionContext = {},
): Promise<{ record: Record<string, unknown>; meta: { version: number } }> {
  if (!meta.states) {
    throw new DataError(`"${meta.name}" has no states declared — it has no transitions to run`, "validation");
  }

  const transition = findTransition(meta, transitionName);

  const existing = await adapter.get(meta.name, recordId);
  if (!existing) {
    throw new DataError(`"${meta.name}/${recordId}" not found`, "not_found");
  }

  const currentStatus = existing.record[meta.states.field];
  if (typeof currentStatus !== "string" || !transition.from.includes(currentStatus)) {
    throw new DataError(
      `Transition "${transitionName}" is not valid from status "${String(currentStatus)}" ` +
        `(allowed from: ${transition.from.join(", ")})`,
      "validation",
      { [meta.states.field]: `Cannot ${transition.name} from "${String(currentStatus)}"` },
    );
  }

  if (transition.guard) {
    const scope: RenderScope = { state: existing.record, session: context.session };
    const allowed = evaluate(transition.guard, scope);
    if (!allowed) {
      throw new DataError(`Transition "${transitionName}" guard rejected the current record`, "validation", {
        [meta.states.field]: `"${transition.label.id}" is not allowed for this record right now`,
      });
    }
  }

  if (transition.permission) {
    const permissions = (context.session?.permissions as Record<string, boolean> | undefined) ?? {};
    if (!permissions[transition.permission]) {
      throw new DataError(`Missing permission "${transition.permission}" for transition "${transitionName}"`, "forbidden");
    }
  }

  const result = await adapter.update({
    collection: meta.name,
    id: recordId,
    data: { [meta.states.field]: transition.to },
    version: existing.meta.version,
  });

  if (transition.posting && context.onPosting) {
    await context.onPosting({ meta, transition, record: result.record });
  }
  if (context.onAudit) {
    await context.onAudit({ meta, transition, record: result.record });
  }

  return result;
}

/**
 * Creates an amended revision of a cancelled/submitted document.
 * Generates an incremental `-1`, `-2` suffix on the record ID and resets status to Draft.
 */
export async function amendDocument(
  meta: DoctypeMeta,
  adapter: DataAdapter,
  recordId: string,
  context: RunTransitionContext = {},
): Promise<{ record: Record<string, unknown>; meta: { version: number } }> {
  const existing = await adapter.get(meta.name, recordId);
  if (!existing) {
    throw new DataError(`"${meta.name}/${recordId}" not found`, "not_found");
  }

  const amendMatch = recordId.match(/^(.+-\d+)-(\d+)$/);
  let newId: string;
  if (amendMatch) {
    const base = amendMatch[1];
    const currentRev = parseInt(amendMatch[2], 10);
    newId = `${base}-${currentRev + 1}`;
  } else {
    newId = `${recordId}-1`;
  }

  const statusField = meta.states?.field ?? "status";
  const newRecordData: Record<string, unknown> = {
    ...existing.record,
    id: newId,
    [statusField]: "Draft",
    amendedFrom: recordId,
  };

  const created = await adapter.create({
    collection: meta.name,
    data: newRecordData,
  });

  if (context.onAudit) {
    await context.onAudit({
      meta,
      transition: {
        name: "amend",
        label: { id: "Amandemen", en: "Amend" },
        from: [String(existing.record[statusField])],
        to: "Draft",
      },
      record: created.record,
    });
  }

  return created;
}

/**
 * Deletes a draft document.
 * Strictly prevents deletion of non-draft records (e.g. Submitted, Paid).
 */
export async function deleteDraft(
  meta: DoctypeMeta,
  adapter: DataAdapter,
  recordId: string,
): Promise<void> {
  const existing = await adapter.get(meta.name, recordId);
  if (!existing) {
    throw new DataError(`"${meta.name}/${recordId}" not found`, "not_found");
  }

  const statusField = meta.states?.field ?? "status";
  const currentStatus = String(existing.record[statusField] ?? "");

  if (currentStatus && currentStatus.toLowerCase() !== "draft") {
    throw new DataError(
      `Hanya dokumen dalam status Draft yang dapat dihapus (status saat ini: "${currentStatus}")`,
      "validation",
      { [statusField]: "Cannot delete non-draft document" },
    );
  }

  await adapter.remove(meta.name, recordId);
}
