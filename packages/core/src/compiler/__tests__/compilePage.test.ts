import { describe, expect, it } from "vitest";
import { compilePage, CapabilityValidationError } from "../compilePage.js";
import { DocumentSchema } from "../../schemas/document.js";
import type {
  HostCapabilities,
  ListPageMeta,
  FormPageMeta,
  ReportPageMeta,
  DashboardPageMeta,
  SettingsPageMeta,
  TreePageMeta,
  WizardPageMeta,
} from "../types.js";

const DEFAULT_CAPS: HostCapabilities = {
  collections: ["orders", "users", "items", "categories", "general"],
  commands: ["exportReport"],
  mutationCollections: ["orders", "users", "items", "categories", "general"],
};

describe("compilePage — Unified Pure Dispatcher", () => {
  it("compiles list recipe", () => {
    const meta: ListPageMeta = {
      name: "orders",
      label: { en: "Orders", id: "Pesanan" },
      titleField: "orderNumber",
      fields: [
        { key: "orderNumber", label: { en: "Order #", id: "No. Pesanan" }, widget: "TextField" },
        { key: "total", label: { en: "Total", id: "Total" }, widget: "Currency" },
      ],
      columns: [
        { field: "orderNumber" },
        { field: "total" },
      ],
      defaultSort: { field: "orderNumber", dir: "desc" },
    };

    const doc = compilePage({
      recipe: "list",
      meta,
      hostCapabilities: DEFAULT_CAPS,
    });

    expect(doc.id).toBe("list-orders");
    expect(doc.root).toBeDefined();
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("compiles form recipe with recordId", () => {
    const meta: FormPageMeta = {
      name: "orders",
      label: { en: "Order Form", id: "Form Pesanan" },
      titleField: "orderNumber",
      fields: [
        { key: "orderNumber", label: { en: "Order #", id: "No. Pesanan" }, widget: "TextField" },
      ],
    };

    const doc = compilePage({
      recipe: "form",
      meta,
      hostCapabilities: DEFAULT_CAPS,
      recordId: "101",
    });

    expect(doc.id).toBe("form-orders-101");
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("compiles report recipe", () => {
    const meta: ReportPageMeta = {
      name: "sales",
      label: { en: "Sales Report", id: "Laporan Penjualan" },
      columns: [
        { key: "period", label: { en: "Period", id: "Periode" } },
        { key: "revenue", label: { en: "Revenue", id: "Pendapatan" }, format: "currency" },
      ],
      dataSource: {
        $query: { collection: "orders" },
      },
    };

    const doc = compilePage({
      recipe: "report",
      meta,
      hostCapabilities: DEFAULT_CAPS,
    });

    expect(doc.id).toBe("report-sales");
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("compiles dashboard recipe", () => {
    const meta: DashboardPageMeta = {
      name: "sales-overview",
      label: { en: "Sales Overview", id: "Ikhtisar Penjualan" },
      kpis: [
        { label: { en: "Revenue", id: "Pendapatan" }, value: "Rp 1.000.000" },
      ],
    };

    const doc = compilePage({
      recipe: "dashboard",
      meta,
      hostCapabilities: DEFAULT_CAPS,
    });

    expect(doc.id).toBe("dashboard-sales-overview");
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("compiles settings recipe", () => {
    const meta: SettingsPageMeta = {
      name: "general",
      label: { en: "General Settings", id: "Pengaturan Umum" },
      sections: [
        {
          id: "site",
          label: { en: "Site", id: "Situs" },
          fields: [
            { key: "title", label: { en: "Title", id: "Judul" }, widget: "TextField" },
          ],
        },
      ],
    };

    const doc = compilePage({
      recipe: "settings",
      meta,
      hostCapabilities: DEFAULT_CAPS,
    });

    expect(doc.id).toBe("settings-general");
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("compiles tree recipe", () => {
    const meta: TreePageMeta = {
      name: "categories",
      label: { en: "Categories", id: "Kategori" },
      titleField: "name",
      fields: [
        { key: "name", label: { en: "Name", id: "Nama" }, widget: "TextField" },
      ],
      nodes: [
        { key: "cat-1", label: { en: "Electronics", id: "Elektronik" } },
      ],
    };

    const doc = compilePage({
      recipe: "tree",
      meta,
      hostCapabilities: DEFAULT_CAPS,
    });

    expect(doc.id).toBe("tree-categories");
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("compiles wizard recipe", () => {
    const meta: WizardPageMeta = {
      name: "onboarding",
      label: { en: "Onboarding Wizard", id: "Panduan Memulai" },
      steps: [
        {
          id: "step1",
          label: { en: "Profile", id: "Profil" },
          fields: [
            { key: "fullName", label: { en: "Full Name", id: "Nama Lengkap" }, widget: "TextField" },
          ],
        },
      ],
    };

    const doc = compilePage({
      recipe: "wizard",
      meta,
      hostCapabilities: DEFAULT_CAPS,
    });

    expect(doc.id).toBe("wizard-onboarding");
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("fails closed when capability validation fails", () => {
    const meta: ListPageMeta = {
      name: "secret_records",
      label: { en: "Secret", id: "Rahasia" },
      titleField: "id",
      fields: [{ key: "id", label: { en: "ID", id: "ID" }, widget: "TextField" }],
      columns: [{ field: "id" }],
      defaultSort: { field: "id", dir: "asc" },
    };

    expect(() => {
      compilePage({
        recipe: "list",
        meta,
        hostCapabilities: { collections: ["public_data"], commands: [] },
      });
    }).toThrow(CapabilityValidationError);

    try {
      compilePage({
        recipe: "list",
        meta,
        hostCapabilities: { collections: ["public_data"], commands: [] },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(CapabilityValidationError);
      const capErr = err as CapabilityValidationError;
      expect(capErr.issues.length).toBeGreaterThan(0);
      expect(capErr.issues[0].code).toBe("unknown_collection");
    }
  });
});
