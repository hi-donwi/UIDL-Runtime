import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";
import type { GeneralLedgerLine, GeneralLedgerVoucher } from "./meridianSalesInvoiceService";

/**
 * Meridian (core accounting) ad-hoc Journal Entry lifecycle — the behavioural counterpart to
 * the render-only JE form. Submitting a Draft entry validates the double-entry (≥2 lines,
 * each strictly debit-xor-credit, Σdebit === Σcredit) and posts those exact lines as a
 * `GeneralLedger` voucher; cancelling posts the mirror image. Adapter-backed and
 * idempotency-guarded.
 */

const TENANT = "meridian";

export interface SubmitJournalEntryInput {
  entryId: string;
  submittedAt?: string;
}

export interface CancelJournalEntryInput {
  entryId: string;
  cancelledAt?: string;
}

export interface JournalEntryResult {
  entry: Record<string, unknown>;
  voucher: GeneralLedgerVoucher;
}

interface LoadedEntry {
  record: Record<string, unknown>;
  meta: RecordMeta;
}

export async function submitJournalEntry(
  adapter: DataAdapter,
  input: SubmitJournalEntryInput,
): Promise<JournalEntryResult> {
  const entry = await loadEntry(adapter, input.entryId);
  if (entry.record.status !== "Draft") {
    throw new DataError(`Journal entry "${input.entryId}" must be Draft to submit`, "validation", { status: "Expected Draft" });
  }
  const postingDate = datePart(input.submittedAt) ?? String(entry.record.date ?? "");
  const voucher = await postJournalEntryVoucher(adapter, entry.record, postingDate);

  const updated = await adapter.update<Record<string, unknown>>({
    collection: "JournalEntry",
    id: input.entryId,
    version: entry.meta.version,
    data: { status: "Submitted", submittedAt: input.submittedAt ?? postingDate },
  });

  return { entry: updated.record, voucher };
}

/**
 * Validates and posts a Journal Entry's lines as a balanced `GeneralLedger` voucher without
 * touching the entry's status. Shared by `submitJournalEntry` and the state-machine transition
 * path (where `runTransition` has already flipped the status). Idempotency-guarded.
 */
export async function postJournalEntryVoucher(
  adapter: DataAdapter,
  record: Record<string, unknown>,
  postingDate: string,
): Promise<GeneralLedgerVoucher> {
  const entryId = String(record.id ?? "");
  const lines = normaliseLines(record.lines, entryId);
  if (await getVoucher(adapter, entryId, "Journal Entry")) {
    throw new DataError(`Journal entry "${entryId}" is already posted`, "validation", { entryId: "Already posted" });
  }
  return postVoucher(adapter, {
    id: `JV-NIMB-${entryId}`,
    voucherType: "Journal Entry",
    voucherNo: entryId,
    postingDate: postingDate || String(record.date ?? ""),
    remarks: String(record.narration ?? `Jurnal ${entryId}`),
    lines,
  });
}

export async function cancelJournalEntry(
  adapter: DataAdapter,
  input: CancelJournalEntryInput,
): Promise<JournalEntryResult> {
  const entry = await loadEntry(adapter, input.entryId);
  if (entry.record.status !== "Submitted") {
    throw new DataError(`Journal entry "${input.entryId}" must be Submitted to cancel`, "validation", {
      status: "Expected Submitted",
    });
  }
  const original = await getVoucher(adapter, input.entryId, "Journal Entry");
  if (!original) {
    throw new DataError(`Journal entry "${input.entryId}" has no posted voucher to reverse`, "validation", { entryId: "Not posted" });
  }
  const postingDate = datePart(input.cancelledAt) ?? String(original.postingDate ?? entry.record.date ?? "");
  const reversalVoucher = await postReversalVoucher(adapter, input.entryId, original, postingDate);

  const updated = await adapter.update<Record<string, unknown>>({
    collection: "JournalEntry",
    id: input.entryId,
    version: entry.meta.version,
    data: { status: "Cancelled", cancelledAt: input.cancelledAt ?? postingDate },
  });

  return { entry: updated.record, voucher: reversalVoucher };
}

/**
 * Posts the mirror-image reversal for a Journal Entry whose status has already been flipped to
 * "Cancelled" by `runTransition`. Idempotent; restores the status and throws if there is no
 * voucher to reverse.
 */
export async function reverseJournalEntryVoucher(
  adapter: DataAdapter,
  record: Record<string, unknown>,
  priorStatus: string,
): Promise<GeneralLedgerVoucher> {
  const entryId = String(record.id ?? "");
  const original = await getVoucher(adapter, entryId, "Journal Entry");
  if (!original) {
    await restoreStatus(adapter, entryId, priorStatus);
    throw new DataError(`Journal entry "${entryId}" has no posted voucher to reverse`, "validation", { entryId: "Not posted" });
  }
  if (await getVoucher(adapter, entryId, "Journal Entry Reversal")) {
    return original; // idempotent
  }
  const postingDate = String(original.postingDate ?? record.date ?? "");
  return postReversalVoucher(adapter, entryId, original, postingDate);
}

