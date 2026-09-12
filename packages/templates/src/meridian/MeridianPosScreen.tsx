/**
 * Meridian point-of-sale — a faithful visual port of Meridian's `src/pages/POS`
 * (`ClassicPOS` / `ModernPOS` + `OpenPOSShiftModal` / `ClosePOSShiftModal` /
 * `PaymentModal`). Plain React, not a generated UIDL document: a POS sale is a composite
 * operation (a shift, N cart lines with a running subtotal/tax/total, one or more payment
 * tenders summing to the total, a denomination-based shift close) the UIDL `$expr` language
 * has no arithmetic for. It calls `meridianPosService` directly against the shared `dataAdapter`.
 *
 * Layout (Classic `grid-cols-12`, Modern `grid-cols-9`), the denomination / amounts tables,
 * and the big uppercase action buttons (Save/Pay `#86efac`, Cancel/Held `#f98080`, tenders
 * `bg-teal-500`) mirror the reference. Not modelled — Loyalty / Coupon / Return / Price List
 * / Item Enquiry (no backing service); their quick-action buttons show a "not in this
 * reference" note.
 */
import { useEffect, useMemo, useState } from "react";
import { DataError, type DataAdapter } from "~/data/types";
import {
  IDR_DENOMINATIONS,
  closePosShift,
  countCash,
  openPosShift,
  submitPosInvoice,
  type ClosePosShiftResult,
  type DenominationCount,
  type PosTender,
  type SubmitPosInvoiceResult,
} from "../domain/services/meridianPosService";
import { formatIDR } from "../domain/services/posService";

const TENANT = "meridian";
const TAX_RATE = 0.11;
const TENDERS: PosTender[] = ["Cash", "Card", "QRIS", "Transfer"];
const POS_PROFILES = ["Kasir Meridian 1", "Kasir Meridian 2", "Kasir Meridian 3"];

const GREEN = "#86efac"; // Defaults.json saveButtonColour / submitButtonColour / payButtonColour
const RED = "#f98080"; // Defaults.json cancelButtonColour / heldButtonColour / returnButtonColour
const CARD = "bg-white border rounded-md dark:border-gray-800 dark:bg-gray-850";

