import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocumentSchema } from "../../schemas/document";
import { createDocumentState } from "../../state/createDocumentState";
import { defaultLightTheme } from "../../theme/presets";
import { renderUIDocument } from "../renderDocument";
import capabilitiesCatalog from "../../../../../packages/templates/src/catalog/families/capabilities.json";
import aiAgentContract from "../../../../../packages/templates/src/catalog/contracts/ai-agent-contract.json";
import recommendedCatalogStructure from "../../../../../packages/templates/src/catalog/recommended-catalog-structure.json";
import referenceSuiteDrafts from "../../../../../packages/templates/src/catalog/reference-suites/reference-suite-drafts.json";
import mockApiManifest from "../../../../../packages/templates/src/mock-api/manifest.json";
import mockApiWebsite from "../../../../../packages/templates/src/mock-api/website.json";
import mockApiDashboard from "../../../../../packages/templates/src/mock-api/dashboard.json";
import mockApiDocument from "../../../../../packages/templates/src/mock-api/document.json";
import mockApiSlide from "../../../../../packages/templates/src/mock-api/slide.json";
import mockApiSpreadsheet from "../../../../../packages/templates/src/mock-api/spreadsheet.json";
import mockApiSuites from "../../../../../packages/templates/src/mock-api/suites.json";
import mockApiErp from "../../../../../packages/templates/src/mock-api/erp.json";
import mockApiSession from "../../../../../packages/templates/src/mock-api/session.json";
import websiteLandingDocument from "../../../../../packages/templates/src/documents/website-landing.json";
import dashboardAnalyticsDocument from "../../../../../packages/templates/src/documents/dashboard-analytics.json";
import documentProposalDocument from "../../../../../packages/templates/src/documents/document-proposal.json";
import slideDeckDocument from "../../../../../packages/templates/src/documents/slide-deck.json";
import spreadsheetBudgetDocument from "../../../../../packages/templates/src/documents/spreadsheet-budget.json";
import saasGrowthSuiteDocument from "../../../../../packages/templates/src/documents/saas-growth-suite.json";
import financeOpsSuiteDocument from "../../../../../packages/templates/src/documents/finance-ops-suite.json";
import knowledgePackSuiteDocument from "../../../../../packages/templates/src/documents/knowledge-pack-suite.json";
import foodRoastersConsoleDocument from "../../../../../packages/templates/src/documents/food-roasters-console.json";
import epcContractorConsoleDocument from "../../../../../packages/templates/src/documents/epc-contractor-console.json";
import crmPipelineConsoleDocument from "../../../../../packages/templates/src/documents/crm-pipeline-console.json";
import koperasiBmtConsoleDocument from "../../../../../packages/templates/src/documents/koperasi-bmt-console.json";

const agentSession = {
  user: { id: "usr_1", name: "Finance Manager" },
  roles: ["Finance Manager"],
  permissions: {
    dashboard: true,
    revenue: true,
    admin: false,
    finance: { enabled: true, close: true, variance: true, admin: false },
    payroll: false,
  },
};