export async function getJournalEntryVoucher(
  adapter: DataAdapter,
  entryId: string,
  voucherType: "Journal Entry" | "Journal Entry Reversal" = "Journal Entry",
): Promise<GeneralLedgerVoucher | undefined> {
  return getVoucher(adapter, entryId, voucherType);
}

async function postReversalVoucher(
  adapter: DataAdapter,
  entryId: string,
  original: GeneralLedgerVoucher,
  postingDate: string,
): Promise<GeneralLedgerVoucher> {
  return postVoucher(adapter, {
    id: `JV-NIMB-${entryId}-REV`,
    voucherType: "Journal Entry Reversal",
    voucherNo: entryId,
    postingDate,
    remarks: `Pembatalan jurnal ${entryId}`,
    lines: original.lines.map((line) => ({
      account: line.account,
      accountName: line.accountName,
      debit: line.credit,
      credit: line.debit,
    })),
  });
}

async function restoreStatus(adapter: DataAdapter, entryId: string, status: string): Promise<void> {
  const fresh = await adapter.get<Record<string, unknown>>("JournalEntry", entryId);
  if (!fresh) return;
  await adapter.update({ collection: "JournalEntry", id: entryId, version: fresh.meta.version, data: { status } });
}

/** Validates the double-entry and returns rounded lines. */
function normaliseLines(value: unknown, entryId: string): GeneralLedgerLine[] {
  const raw = Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
  if (raw.length < 2) {
    throw new DataError(`Journal entry "${entryId}" needs at least two lines`, "validation", { lines: "Minimum two" });
  }
  const lines = raw.map((line, index) => {
    const debit = round(Number(line.debit ?? 0));
    const credit = round(Number(line.credit ?? 0));
    const account = String(line.account ?? "");
    if (!account) {
      throw new DataError(`Journal entry "${entryId}" line ${index + 1} has no account`, "validation", { lines: "Account required" });
    }
    if (debit < 0 || credit < 0) {
      throw new DataError(`Journal entry "${entryId}" line ${index + 1} has a negative amount`, "validation", { lines: "Negative amount" });
    }
    if ((debit > 0) === (credit > 0)) {
      throw new DataError(`Journal entry "${entryId}" line ${index + 1} must be exactly one of debit or credit`, "validation", {
        lines: "Debit xor credit",
      });
    }
    return { account, accountName: String(line.accountName ?? account), debit, credit };
  });
  const totalDebit = round(lines.reduce((sum, line) => sum + line.debit, 0));
  const totalCredit = round(lines.reduce((sum, line) => sum + line.credit, 0));
  if (totalDebit !== totalCredit) {
    throw new DataError(`Journal entry "${entryId}" is unbalanced (${totalDebit} != ${totalCredit})`, "validation", {
      lines: "Unbalanced",
    });
  }
  if (totalDebit <= 0) {
    throw new DataError(`Journal entry "${entryId}" has no amount`, "validation", { lines: "Zero total" });
  }
  return lines;
}

async function loadEntry(adapter: DataAdapter, entryId: string): Promise<LoadedEntry> {
  const found = await adapter.get<Record<string, unknown>>("JournalEntry", entryId);
  if (!found) throw new DataError(`Journal entry "${entryId}" was not found`, "not_found");
  return found;
}

async function getVoucher(
  adapter: DataAdapter,
  voucherNo: string,
  voucherType: string,
): Promise<GeneralLedgerVoucher | undefined> {
  const result = await adapter.query<GeneralLedgerVoucher>({ collection: "GeneralLedger" });
  return result.rows.find(
    (row) => row.tenant === TENANT && row.voucherType === voucherType && row.voucherNo === voucherNo,
  );
}

interface PostVoucherInput {
  id: string;
  voucherType: string;
  voucherNo: string;
  postingDate: string;
  remarks: string;
  lines: GeneralLedgerLine[];
}

async function postVoucher(adapter: DataAdapter, input: PostVoucherInput): Promise<GeneralLedgerVoucher> {
  const debit = round(input.lines.reduce((sum, line) => sum + line.debit, 0));
  const credit = round(input.lines.reduce((sum, line) => sum + line.credit, 0));
  if (debit !== credit) {
    throw new DataError(`General ledger voucher "${input.voucherNo}" is unbalanced (${debit} != ${credit})`, "validation", {
      voucherNo: "Unbalanced",
    });
  }
  const voucher: GeneralLedgerVoucher = {
    id: input.id,
    tenant: TENANT,
    voucherType: input.voucherType,
    voucherNo: input.voucherNo,
    postingDate: input.postingDate,
    remarks: input.remarks,
    totalAmount: debit,
    lines: input.lines.map((line) => ({ ...line, debit: round(line.debit), credit: round(line.credit) })),
  };
  const created = await adapter.create<GeneralLedgerVoucher>({ collection: "GeneralLedger", data: { ...voucher } });
  return created.record;
}

function datePart(value: string | undefined): string | undefined {
  return value ? value.slice(0, 10) : undefined;
}

function round(value: number): number {
  return Math.round(value);
}
