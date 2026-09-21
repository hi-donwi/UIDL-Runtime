import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { DataError } from "~/data/types";
import {
  cancelJournalEntry,
  getJournalEntryVoucher,
  submitJournalEntry,
} from "../meridianJournalEntryService";

function entry(id: string, status: string, lines: Array<{ account: string; debit: number; credit: number }>): Record<string, unknown> {
  return {
    id,
    tenant: "meridian",
    date: "2027-07-18",
    entryType: "Journal Entry",
    narration: `Test ${id}`,
    status,
    lines: lines.map((l) => ({ ...l, accountName: `${l.account} - Test` })),
  };
}

function seededAdapter(entries: Array<Record<string, unknown>>) {
  return createInMemoryAdapter({ seed: { JournalEntry: entries, GeneralLedger: [] } });
}

const BALANCED = [
  { account: "5120", debit: 2_500_000, credit: 0 },
  { account: "1110", debit: 0, credit: 2_500_000 },
];

describe("meridian ad-hoc journal entry lifecycle", () => {
  it("submits a balanced Draft: posts the lines verbatim and flips status to Submitted", async () => {
    const adapter = seededAdapter([entry("JE-1", "Draft", BALANCED)]);

    const result = await submitJournalEntry(adapter, { entryId: "JE-1", submittedAt: "2027-07-20" });

    expect(result.entry).toMatchObject({ status: "Submitted" });
    expect(result.voucher.voucherType).toBe("Journal Entry");
    expect(result.voucher.lines).toEqual([
      { account: "5120", accountName: "5120 - Test", debit: 2_500_000, credit: 0 },
      { account: "1110", accountName: "1110 - Test", debit: 0, credit: 2_500_000 },
    ]);

    const ledger = await adapter.query({ collection: "GeneralLedger" });
    expect(ledger.rows).toHaveLength(1);
  });

  it("rejects an unbalanced entry, a single-line entry, and a non-debit-xor-credit line", async () => {
    const adapter = seededAdapter([
      entry("JE-UNBAL", "Draft", [
        { account: "5120", debit: 2_500_000, credit: 0 },
        { account: "1110", debit: 0, credit: 2_000_000 },
      ]),
      entry("JE-ONE", "Draft", [{ account: "5120", debit: 1_000, credit: 0 }]),
      entry("JE-BOTH", "Draft", [
        { account: "5120", debit: 500, credit: 500 },
        { account: "1110", debit: 0, credit: 0 },
      ]),
    ]);

    await expect(submitJournalEntry(adapter, { entryId: "JE-UNBAL" })).rejects.toBeInstanceOf(DataError);
    await expect(submitJournalEntry(adapter, { entryId: "JE-ONE" })).rejects.toMatchObject({ code: "validation" });
    await expect(submitJournalEntry(adapter, { entryId: "JE-BOTH" })).rejects.toMatchObject({ code: "validation" });

    const ledger = await adapter.query({ collection: "GeneralLedger" });
    expect(ledger.rows).toHaveLength(0);
  });

  it("rejects a double submit and a missing entry", async () => {
    const adapter = seededAdapter([entry("JE-1", "Draft", BALANCED)]);
    await submitJournalEntry(adapter, { entryId: "JE-1" });
    await expect(submitJournalEntry(adapter, { entryId: "JE-1" })).rejects.toMatchObject({ code: "validation" });
    await expect(submitJournalEntry(adapter, { entryId: "JE-404" })).rejects.toMatchObject({ code: "not_found" });
  });

  it("cancels a Submitted entry with a mirror-image reversal voucher", async () => {
    const adapter = seededAdapter([entry("JE-1", "Draft", BALANCED)]);
    await submitJournalEntry(adapter, { entryId: "JE-1", submittedAt: "2027-07-20" });

    const result = await cancelJournalEntry(adapter, { entryId: "JE-1", cancelledAt: "2027-07-21" });

    expect(result.entry).toMatchObject({ status: "Cancelled" });
    expect(result.voucher.voucherType).toBe("Journal Entry Reversal");
    expect(result.voucher.lines).toEqual([
      { account: "5120", accountName: "5120 - Test", debit: 0, credit: 2_500_000 },
      { account: "1110", accountName: "1110 - Test", debit: 2_500_000, credit: 0 },
    ]);
    expect(await getJournalEntryVoucher(adapter, "JE-1", "Journal Entry Reversal")).toBeDefined();
  });
});
