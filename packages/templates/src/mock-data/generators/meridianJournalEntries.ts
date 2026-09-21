/**
 * Meridian (core accounting) ad-hoc Journal Entries — deterministic adapter seed for the
 * behavioural "manual JE → GL" flow. Two Draft entries a user can submit, plus one already
 * Submitted (with its voucher) so the seeded book carries a manual adjustment. Every entry is
 * balanced (Σdebit === Σcredit) and every line is strictly debit-xor-credit. NO PRNG draws.
 */

const TENANT = "meridian";

interface JournalLine {
  account: string;
  accountName: string;
  debit: number;
  credit: number;
}

interface JournalEntryRow {
  [key: string]: unknown;
  id: string;
  tenant: string;
  date: string;
  entryType: string;
  narration: string;
  status: "Draft" | "Submitted" | "Cancelled";
  lines: JournalLine[];
}

interface GeneralLedgerVoucher {
  [key: string]: unknown;
  id: string;
  tenant: string;
  voucherType: string;
  voucherNo: string;
  postingDate: string;
  remarks: string;
  totalAmount: number;
  lines: JournalLine[];
}

export interface MeridianJournalEntries {
  entries: JournalEntryRow[];
  vouchers: GeneralLedgerVoucher[];
}

const ENTRIES: JournalEntryRow[] = [
  {
    id: "JE-NIMB-0001",
    tenant: TENANT,
    date: "2027-07-18",
    entryType: "Journal Entry",
    narration: "Reklasifikasi beban operasional ke kas",
    status: "Draft",
    lines: [
      { account: "5120", accountName: "5120 - Beban Pembelian", debit: 2_500_000, credit: 0 },
      { account: "1110", accountName: "1110 - Kas Utama / Bank", debit: 0, credit: 2_500_000 },
    ],
  },
  {
    id: "JE-NIMB-0002",
    tenant: TENANT,
    date: "2027-07-24",
    entryType: "Journal Entry",
    narration: "Koreksi PPN Masukan atas faktur pemasok",
    status: "Draft",
    lines: [
      { account: "1155", accountName: "1155 - PPN Masukan", debit: 1_100_000, credit: 0 },
      { account: "2140", accountName: "2140 - Hutang PPN Keluaran", debit: 0, credit: 1_100_000 },
    ],
  },
  {
    id: "JE-NIMB-0003",
    tenant: TENANT,
    date: "2027-07-31",
    entryType: "Journal Entry",
    narration: "Penyesuaian selisih kas kecil bulan Juli",
    status: "Submitted",
    lines: [
      { account: "5190", accountName: "5190 - Selisih Kas", debit: 150_000, credit: 0 },
      { account: "1110", accountName: "1110 - Kas Utama / Bank", debit: 0, credit: 150_000 },
    ],
  },
];

/** Lightweight rows for the Meridian Journal Entry list (labels only — no lines/status). */
export const MERIDIAN_JOURNAL_ENTRY_ROWS: Array<{ id: string; date: string; entryType: string; narration: string }> =
  ENTRIES.map((entry) => ({ id: entry.id, date: entry.date, entryType: entry.entryType, narration: entry.narration }));

export function buildMeridianJournalEntries(): MeridianJournalEntries {
  const entries = ENTRIES.map((row) => ({ ...row, lines: row.lines.map((line) => ({ ...line })) }));
  const vouchers: GeneralLedgerVoucher[] = entries
    .filter((entry) => entry.status === "Submitted")
    .map((entry) => ({
      id: `JV-NIMB-${entry.id}`,
      tenant: TENANT,
      voucherType: "Journal Entry",
      voucherNo: entry.id,
      postingDate: entry.date,
      remarks: entry.narration,
      totalAmount: entry.lines.reduce((sum, line) => sum + line.debit, 0),
      lines: entry.lines.map((line) => ({ ...line })),
    }));
  return { entries, vouchers };
}
