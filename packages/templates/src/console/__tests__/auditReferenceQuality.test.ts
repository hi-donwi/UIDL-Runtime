import { describe, expect, it } from "vitest";
import type { CompanyDemo } from "../types";
import {
  assessReferenceMaturity,
  auditAntiGoalPatterns,
  classifyAction,
  summarizeFindings,
  type SourceSnapshot,
} from "../auditReferenceQuality";

function company(overrides: Partial<CompanyDemo> = {}): CompanyDemo {
  return {
    id: "tenant-a",
    company: "Tenant A",
    title: "Tenant A",
    subtitle: "Reference tenant",
    source: "test",
    patterns: [],
    nav: [],
    pages: {},
    ...overrides,
  };
}

const emptySources: SourceSnapshot = {
  referenceApp: "",
  createConsoleDocument: "",
  dataConfig: "",
  packageJson: { scripts: {} },
  files: new Set(),
};

describe("auditAntiGoalPatterns", () => {
  it("reports PageSpec runtime, missing modules, and toast-only actions", () => {
    const findings = auditAntiGoalPatterns({
      companies: [
        company({
          pages: {
            dashboard: {
              title: "Dashboard",
              module: "Sales",
              actions: ["+ Sales Invoice", "Print"],
              kpis: [],
              chartTitle: "Chart",
              chartType: "bar",
              chartRows: [],
              tables: [
                {
                  title: "Invoices",
                  columns: [{ key: "id", label: "ID" }],
                  rows: [{ id: "SINV-001" }],
                  rowActions: [{ label: "Open" }],
                },
              ],
            },
          },
        }),
      ],
      source: emptySources,
    });

    expect(summarizeFindings(findings)).toContain("console.pageSpecRuntime");
    expect(summarizeFindings(findings)).toContain("console.noActiveModules");
    expect(summarizeFindings(findings)).toContain("actions.toastOnly");
  });

  it("reports direct app-shell data writes and missing HTTP proof", () => {
    const findings = auditAntiGoalPatterns({
      companies: [company({ modules: [{ name: "sales", label: { id: "Penjualan", en: "Sales" } }] })],
      source: {
        ...emptySources,
        referenceApp: 'mockApi.create("SalesInvoice", record); setCompanyDataset(companies); if (companyId === "shoe-company") {}',
        files: new Set(["apps/reference/src/CreateRecordModal.tsx"]),
      },
    });

    const summary = summarizeFindings(findings);
    expect(summary).toContain("runtime.createRecordModal");
    expect(summary).toContain("runtime.directMockApi");
    expect(summary).toContain("runtime.directCompanyDataset");
    expect(summary).toContain("runtime.companyIdBranches");
    expect(summary).toContain("http.missingAdapter");
    expect(summary).toContain("http.missingMockServer");
    expect(summary).toContain("http.missingContractTests");
    expect(summary).toContain("http.missingScripts");
  });
});

describe("classifyAction", () => {
  it("keeps create-style actions separate from toast-only actions", () => {
    expect(classifyAction("+ Sales Invoice")).toBe("create");
    expect(classifyAction("Tambah Customer")).toBe("create");
    expect(classifyAction("Print")).toBe("toast-only");
  });
});

