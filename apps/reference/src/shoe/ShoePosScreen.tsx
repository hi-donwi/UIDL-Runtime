/**
 * A real, bespoke cart/checkout screen for shoe-company.
 *
 * Why this isn't a generated UIDL document like every other page in this reference: the actual POS
 * sale (`posService.submitPOSSale`) is a composite operation — one shift, an arbitrary number of
 * cart lines, a running subtotal/tax/total, and one or more payment tenders that must sum to the
 * total — not a single-record create/edit/transition. The UIDL `$expr` language has no
 * arithmetic (see the comment atop the Meridian point-of-sale reference, which is why Meridian's
 * own `/meridian/pos` is a decorative boolean-toggle reference, not a real checkout), so a document built
 * from `buildFormPage`/`buildListPage` genuinely cannot express this. This is a plain React
 * component instead, calling the real `posService` functions directly against `dataAdapter` —
 * the same functions the R2 pilot's Playwright acceptance test proved correct.
 */
import { useEffect, useMemo, useState } from "react";
import { Button, Badge } from "~/components/primitives";
import { DataError, type DataAdapter } from "~/data/types";
import {
  calculatePOSCart,
  closePOSShift,
  formatIDR,
  openPOSShift,
  submitPOSSale,
  type ClosePOSShiftResult,
  type POSItem,
  type POSTenderType,
  type SubmitPOSSaleResult,
} from "@uidl-runtime/templates/domain/services/posService";

const SHOE_COMPANY_ID = "shoe-company";
const TENDER_TYPES: POSTenderType[] = ["Cash", "QRIS", "Card", "E-Wallet"];
const OUTLETS = ["Jakarta", "Bandung", "Surabaya", "Online"];

interface ItemVariantRow {
  id: string;
  itemName: string;
  unitPrice: number;
  stock: number;
  category?: string;
}

interface CustomerRow {
  id: string;
  customerName: string;
}

interface ShiftRow {
  id: string;
  cashier: string;
  outlet: string;
  openingFloat: number;
  openedAt: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface ShoePosScreenProps {
  dataAdapter: DataAdapter;
}

export function ShoePosScreen({ dataAdapter }: ShoePosScreenProps) {
  const [items, setItems] = useState<ItemVariantRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [shift, setShift] = useState<ShiftRow | null | undefined>(undefined); // undefined = loading
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerId, setCustomerId] = useState("");
  const [payments, setPayments] = useState<Array<{ tenderType: POSTenderType; amount: number }>>([
    { tenderType: "Cash", amount: 0 },
  ]);