describe("universal visual generation examples", () => {
  it("documents the supported visual families for AI agents and host projects", () => {
    expect(capabilitiesCatalog.runtime).toBe("uidl-runtime");
    expect(capabilitiesCatalog.families.map((family) => family.id)).toEqual([
      "website",
      "dashboard",
      "document",
      "slide",
      "spreadsheet",
    ]);
    expect(aiAgentContract.outputRules).toContain("Return one valid UIDLDocument JSON object.");
    expect(aiAgentContract.minimumValidation).toContain("DocumentSchema.parse(document) succeeds.");
    expect(recommendedCatalogStructure.recommendedTree.map((entry) => entry.path)).toContain("packages/templates/src/catalog/reference-suites/");
    expect(referenceSuiteDrafts.suites.map((suite) => suite.id)).toEqual([
      "saas-growth-suite",
      "finance-ops-suite",
      "knowledge-pack-suite",
    ]);
  });

  it("documents complete mock API fixtures for every reference family", () => {
    expect(mockApiManifest.host).toBe("https://mock.uidl-runtime.local");
    expect(mockApiManifest.usage.apiAllowlist).toEqual(["mock.uidl-runtime.local"]);
    expect(mockApiManifest.files.map((file) => file.family)).toEqual([
      "website",
      "dashboard",
      "document",
      "slide",
      "spreadsheet",
      "suites",
      "erp",
      "session",
    ]);

    for (const fixture of [
      mockApiWebsite,
      mockApiDashboard,
      mockApiDocument,
      mockApiSlide,
      mockApiSpreadsheet,
      mockApiSuites,
      mockApiErp,
      mockApiSession,
    ]) {
      expect(fixture.endpoints.length).toBeGreaterThan(0);
      for (const endpoint of fixture.endpoints) {
        expect(endpoint.method).toBe("GET");
        expect(endpoint.path).toMatch(/^\//);
        expect(endpoint.statePath).toMatch(/^api\./);
        expect(endpoint.response).toBeDefined();
      }
    }
  });

  it("parses and renders the website landing example", () => {
    const document = DocumentSchema.parse(websiteLandingDocument);
    render(<>{renderUIDocument(document, { theme: defaultLightTheme, dataSources: document.dataSources })}</>);

    expect(screen.getByText("AtlasFlow")).toBeInTheDocument();
    expect(screen.getByText("Generate polished landing pages from JSON schema")).toBeInTheDocument();
    expect(screen.getByText("Reusable Patterns")).toBeInTheDocument();
  });

  it("parses and renders the session-aware dashboard example", () => {
    const document = DocumentSchema.parse(dashboardAnalyticsDocument);
    const stateStore = createDocumentState(document.state).getState();
    render(<>{renderUIDocument(document, {
      theme: defaultLightTheme,
      dataSources: document.dataSources,
      stateStore,
      session: agentSession,
    })}</>);

    expect(screen.getByText("InsightOps")).toBeInTheDocument();
    expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Finance Manager")).toBeInTheDocument();
    expect(screen.getAllByText("Revenue").length).toBeGreaterThan(0);
    expect(screen.queryByText("Admin")).toBeNull();
    expect(screen.getByText("Top Segments")).toBeInTheDocument();
  });

  it("parses and renders the document proposal example", () => {
    const document = DocumentSchema.parse(documentProposalDocument);
    render(<>{renderUIDocument(document, { theme: defaultLightTheme, dataSources: document.dataSources })}</>);

    expect(screen.getByText("Business Proposal")).toBeInTheDocument();
    expect(screen.getByText("AI-Generated Operations Portal")).toBeInTheDocument();
    expect(screen.getByText("Implementation Plan")).toBeInTheDocument();
    expect(screen.getByText("Client Approval")).toBeInTheDocument();
  });

  it("parses and renders the slide deck example", () => {
    const document = DocumentSchema.parse(slideDeckDocument);
    render(<>{renderUIDocument(document, { theme: defaultLightTheme, dataSources: document.dataSources })}</>);

    expect(screen.getByText("UIDL Universal Schema")).toBeInTheDocument();
    expect(screen.getByText("Agenda")).toBeInTheDocument();
    expect(screen.getByText("Adoption Plan")).toBeInTheDocument();
    expect(screen.getAllByText("Artifacts Generated").length).toBeGreaterThan(0);
  });

  it("parses and renders the spreadsheet budget example", () => {
    const document = DocumentSchema.parse(spreadsheetBudgetDocument);
    render(<>{renderUIDocument(document, { theme: defaultLightTheme, dataSources: document.dataSources })}</>);

    expect(screen.getByText("FY2027 Budget Workbook")).toBeInTheDocument();
    expect(screen.getByText("Operating Budget")).toBeInTheDocument();
    expect(screen.getByText("Variance Review")).toBeInTheDocument();
    expect(screen.getAllByText("SUM(B:E)").length).toBeGreaterThan(0);
  });

  it("parses and renders the SaaS growth complete reference draft", () => {
    const document = DocumentSchema.parse(saasGrowthSuiteDocument);
    render(<>{renderUIDocument(document, { theme: defaultLightTheme, dataSources: document.dataSources })}</>);

    expect(screen.getByText("MeridianCRM Launch Suite")).toBeInTheDocument();
    expect(screen.getByText("Growth Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Campaign Brief")).toBeInTheDocument();
    expect(screen.getByText("Board Slide")).toBeInTheDocument();
    expect(screen.getByText("Channel Budget")).toBeInTheDocument();
  });

  it("parses and renders the finance operations complete reference draft with RBAC", () => {
    const document = DocumentSchema.parse(financeOpsSuiteDocument);
    const stateStore = createDocumentState(document.state).getState();
    render(<>{renderUIDocument(document, {
      theme: defaultLightTheme,
      dataSources: document.dataSources,
      stateStore,
      session: agentSession,
    })}</>);

    expect(screen.getByText("Finance Operations Suite")).toBeInTheDocument();
    expect(screen.getAllByText("Month-End Close").length).toBeGreaterThan(0);
    expect(screen.getByText("Variance Memo")).toBeInTheDocument();
    expect(screen.getByText("Working Capital Workbook")).toBeInTheDocument();
    expect(screen.queryByText("Admin Controls")).toBeNull();
  });

  it("parses and renders the knowledge pack complete reference draft", () => {
    const document = DocumentSchema.parse(knowledgePackSuiteDocument);
    render(<>{renderUIDocument(document, { theme: defaultLightTheme, dataSources: document.dataSources })}</>);

    expect(screen.getByText("Knowledge Pack Suite")).toBeInTheDocument();
    expect(screen.getByText("Learning Guide")).toBeInTheDocument();
    expect(screen.getByText("Workshop Deck")).toBeInTheDocument();
    expect(screen.getByText("Exercise Sheet")).toBeInTheDocument();
  });

  it("parses and renders the Nusantara Coffee Roasters vertical console", () => {
    const document = DocumentSchema.parse(foodRoastersConsoleDocument);
    render(<>{renderUIDocument(document, { theme: defaultLightTheme, dataSources: document.dataSources })}</>);

    expect(screen.getByText("Nusantara Coffee Roasters Production Console")).toBeInTheDocument();
    expect(screen.getByText("Bill of Materials (BOM) & Multi-stage Roasting Operations")).toBeInTheDocument();
    expect(screen.getByText("Quality Inspection Gates (Defect Threshold & Agtron Color Check)")).toBeInTheDocument();
    expect(screen.getByText("Green Bean Silo Stock & Reorder Points")).toBeInTheDocument();
  });

  it("parses and renders the PT Rekayasa Konstruksi Nusantara EPC console", () => {
    const document = DocumentSchema.parse(epcContractorConsoleDocument);
    render(<>{renderUIDocument(document, { theme: defaultLightTheme, dataSources: document.dataSources })}</>);

    expect(screen.getByText("PT Rekayasa Konstruksi Nusantara — EPC Project Console")).toBeInTheDocument();
    expect(screen.getByText("Work Breakdown Structure (WBS) & Engineering Milestones")).toBeInTheDocument();
    expect(screen.getByText("Subcontractor Progress & 5% Retention Control")).toBeInTheDocument();
    expect(screen.getByText("Owner Progress Billing & Percentage of Completion (PoC)")).toBeInTheDocument();
  });

  it("parses and renders the Pipeline CRM pipeline console with KanbanBoard", () => {
    const document = DocumentSchema.parse(crmPipelineConsoleDocument);
    render(<>{renderUIDocument(document, { theme: defaultLightTheme, dataSources: document.dataSources })}</>);

    expect(screen.getByText("Pipeline CRM — Opportunity & Pipeline Hub")).toBeInTheDocument();
    expect(screen.getByText("Opportunity Deal Flow (Kanban View)")).toBeInTheDocument();
    expect(screen.getByText("Lead Qualification")).toBeInTheDocument();
    expect(screen.getByText("Closed Won")).toBeInTheDocument();
    expect(screen.getByText("Sales Representative Performance & Quota Attainment")).toBeInTheDocument();
  });

  it("parses and renders the Koperasi & BMT Syariah console with SHU TreeView", () => {
    const document = DocumentSchema.parse(koperasiBmtConsoleDocument);
    render(<>{renderUIDocument(document, { theme: defaultLightTheme, dataSources: document.dataSources })}</>);

    expect(screen.getByText("Koperasi & BMT Syariah Mandiri")).toBeInTheDocument();
    expect(screen.getByText("Struktur Hierarki Distribusi SHU Anggota Sesuai RAT")).toBeInTheDocument();
    expect(screen.getByText("Akad Pembiayaan Anggota Aktif (Murabahah & Ijarah)")).toBeInTheDocument();
    expect(screen.getByText("Daftar Rekening Simpanan Anggota")).toBeInTheDocument();
    expect(screen.getByText(/Kepatuhan Perpajakan DJP/)).toBeInTheDocument();
  });
});
