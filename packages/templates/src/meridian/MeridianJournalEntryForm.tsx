/**
 * Adapter-backed ad-hoc Journal Entry form (manual JE → GL). Plain
 * React, not a generated UIDL document: Submit / Cancel call `meridianJournalEntryService`
 * directly, which validates the double-entry and posts the lines (or their mirror) to the
 * `GeneralLedger`. `MeridianReferenceRoute` mounts this for `/meridian/edit/JournalEntry/JE-NIMB-*`.
 */
import { useEffect, useMemo, useState } from "react";
import { DataError, type DataAdapter } from "~/data/types";
import {
  cancelJournalEntry,
  submitJournalEntry,
} from "../domain/services/meridianJournalEntryService";
import { formatIDR } from "../domain/services/posService";

interface JournalLine {
  account: string;
  accountName?: string;
  debit: number;
  credit: number;
}
interface JournalEntryRecord {
  id: string;
  date: string;
  entryType: string;
  narration: string;
  status: string;
  lines: JournalLine[];
}

export interface MeridianJournalEntryFormProps {
  dataAdapter: DataAdapter;
  entryId: string;
  isDark?: boolean;
  onNavigate?: (path: string) => void;
}

export function MeridianJournalEntryForm({ dataAdapter, entryId, onNavigate }: MeridianJournalEntryFormProps) {
  const [record, setRecord] = useState<JournalEntryRecord | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<string | null>(null);

  async function load() {
    const found = await dataAdapter.get<Record<string, unknown>>("JournalEntry", entryId);
    if (!found) {
      setRecord(null);
      return;
    }
    const r = found.record;
    setRecord({
      id: String(r.id ?? entryId),
      date: String(r.date ?? ""),
      entryType: String(r.entryType ?? "Journal Entry"),
      narration: String(r.narration ?? ""),
      status: String(r.status ?? "Draft"),
      lines: ((r.lines ?? []) as JournalLine[]).map((l) => ({
        account: String(l.account ?? ""),
        accountName: l.accountName ? String(l.accountName) : undefined,
        debit: Number(l.debit ?? 0),
        credit: Number(l.credit ?? 0),
      })),
    });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataAdapter, entryId]);

  const totals = useMemo(() => {
    const debit = (record?.lines ?? []).reduce((sum, l) => sum + l.debit, 0);
    const credit = (record?.lines ?? []).reduce((sum, l) => sum + l.credit, 0);
    return { debit, credit, balanced: Math.round(debit) === Math.round(credit) };
  }, [record]);

  async function run(action: "submit" | "cancel") {
    if (!record) return;
    setBusy(true);
    setError(null);
    try {
      if (action === "submit") {
        const result = await submitJournalEntry(dataAdapter, { entryId: record.id });
        setPosted(`Posted ${String(result.voucher.voucherNo)} — ${formatIDR(Number(result.voucher.totalAmount ?? 0))}`);
      } else {
        const result = await cancelJournalEntry(dataAdapter, { entryId: record.id });
        setPosted(`Reversed ${String(result.voucher.voucherNo)}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof DataError ? err.message : err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (error && !record) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (record === undefined) return <div className="p-6 text-sm text-[#6b7280]">Loading journal entry…</div>;
  if (record === null) return <div className="p-6 text-sm text-[#6b7280]">Journal entry {entryId} was not found.</div>;

  const btn = "rounded-md px-4 py-2 text-sm font-semibold";

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold dark:text-gray-100">Journal Entry: {record.id}</h2>
        <span className="rounded-full border px-2 py-0.5 text-xs dark:border-gray-700">{record.status}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Date" value={record.date} />
        <Field label="Entry Type" value={record.entryType} />
        <div className="col-span-2">
          <Field label="Narration" value={record.narration} />
        </div>
      </div>

      <table className="w-full border text-sm dark:border-gray-800">
        <thead className="border-b bg-gray-50 text-left text-xs uppercase text-[#6b7280] dark:border-gray-800 dark:bg-gray-900">
          <tr>
            <th className="px-2 py-1">Account</th>
            <th className="px-2 py-1 text-right">Debit</th>
            <th className="px-2 py-1 text-right">Credit</th>
          </tr>
        </thead>
        <tbody>
          {record.lines.map((line, i) => (
            <tr key={i} className="border-b dark:border-gray-800">
              <td className="px-2 py-1.5">{line.accountName ?? line.account}</td>
              <td className="px-2 py-1.5 text-right">{line.debit ? formatIDR(line.debit) : "—"}</td>
              <td className="px-2 py-1.5 text-right">{line.credit ? formatIDR(line.credit) : "—"}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="px-2 py-1.5 text-right">Total</td>
            <td className="px-2 py-1.5 text-right" data-testid="je-total-debit">
              {formatIDR(totals.debit)}
            </td>
            <td className="px-2 py-1.5 text-right" data-testid="je-total-credit">
              {formatIDR(totals.credit)}
            </td>
          </tr>
        </tbody>
      </table>

      {!totals.balanced ? (
        <div className="text-sm text-red-600">This entry is unbalanced and cannot be posted.</div>
      ) : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {posted ? (
        <div className="rounded-md border border-emerald-300 p-2 text-sm text-emerald-700" data-testid="je-posted">
          {posted}
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          className={`${btn} bg-gray-100 dark:bg-gray-800`}
          onClick={() => onNavigate?.("/meridian/list/JournalEntry")}
        >
          Back
        </button>
        {record.status === "Draft" ? (
          <button
            type="button"
            className={`${btn} bg-emerald-600 text-white disabled:opacity-50`}
            disabled={busy || !totals.balanced}
            data-testid="je-submit"
            onClick={() => run("submit")}
          >
            Submit
          </button>
        ) : null}
        {record.status === "Submitted" ? (
          <button
            type="button"
            className={`${btn} bg-red-500 text-white disabled:opacity-50`}
            disabled={busy}
            data-testid="je-cancel"
            onClick={() => run("cancel")}
          >
            Cancel Entry
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2 dark:border-gray-800">
      <div className="text-xs text-[#6b7280]">{label}</div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}