  const [openShiftForm, setOpenShiftForm] = useState({ cashier: "", outlet: OUTLETS[0], openingFloat: 750000 });
  const [closeShiftForm, setCloseShiftForm] = useState({ countedCash: 0, countedQRIS: 0, supervisor: "" });
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lastSale, setLastSale] = useState<SubmitPOSSaleResult | null>(null);
  const [lastClosing, setLastClosing] = useState<ClosePOSShiftResult | null>(null);

  async function loadItems() {
    const result = await dataAdapter.query({
      collection: "ItemVariant",
      filters: [{ field: "status", op: "eq", value: "Active" }],
      sort: [{ field: "itemName", dir: "asc" }],
      page: { number: 1, size: 200 },
    });
    setItems(
      result.rows.map((row) => ({
        id: String(row.id),
        itemName: String(row.itemName ?? row.id),
        unitPrice: Number(row.unitPrice ?? 0),
        stock: Number(row.stock ?? 0),
        category: row.category ? String(row.category) : undefined,
      })),
    );
  }

  async function loadShift() {
    const result = await dataAdapter.query({
      collection: "POSShift",
      filters: [
        { field: "companyId", op: "eq", value: SHOE_COMPANY_ID },
        { field: "status", op: "eq", value: "Open" },
      ],
      sort: [{ field: "id", dir: "desc" }],
      page: { number: 1, size: 1 },
    });
    const row = result.rows[0];
    setShift(
      row
        ? {
            id: String(row.id),
            cashier: String(row.cashier ?? ""),
            outlet: String(row.outlet ?? ""),
            openingFloat: Number(row.openingFloat ?? 0),
            openedAt: String(row.openedAt ?? ""),
          }
        : null,
    );
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const customerResult = await dataAdapter.query({
          collection: "Customer",
          filters: [{ field: "status", op: "eq", value: "Active" }],
          sort: [{ field: "customerName", dir: "asc" }],
          page: { number: 1, size: 200 },
        });
        if (cancelled) return;
        const loadedCustomers = customerResult.rows.map((row) => ({
          id: String(row.id),
          customerName: String(row.customerName ?? row.id),
        }));
        setCustomers(loadedCustomers);
        // submitPOSSale requires a real Customer record (it looks the id up and rejects an
        // unknown one) — there is no "walk-in, no customer" case in the doctype, so default to
        // the first active customer rather than an empty selection the service would reject.
        if (loadedCustomers[0]) setCustomerId(loadedCustomers[0].id);
        await loadItems();
        await loadShift();
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataAdapter]);

  const catalog: POSItem[] = useMemo(
    () => items.map((item) => ({ id: item.id, name: item.itemName, rate: item.unitPrice })),
    [items],
  );
  const totals = useMemo(() => calculatePOSCart(catalog, cart), [catalog, cart]);
  const paidTotal = useMemo(() => payments.reduce((sum, payment) => sum + (payment.amount || 0), 0), [payments]);
  const visibleItems = useMemo(
    () => (search.trim() ? items.filter((item) => item.itemName.toLowerCase().includes(search.trim().toLowerCase())) : items),
    [items, search],
  );

  function addToCart(itemId: string) {
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] ?? 0) + 1 }));
  }
  function setQty(itemId: string, qty: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[itemId];
      else next[itemId] = qty;
      return next;
    });
  }

  async function handleOpenShift() {
    setBusy(true);
    setError(null);
    try {
      await openPOSShift(dataAdapter, {
        companyId: SHOE_COMPANY_ID,
        cashier: openShiftForm.cashier,
        outlet: openShiftForm.outlet,
        openingFloat: openShiftForm.openingFloat,
        openedAt: todayIso(),
      });
      await loadShift();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckout() {
    if (!shift) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const lines = Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([itemVariantId, quantity]) => ({ itemVariantId, quantity }));
      const result = await submitPOSSale(dataAdapter, {
        companyId: SHOE_COMPANY_ID,
        shiftId: shift.id,
        customerId,
        postingDate: todayIso(),
        lines,
        payments: payments.filter((payment) => payment.amount > 0),
      });
      setLastSale(result);
      setCart({});
      setPayments([{ tenderType: "Cash", amount: 0 }]);
      await loadItems();
    } catch (err) {
      if (err instanceof DataError) {
        setError(err.message);
        if (err.fields) setFieldErrors(err.fields);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleCloseShift() {
    if (!shift) return;
    setBusy(true);
    setError(null);
    try {
      const result = await closePOSShift(dataAdapter, {
        companyId: SHOE_COMPANY_ID,
        shiftId: shift.id,
        closedAt: todayIso(),
        countedCash: closeShiftForm.countedCash,
        countedQRIS: closeShiftForm.countedQRIS,
        supervisor: closeShiftForm.supervisor,
      });
      setLastClosing(result);
      setShowCloseDialog(false);
      setShift(null);
      setCloseShiftForm({ countedCash: 0, countedQRIS: 0, supervisor: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return <div className="p-6 text-sm text-red-600 dark:text-red-400">Gagal memuat data kasir: {loadError}</div>;
  }
  if (shift === undefined) {
    return <div className="p-6 text-sm text-gray-600 dark:text-gray-400">Memuat data kasir…</div>;
  }

  // Shared across both the "no shift" and "cart" branches below: closing a shift sets
  // `shift` back to null, which would otherwise make this modal unreachable if it only lived
  // inside the cart-screen JSX (a real bug caught by ShoePosScreen.test.tsx's close-shift case —
  // the early `!shift` return happens before React ever gets to the modal's JSX).
  const closingSummaryModal = lastClosing && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 dark:bg-gray-900">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Shift Ditutup</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400" data-testid="close-shift-summary">
          Variance kas: {formatIDR(Number((lastClosing.closing as Record<string, unknown>).variance ?? 0))}
        </p>
        <div className="mt-5 flex justify-end">
          <Button label="Tutup" variant="primary" onClick={() => setLastClosing(null)} />
        </div>
      </div>
    </div>
  );

  if (!shift) {
    return (
      <div className="mx-auto max-w-md p-8">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Buka Shift Kasir</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Belum ada shift POS yang aktif untuk Toko Sepatu Nusantara. Buka shift untuk mulai berjualan.
        </p>
        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
        <div className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">Nama Kasir</span>
            <input
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              value={openShiftForm.cashier}
              onChange={(event) => setOpenShiftForm((prev) => ({ ...prev, cashier: event.target.value }))}
              data-testid="open-shift-cashier"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">Outlet</span>
            <select
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              value={openShiftForm.outlet}
              onChange={(event) => setOpenShiftForm((prev) => ({ ...prev, outlet: event.target.value }))}
              data-testid="open-shift-outlet"
            >
              {OUTLETS.map((outlet) => (
                <option key={outlet} value={outlet}>{outlet}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">Modal Awal (Rp)</span>
            <input
              type="number"
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              value={openShiftForm.openingFloat}
              onChange={(event) => setOpenShiftForm((prev) => ({ ...prev, openingFloat: Number(event.target.value) }))}
              data-testid="open-shift-float"
            />
          </label>
          <Button
            label={busy ? "Membuka…" : "Buka Shift"}
            variant="primary"
            disabled={busy || !openShiftForm.cashier}
            onClick={handleOpenShift}
            data-testid="open-shift-submit"
          />
        </div>
        {closingSummaryModal}
      </div>
    );
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
      <section className="flex flex-col gap-4 border-e border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">Item</h1>
          <Badge label={`${shift.cashier} · ${shift.outlet}`} color="green" />
        </div>
        <input
          className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          placeholder="Cari item…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          data-testid="pos-search"
        />
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex flex-col items-start gap-1 rounded-md border border-gray-200 p-3 text-start text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:hover:bg-gray-850"
              onClick={() => addToCart(item.id)}
              disabled={item.stock <= 0}
              data-testid={`pos-item-${item.id}`}
            >
              <span className="font-medium text-gray-900 dark:text-white">{item.itemName}</span>
              <span className="text-gray-600 dark:text-gray-400">{formatIDR(item.unitPrice)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-500">Stok: {item.stock}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col">
        <div className="flex h-12 items-center justify-between border-b border-gray-200 px-4 text-lg font-semibold text-gray-900 dark:border-gray-800 dark:text-white">
          Keranjang
          <Button label="Tutup Shift" onClick={() => setShowCloseDialog(true)} data-testid="open-close-shift" />
        </div>

        <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
          {totals.lines.length === 0 && (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-500">Belum ada item di keranjang.</p>
          )}
          {totals.lines.map((line) => (
            <div key={line.id} className="flex items-center gap-2 px-4 py-2 text-sm">
              <span className="flex-1 text-gray-900 dark:text-white">{line.name}</span>
              <button
                type="button"
                className="h-6 w-6 rounded border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                onClick={() => setQty(line.id, line.qty - 1)}
                aria-label={`Kurangi ${line.name}`}
              >
                −
              </button>
              <span className="w-6 text-center" data-testid={`pos-qty-${line.id}`}>{line.qty}</span>
              <button
                type="button"
                className="h-6 w-6 rounded border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                onClick={() => setQty(line.id, line.qty + 1)}
                aria-label={`Tambah ${line.name}`}
              >
                +
              </button>
              <span className="w-28 text-end text-gray-700 dark:text-gray-300">{formatIDR(line.amount)}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-200 px-4 py-3 text-sm dark:border-gray-800">
          <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Subtotal</span><span data-testid="pos-subtotal">{totals.formattedSubtotal}</span></div>
          <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>PPN 11%</span><span data-testid="pos-tax">{totals.formattedTax}</span></div>
          <div className="flex justify-between text-base font-semibold text-gray-900 dark:text-white"><span>Total</span><span data-testid="pos-total">{totals.formattedTotal}</span></div>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 p-4 dark:border-gray-800">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">Pelanggan</span>
            <select
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              data-testid="pos-customer"
            >
              {customers.length === 0 && <option value="">Tidak ada pelanggan aktif</option>}
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.customerName}</option>
              ))}
            </select>
          </label>

          {payments.map((payment, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <select
                className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                value={payment.tenderType}
                onChange={(event) =>
                  setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, tenderType: event.target.value as POSTenderType } : p)))
                }
              >
                {TENDER_TYPES.map((tender) => (
                  <option key={tender} value={tender}>{tender}</option>
                ))}
              </select>
              <input
                type="number"
                className="h-9 w-32 rounded-md border border-gray-300 bg-white px-2 text-end dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                value={payment.amount || ""}
                placeholder="0"
                onChange={(event) =>
                  setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, amount: Number(event.target.value) || 0 } : p)))
                }
                data-testid={`pos-payment-amount-${index}`}
              />
              {payments.length > 1 && (
                <button
                  type="button"
                  className="text-gray-500 hover:text-red-600 dark:text-gray-500"
                  onClick={() => setPayments((prev) => prev.filter((_, i) => i !== index))}
                  aria-label="Hapus baris pembayaran"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="self-start text-xs font-medium text-gray-600 underline dark:text-gray-400"
            onClick={() => setPayments((prev) => [...prev, { tenderType: "QRIS", amount: totals.total - paidTotal }])}
          >
            + Tambah pembayaran
          </button>
          {paidTotal !== totals.total && totals.total > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Total pembayaran {formatIDR(paidTotal)} belum sama dengan total invoice {formatIDR(totals.total)}.
            </p>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
          {Object.keys(fieldErrors).length > 0 && (
            <ul className="text-xs text-red-600 dark:text-red-400">
              {Object.entries(fieldErrors).map(([field, message]) => (
                <li key={field}>{field}: {message}</li>
              ))}
            </ul>
          )}

          <Button
            label={busy ? "Memproses…" : "Selesaikan Penjualan"}
            variant="primary"
            disabled={busy || totals.lines.length === 0 || paidTotal !== totals.total}
            onClick={handleCheckout}
            data-testid="pos-checkout"
          />

          {lastSale && (
            <p className="text-sm text-green-700 dark:text-green-400" role="status" data-testid="pos-last-sale">
              Invoice {String(lastSale.invoice.id)} selesai — {formatIDR(Number(lastSale.invoice.grandTotal ?? 0))}.
            </p>
          )}
        </div>
      </section>

      {showCloseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Tutup Shift</h2>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="font-medium text-gray-700 dark:text-gray-200">Kas Fisik Dihitung (Rp)</span>
                <input
                  type="number"
                  className="h-9 rounded-md border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  value={closeShiftForm.countedCash}
                  onChange={(event) => setCloseShiftForm((prev) => ({ ...prev, countedCash: Number(event.target.value) }))}
                  data-testid="close-shift-cash"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-gray-700 dark:text-gray-200">QRIS Dihitung (Rp)</span>
                <input
                  type="number"
                  className="h-9 rounded-md border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  value={closeShiftForm.countedQRIS}
                  onChange={(event) => setCloseShiftForm((prev) => ({ ...prev, countedQRIS: Number(event.target.value) }))}
                  data-testid="close-shift-qris"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-gray-700 dark:text-gray-200">Supervisor</span>
                <input
                  className="h-9 rounded-md border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  value={closeShiftForm.supervisor}
                  onChange={(event) => setCloseShiftForm((prev) => ({ ...prev, supervisor: event.target.value }))}
                  data-testid="close-shift-supervisor"
                />
              </label>
            </div>
            {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button label="Batal" onClick={() => setShowCloseDialog(false)} />
              <Button
                label={busy ? "Menutup…" : "Tutup Shift"}
                variant="primary"
                disabled={busy || !closeShiftForm.supervisor}
                onClick={handleCloseShift}
                data-testid="close-shift-submit"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
