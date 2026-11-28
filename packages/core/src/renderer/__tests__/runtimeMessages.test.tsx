import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { UIDocumentRenderer } from "../UIDocumentRenderer";
import { renderUIDocument } from "../renderDocument";
import { defaultRegistry } from "../../registry/registry";
import { DataTable, Dialog, Drawer } from "../../components/primitives";
import { RuntimeMessagesProvider } from "../../i18n/RuntimeMessagesProvider";
import { compileFormPage } from "../../compiler/form";
import type { UIDLDocument, UIDLNode } from "../../types";
import type { FormPageMeta, HostCapabilities } from "../../compiler/types";

const doc = (root: UIDLNode): UIDLDocument => ({ version: "1.0", id: "runtime-messages", name: "Runtime messages", root });

const drawer = (props: Record<string, unknown> = {}): UIDLNode => ({
  id: "drawer",
  type: "Drawer",
  props: { open: true, title: "Edit record", closeButton: true, ...props },
  events: { onClose: [{ setState: { path: "open", value: false } }] },
  children: [{ id: "body", type: "Text", props: { value: "Body" } }],
});

const table = (props: Record<string, unknown> = {}): UIDLNode => ({
  id: "table",
  type: "DataTable",
  props: {
    columns: [{ key: "name", label: "Name" }, { key: "amount", label: "Amount", format: "currency" }, { key: "active", label: "Active", format: "check" }],
    rows: Array.from({ length: 60 }, (_, i) => ({ id: `r${i}`, name: `Row ${i}`, amount: 1234.5, active: true })),
    ...props,
  },
});

describe("runtime messages", () => {
  it("keep the English text when the host sets no locale", () => {
    render(<UIDocumentRenderer document={doc(drawer())} />);
    expect(screen.getByRole("button", { name: "Close drawer" })).toBeTruthy();
  });

  it("follow RenderOptions.locale in UIDocumentRenderer", () => {
    render(<UIDocumentRenderer document={doc(drawer())} locale="id-ID" />);
    expect(screen.getByRole("button", { name: "Tutup panel" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Close drawer" })).toBeNull();
  });

  it("let RenderOptions.messages override single labels over the locale catalog", () => {
    render(<UIDocumentRenderer document={doc(table())} locale="id" messages={{ nextPage: "Lanjut" }} />);
    expect(screen.getByRole("button", { name: "Lanjut" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Halaman sebelumnya" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Navigasi halaman" })).toBeTruthy();
    expect(screen.getByRole("status", { name: "Halaman 1 dari 2" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Jumlah per halaman" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Semua" })).toBeTruthy();
  });

  it("apply to renderUIDocument as well", () => {
    render(<>{renderUIDocument(doc(drawer()), { locale: "id" })}</>);
    expect(screen.getByRole("button", { name: "Tutup panel" })).toBeTruthy();
  });

  it("add no wrapper element when neither locale nor messages is set", () => {
    const plain = renderUIDocument(doc(drawer()));
    expect((plain as { type?: unknown }).type).not.toBe(RuntimeMessagesProvider);
  });

  it("yield to a node's own closeLabel", () => {
    render(<UIDocumentRenderer document={doc(drawer({ closeLabel: "Tutup formulir" }))} locale="id" />);
    expect(screen.getByRole("button", { name: "Tutup formulir" })).toBeTruthy();
  });

  it("declare closeLabel on Drawer and Dialog in the registry", () => {
    for (const type of ["Drawer", "Dialog"]) {
      const names = defaultRegistry.get(type)?.propDescriptors?.map((p) => p.name) ?? [];
      expect(names, type).toContain("closeLabel");
    }
  });

  it("localize the Dialog close button, with closeLabel taking precedence", () => {
    const { unmount } = render(
      <RuntimeMessagesProvider locale="id">
        <Dialog open title="Info" content="Saved" />
      </RuntimeMessagesProvider>,
    );
    expect(screen.getByRole("button", { name: "Tutup" })).toBeTruthy();
    unmount();
    render(<Dialog open title="Info" content="Saved" closeLabel="Got it" />);
    expect(screen.getByRole("button", { name: "Got it" })).toBeTruthy();
  });

  it("nest: an inner provider without locale builds on the outer messages", () => {
    render(
      <RuntimeMessagesProvider locale="id">
        <RuntimeMessagesProvider messages={{ close: "Selesai" }}>
          <Dialog open title="Info" content="Saved" />
          <Drawer open closeButton onClose={() => undefined} title="Panel" />
        </RuntimeMessagesProvider>
      </RuntimeMessagesProvider>,
    );
    expect(screen.getByRole("button", { name: "Selesai" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tutup panel" })).toBeTruthy();
  });

  it("localize DataTable empty state and accessible names, keeping explicit props", () => {
    const { unmount } = render(
      <RuntimeMessagesProvider locale="id">
        <DataTable columns={[{ key: "name", label: "Name" }]} rows={[]} />
      </RuntimeMessagesProvider>,
    );
    expect(screen.getByText("Tidak ada data")).toBeTruthy();
    expect(screen.getByRole("table", { name: "Tabel data" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Baris tabel data" })).toBeTruthy();
    unmount();
    render(
      <RuntimeMessagesProvider locale="id">
        <DataTable title="Orders" columns={[{ key: "name", label: "Name" }]} rows={[]} emptyMessage="Belum ada pesanan" />
      </RuntimeMessagesProvider>,
    );
    expect(screen.getByText("Belum ada pesanan")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Baris Orders" })).toBeTruthy();
  });

  it("use the runtime locale as the default number format, behind a node's own locale", () => {
    const { unmount } = render(<UIDocumentRenderer document={doc(table())} locale="id" />);
    expect(screen.getAllByText("1.234,50").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ya").length).toBeGreaterThan(0);
    unmount();
    render(<UIDocumentRenderer document={doc(table({ locale: "en-US" }))} locale="id" />);
    expect(screen.getAllByText("1,234.50").length).toBeGreaterThan(0);
  });
});

describe("compiler runtime messages", () => {
  const meta: FormPageMeta = {
    name: "orders",
    label: { id: "Pesanan", en: "Orders" },
    titleField: "customer",
    fields: [{ key: "customer", label: { id: "Pelanggan", en: "Customer" }, widget: "Link", options: { doctype: "customers" } }],
  };
  const hostCapabilities: HostCapabilities = { collections: ["orders", "customers"], commands: [] };

  it("emit lookup states in the compile language", () => {
    const id = JSON.stringify(compileFormPage(meta, "new", { hostCapabilities, uiPolicy: { lang: "id" } }));
    expect(id).toContain("Memuat…");
    expect(id).toContain("Gagal memuat pilihan");
    expect(id).toContain("Tidak ada pilihan");
    expect(id).toContain("Pilih Pelanggan");
    const en = JSON.stringify(compileFormPage(meta, "new", { hostCapabilities, uiPolicy: { lang: "en" } }));
    expect(en).toContain("Loading…");
    expect(en).toContain("Failed to load options");
    expect(en).toContain("Select Customer");
  });
});