describe("assessReferenceMaturity", () => {
  it("classifies PageSpec-backed companies as UI references", () => {
    const [result] = assessReferenceMaturity({
      companies: [
        company({
          pages: {
            dashboard: {
              title: "Dashboard",
              module: "Overview",
              actions: [],
              kpis: [],
              chartTitle: "Chart",
              chartType: "bar",
              chartRows: [],
              tables: [],
            },
          },
        }),
      ],
      source: emptySources,
    });

    expect(result.level).toBe("ui-reference");
    expect(result.reasons.join(" ")).toContain("PageSpec");
  });

  it("marks a metadata-backed company as a functional reference even while another vertical is UI-only", () => {
    const [result] = assessReferenceMaturity({
      companies: [
        company({
          modules: [{ name: "sales", label: { id: "Penjualan", en: "Sales" } }],
          doctypes: [
            {
              name: "SalesInvoice",
              label: { id: "Faktur Penjualan", en: "Sales Invoice" },
              module: "Sales",
              naming: "SINV-.YYYY.-.#####",
              titleField: "customer",
              fields: [{ key: "customer", label: { id: "Pelanggan", en: "Customer" }, widget: "TextField" }],
              listView: { columns: [{ field: "customer" }], defaultSort: { field: "customer", dir: "asc" }, pageSize: 20 },
              permissions: {},
            },
          ],
        }),
        company({
          id: "legacy-tenant",
          pages: {
            dashboard: {
              title: "Dashboard",
              module: "Overview",
              actions: ["Print"],
              kpis: [],
              chartTitle: "Chart",
              chartType: "bar",
              chartRows: [],
              tables: [],
            },
          },
        }),
      ],
      source: {
        ...emptySources,
        referenceApp: "mockApi.update(collection, id, patch)",
      },
    });

    expect(result.level).toBe("functional-reference");
    expect(result.reasons.join(" ")).toContain("Functional reference");
  });

  it("promotes school-abc when dunning domain evidence is present", () => {
    const [result] = assessReferenceMaturity({
      companies: [
        company({
          id: "school-abc",
          modules: [{ name: "school-finance", label: { id: "School Finance", en: "School Finance" } }],
          doctypes: [
            {
              name: "TuitionFee",
              label: { id: "Tagihan SPP", en: "Tuition Fee" },
              module: "Education",
              naming: "SPP-.YYYY.-.#####",
              titleField: "studentName",
              fields: [{ key: "studentName", label: { id: "Siswa", en: "Student" }, widget: "TextField" }],
              listView: { columns: [{ field: "studentName" }], defaultSort: { field: "studentName", dir: "asc" }, pageSize: 20 },
              permissions: {},
            },
          ],
        }),
      ],
      source: {
        ...emptySources,
        packageJson: {
          scripts: {
            "mock:api": "node scripts/mock-server.mjs",
            "dev:reference:http": "vite --config apps/reference/vite.config.ts",
            "build:reference": "vite build --config apps/reference/vite.config.ts",
            "preview:reference": "vite preview --config apps/reference/vite.config.ts",
          },
        },
        files: new Set([
          "packages/core/src/data/adapters/http.ts",
          "scripts/mock-server.mjs",
          "packages/core/src/data/__tests__/contract.test.ts",
          "packages/templates/src/domain/services/schoolDunningService.ts",
          "packages/templates/src/domain/services/__tests__/schoolDunningService.test.ts",
          "e2e/meridian-reference.spec.ts",
        ]),
      },
    });

    expect(result.level).toBe("domain-verified-reference");
    expect(result.reasons.join(" ")).toContain("School dunning");
  });

  it("promotes hospital-medika when claim reconciliation domain evidence is present", () => {
    const [result] = assessReferenceMaturity({
      companies: [
        company({
          id: "hospital-medika",
          modules: [{ name: "clinical-ops", label: { id: "Clinical Ops", en: "Clinical Ops" } }],
          doctypes: [
            {
              name: "PatientAdmission",
              label: { id: "Pendaftaran Pasien", en: "Patient Admission" },
              module: "Healthcare",
              naming: "REG-MED-.#####",
              titleField: "patientName",
              fields: [{ key: "patientName", label: { id: "Pasien", en: "Patient" }, widget: "TextField" }],
              listView: { columns: [{ field: "patientName" }], defaultSort: { field: "patientName", dir: "asc" }, pageSize: 20 },
              permissions: {},
            },
          ],
        }),
      ],
      source: {
        ...emptySources,
        packageJson: {
          scripts: {
            "mock:api": "node scripts/mock-server.mjs",
            "dev:reference:http": "vite --config apps/reference/vite.config.ts",
            "build:reference": "vite build --config apps/reference/vite.config.ts",
            "preview:reference": "vite preview --config apps/reference/vite.config.ts",
          },
        },
        files: new Set([
          "packages/core/src/data/adapters/http.ts",
          "scripts/mock-server.mjs",
          "packages/core/src/data/__tests__/contract.test.ts",
          "packages/templates/src/domain/services/hospitalReconciliationService.ts",
          "packages/templates/src/domain/services/__tests__/hospitalReconciliationService.test.ts",
          "e2e/meridian-reference.spec.ts",
        ]),
      },
    });

    expect(result.level).toBe("domain-verified-reference");
    expect(result.reasons.join(" ")).toContain("Hospital claim reconciliation");
  });

  it("promotes helpdesk when SLA elapsed-time domain evidence is present", () => {
    const [result] = assessReferenceMaturity({
      companies: [
        company({
          id: "helpdesk",
          modules: [{ name: "support-desk", label: { id: "Support Desk", en: "Support Desk" } }],
          doctypes: [
            {
              name: "SupportTicket",
              label: { id: "Tiket", en: "Ticket" },
              module: "Help Desk",
              naming: "HD-TICK-.#####",
              titleField: "subject",
              fields: [{ key: "subject", label: { id: "Subjek", en: "Subject" }, widget: "TextField" }],
              listView: { columns: [{ field: "subject" }], defaultSort: { field: "subject", dir: "asc" }, pageSize: 20 },
              permissions: {},
            },
          ],
        }),
      ],
      source: {
        ...emptySources,
        packageJson: {
          scripts: {
            "mock:api": "node scripts/mock-server.mjs",
            "dev:reference:http": "vite --config apps/reference/vite.config.ts",
            "build:reference": "vite build --config apps/reference/vite.config.ts",
            "preview:reference": "vite preview --config apps/reference/vite.config.ts",
          },
        },
        files: new Set([
          "packages/core/src/data/adapters/http.ts",
          "scripts/mock-server.mjs",
          "packages/core/src/data/__tests__/contract.test.ts",
          "packages/templates/src/domain/services/helpdeskSlaService.ts",
          "packages/templates/src/domain/services/__tests__/helpdeskSlaService.test.ts",
          "e2e/meridian-reference.spec.ts",
        ]),
      },
    });

    expect(result.level).toBe("domain-verified-reference");
    expect(result.reasons.join(" ")).toContain("Helpdesk SLA elapsed time");
  });

  it("promotes koperasi-bmt when collectibility domain evidence is present", () => {
    const [result] = assessReferenceMaturity({
      companies: [
        company({
          id: "koperasi-bmt",
          modules: [{ name: "member-finance", label: { id: "Member Finance", en: "Member Finance" } }],
          doctypes: [
            {
              name: "MurabahahAgreement",
              label: { id: "Akad Murabahah", en: "Murabahah Agreement" },
              module: "Financial Services",
              naming: "AKAD-MRB-.#####",
              titleField: "memberName",
              fields: [{ key: "memberName", label: { id: "Anggota", en: "Member" }, widget: "TextField" }],
              listView: { columns: [{ field: "memberName" }], defaultSort: { field: "memberName", dir: "asc" }, pageSize: 20 },
              permissions: {},
            },
          ],
        }),
      ],
      source: {
        ...emptySources,
        packageJson: {
          scripts: {
            "mock:api": "node scripts/mock-server.mjs",
            "dev:reference:http": "vite --config apps/reference/vite.config.ts",
            "build:reference": "vite build --config apps/reference/vite.config.ts",
            "preview:reference": "vite preview --config apps/reference/vite.config.ts",
          },
        },
        files: new Set([
          "packages/core/src/data/adapters/http.ts",
          "scripts/mock-server.mjs",
          "packages/core/src/data/__tests__/contract.test.ts",
          "packages/templates/src/domain/services/koperasiCollectibilityService.ts",
          "packages/templates/src/domain/services/__tests__/koperasiCollectibilityService.test.ts",
          "e2e/meridian-reference.spec.ts",
        ]),
      },
    });

    expect(result.level).toBe("domain-verified-reference");
    expect(result.reasons.join(" ")).toContain("Koperasi murabahah collectibility");
  });
});