interface ItemRow {
  id: string;
  name: string;
  rate: number;
}
interface OpenShift {
  id: string;
  posProfile: string;
  cashier: string;
  openingFloat: number;
  expectedCash: number;
  invoiceCount: number;
  salesByTender: Record<string, number>;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function emptyDenoms(): DenominationCount[] {
  return IDR_DENOMINATIONS.map((denomination) => ({ denomination, count: 0 }));
}
function safeCount(denoms: DenominationCount[]): number {
  try {
    return countCash(denoms.filter((d) => d.count > 0));
  } catch {
    return 0;
  }
}
function errText(err: unknown): string {
  if (err instanceof DataError) return err.message;
  return err instanceof Error ? err.message : String(err);
}

export interface MeridianPosScreenProps {
  dataAdapter: DataAdapter;
  isDark?: boolean;
  onNavigate?: (path: string) => void;
}

export function MeridianPosScreen({ dataAdapter, onNavigate }: MeridianPosScreenProps) {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [shift, setShift] = useState<OpenShift | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [layout, setLayout] = useState<"classic" | "modern">("classic");
  const [tableView, setTableView] = useState(false);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState<string | null>(null);

  const [showPayment, setShowPayment] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<SubmitPosInvoiceResult | null>(null);
  const [lastClosing, setLastClosing] = useState<ClosePosShiftResult | null>(null);

  async function loadShift() {
    const result = await dataAdapter.query<Record<string, unknown>>({ collection: "POSOpeningShift" });
    const row = result.rows.find((r) => r.tenant === TENANT && r.status === "Open");
    setShift(
      row
        ? {
            id: String(row.id),
            posProfile: String(row.posProfile ?? ""),
            cashier: String(row.cashier ?? ""),
            openingFloat: Number(row.openingFloat ?? 0),
            expectedCash: Number(row.expectedCash ?? 0),
            invoiceCount: Number(row.invoiceCount ?? 0),
            salesByTender: (row.salesByTender ?? {}) as Record<string, number>,
          }
        : null,
    );
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const itemResult = await dataAdapter.query<Record<string, unknown>>({ collection: "MeridianItem" });
        if (cancelled) return;
        setItems(
          itemResult.rows
            .filter((row) => row.tenant === TENANT)
            .map((row) => ({
              id: String(row.id),
              name: String(row.name ?? row.id),
              rate: Number(row.valuationRate ?? 0) || 100_000,
            })),
        );
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

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([id, quantity]) => {
          const item = items.find((i) => i.id === id);
          const rate = item?.rate ?? 0;
          return { id, name: item?.name ?? id, rate, quantity, amount: rate * quantity };
        }),
    [cart, items],
  );
  const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);
  const netTotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const tax = Math.round(netTotal * TAX_RATE);
  const grandTotal = netTotal + tax;

  const visibleItems = useMemo(
    () =>
      search.trim()
        ? items.filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()))
        : items,
    [items, search],
  );

  function addItem(id: string) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }
  function setQty(id: string, qty: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  async function handleOpenShift(cashier: string, posProfile: string, denoms: DenominationCount[]) {
    setBusy(true);
    setError(null);
    try {
      await openPosShift(dataAdapter, {
        cashier: cashier || "Kasir",
        posProfile,
        openedAt: `${todayIso()}T08:00:00+07:00`,
        openingCash: denoms.filter((d) => d.count > 0),
      });
      await loadShift();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  async function handlePay(payments: Array<{ method: PosTender; amount: number }>) {
    if (!shift) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submitPosInvoice(dataAdapter, {
        shiftId: shift.id,
        customerName: "Walk-in",
        postingDate: todayIso(),
        lines: lines.map((l) => ({ item: l.id, quantity: l.quantity, rate: l.rate })),
        payments: payments.filter((p) => p.amount > 0),
      });
      setLastSale(result);
      setCart({});
      setShowPayment(false);
      await loadShift();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleClose(supervisor: string, denoms: DenominationCount[]) {
    if (!shift) return;
    setBusy(true);
    setError(null);
    try {
      const result = await closePosShift(dataAdapter, {
        shiftId: shift.id,
        supervisor: supervisor || "Supervisor",
        closedAt: `${todayIso()}T21:00:00+07:00`,
        closingCash: denoms.filter((d) => d.count > 0),
      });
      setLastClosing(result);
      setShowClose(false);
      await loadShift();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <div className="p-6 text-sm text-red-600">{loadError}</div>;
  if (shift === undefined) return <div className="p-6 text-sm text-[#6b7280]">Loading POS…</div>;

  if (shift === null) {
    return (
      <div className="bg-gray-25 p-4 dark:bg-gray-875" style={{ minHeight: "calc(100vh - 8rem)" }}>
        <OpenPosShiftModal
          busy={busy}
          error={error}
          lastClosing={lastClosing}
          onBack={() => onNavigate?.("/meridian/dashboard")}
          onSubmit={handleOpenShift}
        />
      </div>
    );
  }

  const itemsPanel = (
    <div className={`${CARD} flex h-full flex-col p-4`}>
      <div className="flex gap-2">
        <input
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          placeholder="Search Item (Name or Barcode)"
          aria-label="Search Item"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="whitespace-nowrap rounded-md bg-gray-100 px-3 text-sm dark:bg-gray-900"
          data-testid="pos-view-toggle"
          onClick={() => setTableView((v) => !v)}
        >
          {tableView ? "Grid View" : "List View"}
        </button>
      </div>

      <div className="mt-4 grow overflow-y-auto">
        {tableView ? (
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-[#6b7280] dark:border-gray-800">
              <tr>
                <th className="py-1">Item</th>
                <th className="py-1 text-right">Rate</th>
                <th className="py-1 text-right">In Cart</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id} className="border-b dark:border-gray-800">
                  <td className="py-1.5">{item.name}</td>
                  <td className="py-1.5 text-right">{formatIDR(item.rate)}</td>
                  <td className="py-1.5 text-right">{cart[item.id] ?? 0}</td>
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      data-testid={`pos-item-${item.id}`}
                      onClick={() => addItem(item.id)}
                      className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-900"
                    >
                      Add
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`pos-item-${item.id}`}
                onClick={() => addItem(item.id)}
                className="flex h-24 flex-col justify-between rounded-md border border-slate-200 p-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
              >
                <span className="line-clamp-2 text-sm font-medium">{item.name}</span>
                <span className="text-xs text-[#6b7280]">{formatIDR(item.rate)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t pt-3 text-xs dark:border-gray-800">
        {["Sales Invoice List", "Loyalty Program", "Coupon Code", "Price List", "Item Enquiry"].map((label) => (
          <button
            key={label}
            type="button"
            className="rounded-md border border-slate-200 px-2 py-1 dark:border-gray-800"
            onClick={() => {
              if (label === "Sales Invoice List") onNavigate?.("/meridian/list/SalesInvoice");
              else setNote(`${label} is not modelled in this reference.`);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {note ? <div className="mt-2 text-xs text-[#6b7280]">{note}</div> : null}
    </div>
  );

  const cartCard = (
    <div className={`${CARD} flex grow flex-col p-4`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">Customer</span>
        <span className="text-xs text-[#6b7280]" data-testid="pos-shift-meta">
          {shift.posProfile} · {shift.cashier} · {shift.invoiceCount} sales
        </span>
      </div>
      <input
        className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        defaultValue="Walk-in"
        aria-label="Customer"
        readOnly
      />
      {lines.length === 0 ? (
        <p className="text-sm text-[#6b7280]">Tap an item to add it to the cart.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-[#6b7280] dark:border-gray-800">
            <tr>
              <th className="py-1">Item</th>
              <th className="py-1 text-right">Qty</th>
              <th className="py-1 text-right">Rate</th>
              <th className="py-1 text-right">Amount</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b dark:border-gray-800" data-testid={`cart-line-${line.id}`}>
                <td className="py-1.5">{line.name}</td>
                <td className="py-1.5 text-right">
                  <input
                    type="number"
                    min={0}
                    value={line.quantity}
                    aria-label={`Qty ${line.name}`}
                    onChange={(e) => setQty(line.id, Number(e.target.value))}
                    className="w-14 rounded border border-slate-300 px-1 py-0.5 text-right dark:border-slate-600 dark:bg-slate-800"
                  />
                </td>
                <td className="py-1.5 text-right">{formatIDR(line.rate)}</td>
                <td className="py-1.5 text-right">{formatIDR(line.amount)}</td>
                <td className="py-1.5 text-right">
                  <button type="button" className="text-xs text-red-600" onClick={() => setQty(line.id, 0)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const totalsCard = (
    <div className={`${CARD} p-3`}>
      <div className="grid grid-cols-2 gap-3">
        <LabeledAmount label="Total Quantity" value={String(totalQuantity)} />
        <LabeledAmount label="Add'l Discounts" value={formatIDR(0)} />
        <LabeledAmount label="Item Discounts" value={formatIDR(0)} />
        <LabeledAmount label="Grand Total" value={formatIDR(grandTotal)} testId="pos-grand-total" />
      </div>

      {error ? <div className="mt-2 text-sm text-red-600">{error}</div> : null}
      {lastSale ? (
        <div
          className="mt-2 rounded-md border border-emerald-300 p-2 text-sm text-emerald-700"
          data-testid="pos-receipt"
        >
          Sale completed — {String(lastSale.invoice.id)} · {formatIDR(Number(lastSale.invoice.total ?? 0))}
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <PosButton
          color={GREEN}
          onClick={() => setNote("Draft / held invoices are not modelled in this reference.")}
        >
          Save
        </PosButton>
        <PosButton color={RED} onClick={() => setCart({})}>
          Cancel
        </PosButton>
        <PosButton color={RED} onClick={() => setNote("Held invoices are not modelled in this reference.")}>
          Held
        </PosButton>
        <PosButton
          color={GREEN}
          disabled={lines.length === 0 || grandTotal === 0}
          onClick={() => setShowPayment(true)}
          testId="pos-pay"
        >
          Pay
        </PosButton>
      </div>
      <PosButton color={RED} className="mt-2" onClick={() => setShowClose(true)} testId="pos-close">
        Close Shift
      </PosButton>
    </div>
  );

  return (
    <div className="bg-gray-25 p-4 dark:bg-gray-875" style={{ minHeight: "calc(100vh - 8rem)" }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-[#6b7280]">
          Expected drawer {formatIDR(shift.expectedCash)} (opened with {formatIDR(shift.openingFloat)})
        </div>
        <div className="flex gap-1">
          {(["classic", "modern"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              data-testid={`pos-layout-${mode}`}
              onClick={() => setLayout(mode)}
              className={`rounded-md px-3 py-1 text-sm ${
                layout === mode
                  ? "bg-black text-white dark:bg-gray-300 dark:text-black"
                  : "bg-gray-100 dark:bg-gray-900"
              }`}
            >
              {mode === "classic" ? "Classic" : "Modern"}
            </button>
          ))}
        </div>
      </div>

      {layout === "classic" ? (
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 lg:col-span-5">{itemsPanel}</div>
          <div className="col-span-12 flex flex-col gap-3 lg:col-span-7">
            {cartCard}
            {totalsCard}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-9">
          <div className="flex flex-col gap-3 lg:col-span-3">
            {cartCard}
            {totalsCard}
          </div>
          <div className="lg:col-span-6">{itemsPanel}</div>
        </div>
      )}

      {showPayment ? (
        <PaymentModal
          busy={busy}
          error={error}
          netTotal={netTotal}
          tax={tax}
          grandTotal={grandTotal}
          onCancel={() => setShowPayment(false)}
          onSubmit={handlePay}
        />
      ) : null}

      {showClose ? (
        <ClosePosShiftModal
          busy={busy}
          error={error}
          openingFloat={shift.openingFloat}
          expectedCash={shift.expectedCash}
          salesByTender={shift.salesByTender}
          onCancel={() => setShowClose(false)}
          onSubmit={handleClose}
        />
      ) : null}
    </div>
  );
}

// --- shared bits ---------------------------------------------------------

function LabeledAmount({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2 dark:border-gray-800">
      <div className="text-xs text-[#6b7280]">{label}</div>
      <div className="text-right text-base font-semibold" data-testid={testId}>
        {value}
      </div>
    </div>
  );
}

function PosButton({
  color,
  children,
  onClick,
  disabled,
  className,
  testId,
}: {
  color: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      style={{ backgroundColor: color }}
      className={`w-full rounded-md py-4 text-lg font-semibold uppercase text-black ${
        disabled ? "opacity-50" : ""
      } ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function DenominationTable({
  denoms,
  onChange,
  readOnly,
}: {
  denoms: DenominationCount[];
  onChange?: (next: DenominationCount[]) => void;
  readOnly?: boolean;
}) {
  return (
    <table className="mt-2 w-full border text-sm dark:border-gray-800">
      <thead className="border-b bg-gray-50 text-left text-xs uppercase text-[#6b7280] dark:border-gray-800 dark:bg-gray-900">
        <tr>
          <th className="px-2 py-1">Denomination</th>
          <th className="px-2 py-1 text-right">Count</th>
        </tr>
      </thead>
      <tbody>
        {denoms.map((d, index) => (
          <tr key={d.denomination} className="border-b dark:border-gray-800">
            <td className="px-2 py-1">{formatIDR(d.denomination)}</td>
            <td className="px-2 py-1 text-right">
              <input
                type="number"
                min={0}
                value={d.count}
                readOnly={readOnly}
                aria-label={`Count ${d.denomination}`}
                onChange={(e) =>
                  onChange?.(
                    denoms.map((row, i) =>
                      i === index ? { ...row, count: Math.max(0, Number(e.target.value)) } : row,
                    ),
                  )
                }
                className="w-20 rounded border border-slate-300 px-1 py-0.5 text-right dark:border-slate-600 dark:bg-slate-800"
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AmountsTable({ headers, rows }: { headers: string[]; rows: Array<{ label: string; cols: string[] }> }) {
  return (
    <table className="mt-2 w-full border text-sm dark:border-gray-800">
      <thead className="border-b bg-gray-50 text-left text-xs uppercase text-[#6b7280] dark:border-gray-800 dark:bg-gray-900">
        <tr>
          <th className="px-2 py-1">Payment Method</th>
          {headers.map((h) => (
            <th key={h} className="px-2 py-1 text-right">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b dark:border-gray-800">
            <td className="px-2 py-1">{row.label}</td>
            {row.cols.map((c, i) => (
              <td key={i} className="px-2 py-1 text-right">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// --- modals ------------------------------------------------------------

function OpenPosShiftModal({
  busy,
  error,
  lastClosing,
  onBack,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  lastClosing: ClosePosShiftResult | null;
  onBack: () => void;
  onSubmit: (cashier: string, posProfile: string, denoms: DenominationCount[]) => void;
}) {
  const [cashier, setCashier] = useState("");
  const [posProfile, setPosProfile] = useState(POS_PROFILES[1]);
  const [denoms, setDenoms] = useState<DenominationCount[]>(emptyDenoms());
  const openingCash = safeCount(denoms);

  return (
    <div className="mx-auto w-full max-w-3xl rounded-lg bg-white p-4 shadow-xl dark:bg-gray-850">
      <h1 className="pb-4 text-center text-xl font-semibold dark:text-gray-100">Open POS Shift</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-lg font-medium dark:text-gray-100">Cash In Denominations</h2>
          <DenominationTable denoms={denoms} onChange={setDenoms} />
        </div>
        <div>
          <h2 className="text-lg font-medium dark:text-gray-100">Opening Amount</h2>
          <AmountsTable
            headers={["Amount"]}
            rows={TENDERS.map((t) => ({ label: t, cols: [formatIDR(t === "Cash" ? openingCash : 0)] }))}
          />
          <div className="mt-2 text-sm font-semibold" data-testid="pos-opening-float">
            Opening cash: {formatIDR(openingCash)}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2">
            <label className="text-sm">
              Cashier
              <input
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
                aria-label="Cashier"
                value={cashier}
                onChange={(e) => setCashier(e.target.value)}
              />
            </label>
            <label className="text-sm">
              POS Profile
              <select
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
                aria-label="POS Profile"
                value={posProfile}
                onChange={(e) => setPosProfile(e.target.value)}
              >
                {POS_PROFILES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {lastClosing ? (
            <div
              className="mt-3 rounded-md border border-slate-200 p-2 text-sm dark:border-gray-800"
              data-testid="pos-close-summary"
            >
              Previous shift closed — expected{" "}
              {formatIDR(Number(lastClosing.closingShift.expectedCash ?? 0))}, counted{" "}
              {formatIDR(Number(lastClosing.closingShift.countedCash ?? 0))}, difference{" "}
              {formatIDR(Number(lastClosing.closingShift.differenceAmount ?? 0))} (
              {String(lastClosing.closingShift.status)}).
            </div>
          ) : null}
          {error ? <div className="mt-2 text-sm text-red-600">{error}</div> : null}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <PosButton color={RED} onClick={onBack}>
              Back
            </PosButton>
            <PosButton
              color={GREEN}
              disabled={busy}
              onClick={() => onSubmit(cashier, posProfile, denoms)}
              testId="pos-open-submit"
            >
              Submit
            </PosButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClosePosShiftModal({
  busy,
  error,
  openingFloat,
  expectedCash,
  salesByTender,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  openingFloat: number;
  expectedCash: number;
  salesByTender: Record<string, number>;
  onCancel: () => void;
  onSubmit: (supervisor: string, denoms: DenominationCount[]) => void;
}) {
  const [supervisor, setSupervisor] = useState("");
  const [denoms, setDenoms] = useState<DenominationCount[]>(emptyDenoms());
  const counted = safeCount(denoms);

  const rows = TENDERS.map((t) => {
    const opening = t === "Cash" ? openingFloat : 0;
    const sales = Number(salesByTender[t] ?? 0);
    const expected = opening + sales;
    const closing = t === "Cash" ? counted : expected;
    return {
      label: t,
      cols: [formatIDR(opening), formatIDR(closing), formatIDR(expected), formatIDR(closing - expected)],
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-4 shadow-xl dark:bg-gray-850">
        <h1 className="pb-4 text-center text-xl font-semibold dark:text-gray-100">Close POS Shift</h1>
        <h2 className="mb-1 mt-2 text-lg font-medium dark:text-gray-100">Closing Cash</h2>
        <DenominationTable denoms={denoms} onChange={setDenoms} />
        <h2 className="mb-1 mt-5 text-lg font-medium dark:text-gray-100">Closing Amounts</h2>
        <AmountsTable headers={["Opening", "Closing", "Expected", "Difference"]} rows={rows} />
        <div className="mt-2 text-sm" data-testid="pos-close-preview">
          Counted {formatIDR(counted)} · expected {formatIDR(expectedCash)} · difference{" "}
          {formatIDR(counted - expectedCash)}
        </div>
        <label className="mt-3 block text-sm">
          Supervisor
          <input
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
            aria-label="Supervisor"
            value={supervisor}
            onChange={(e) => setSupervisor(e.target.value)}
          />
        </label>
        {error ? <div className="mt-2 text-sm text-red-600">{error}</div> : null}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <PosButton color={RED} onClick={onCancel}>
            Cancel
          </PosButton>
          <PosButton
            color={GREEN}
            disabled={busy}
            onClick={() => onSubmit(supervisor, denoms)}
            testId="pos-close-confirm"
          >
            Submit
          </PosButton>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({
  busy,
  error,
  netTotal,
  tax,
  grandTotal,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  netTotal: number;
  tax: number;
  grandTotal: number;
  onCancel: () => void;
  onSubmit: (payments: Array<{ method: PosTender; amount: number }>) => void;
}) {
  const [method, setMethod] = useState<PosTender>("Cash");
  const [paid, setPaid] = useState(grandTotal);
  const [refNo, setRefNo] = useState("");

  const balance = grandTotal - paid;
  const change = paid > grandTotal ? paid - grandTotal : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-4">
      <div className="flex h-full w-full max-w-md flex-col rounded-lg bg-white p-4 shadow-xl dark:bg-gray-850">
        <div className="text-xs text-[#6b7280]">Amount Paid</div>
        <input
          type="number"
          min={0}
          value={paid}
          aria-label="Amount Paid"
          onChange={(e) => setPaid(Number(e.target.value))}
          className="mb-4 w-full rounded border border-slate-300 px-3 py-2 text-right text-lg dark:border-slate-600 dark:bg-slate-800"
        />

        <div className="grid grid-cols-2 gap-3">
          {TENDERS.map((t) => (
            <button
              key={t}
              type="button"
              data-testid={`pos-tender-${t}`}
              onClick={() => {
                setMethod(t);
                setPaid(grandTotal);
              }}
              className={`rounded-md py-4 text-lg font-semibold uppercase text-white ${
                method === t ? "bg-teal-600" : "bg-teal-500"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {method !== "Cash" ? (
          <label className="mt-4 block text-sm">
            Reference No
            <input
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
              aria-label="Reference No"
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
            />
          </label>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <LabeledAmount label="Paid Change" value={formatIDR(change)} />
          <LabeledAmount label="Balance Amount" value={formatIDR(balance)} />
          <LabeledAmount label="Net Total" value={formatIDR(netTotal)} />
          <LabeledAmount label="Taxes and Charges" value={formatIDR(tax)} />
          <LabeledAmount label="Grand Total" value={formatIDR(grandTotal)} />
          <LabeledAmount label="Outstanding Amount" value={formatIDR(Math.max(0, balance))} />
        </div>

        {error ? <div className="mt-2 text-sm text-red-600">{error}</div> : null}

        <div className="mt-auto grid grid-cols-2 gap-4 pt-4">
          <PosButton
            color={GREEN}
            disabled={busy || paid < grandTotal || grandTotal === 0}
            onClick={() => onSubmit([{ method, amount: grandTotal }])}
            testId="pos-payment-submit"
          >
            Submit
          </PosButton>
          <PosButton color={RED} onClick={onCancel}>
            Cancel
          </PosButton>
        </div>
      </div>
    </div>
  );
}
