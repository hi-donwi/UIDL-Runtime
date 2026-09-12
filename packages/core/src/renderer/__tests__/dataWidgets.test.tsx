import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { defaultRegistry } from "../../registry/registry";
import { DocumentSchema } from "../../schemas/document";
import { defaultLightTheme } from "../../theme/presets";
import { renderUIDocument } from "../renderDocument";
import shoeCompanyDocument from "../../../../../packages/templates/src/documents/shoe-company-console.json";
import schoolAbcDocument from "../../../../../packages/templates/src/documents/school-abc-console.json";
import factoryAbcDocument from "../../../../../packages/templates/src/documents/factory-abc-console.json";

describe("JSON-first data widgets", () => {
  it("registers DataTable and Chart as renderable data widgets", () => {
    expect(defaultRegistry.get("DataTable")?.category).toBe("data");
    expect(defaultRegistry.get("DataTable")?.acceptsChildren).toBe(false);
    expect(defaultRegistry.get("Chart")?.category).toBe("data");
    expect(defaultRegistry.get("Chart")?.acceptsChildren).toBe(false);
  });

  it("resolves a DataTable dataSource into rows at render time", () => {
    const document = DocumentSchema.parse({
      version: "1.0.0",
      id: "table-doc",
      name: "Table Doc",
      root: {
        id: "table",
        type: "DataTable",
        props: {
          title: "Invoices",
          dataSource: "invoices",
          columns: [
            { key: "name", label: "Invoice" },
            { key: "total", label: "Total", align: "right" },
          ],
        },
      },
    });

    render(<>{renderUIDocument(document, {
      theme: defaultLightTheme,
      dataSources: {
        invoices: [{ name: "SINV-0001", total: "$4,200" }],
      },
    })}</>);

    expect(screen.getByText("Invoices")).toBeInTheDocument();
    expect(screen.getByText("SINV-0001")).toBeInTheDocument();
    expect(screen.getByText("$4,200")).toBeInTheDocument();
  });

  it("resolves a Chart dataSource into visualized rows", () => {
    const document = DocumentSchema.parse({
      version: "1.0.0",
      id: "chart-doc",
      name: "Chart Doc",
      root: {
        id: "chart",
        type: "Chart",
        props: {
          title: "Cashflow",
          chartType: "bar",
          dataSource: "cashflow",
          xKey: "label",
          yKey: "value",
        },
      },
    });

    render(<>{renderUIDocument(document, {
      theme: defaultLightTheme,
      dataSources: {
        cashflow: [{ label: "Jan", value: 18000 }],
      },
    })}</>);

    expect(screen.getAllByText("Cashflow").length).toBeGreaterThan(0);
    expect(screen.getByText("Jan")).toBeInTheDocument();
    // The chart itself is an SVG labelled with the widget title (Meridian draws its own charts
    // rather than printing the chart type as a chip — see src/components/charts.tsx).
    expect(screen.getByRole("img", { name: "Cashflow" })).toBeInTheDocument();
  });
});

describe("ERP company console JSON documents", () => {
  it("parses and renders the shoe retail console", () => {
    const document = DocumentSchema.parse(shoeCompanyDocument);

    render(<>{renderUIDocument(document, {
      theme: defaultLightTheme,
      dataSources: document.dataSources,
    })}</>);

    expect(screen.getByText("Toko Sepatu Nusantara")).toBeInTheDocument();
    expect(screen.getByText("ERP Modules Console")).toBeInTheDocument();
    expect(screen.getAllByText("POS Closing").length).toBeGreaterThan(0);
    expect(screen.getByText("Balanced General Ledger Preview")).toBeInTheDocument();
  });

  it("parses and renders the school finance console", () => {
    const document = DocumentSchema.parse(schoolAbcDocument);

    render(<>{renderUIDocument(document, {
      theme: defaultLightTheme,
      dataSources: document.dataSources,
    })}</>);

    expect(screen.getByText("Sekolah ABC")).toBeInTheDocument();
    expect(screen.getByText("Student Receivables")).toBeInTheDocument();
    expect(screen.getByText("Payroll")).toBeInTheDocument();
    expect(screen.getByText("Balanced Posting Preview")).toBeInTheDocument();
  });

  it("parses and renders the factory manufacturing console", () => {
    const document = DocumentSchema.parse(factoryAbcDocument);

    render(<>{renderUIDocument(document, {
      theme: defaultLightTheme,
      dataSources: document.dataSources,
    })}</>);

    expect(screen.getByText("Pabrik ABC")).toBeInTheDocument();
    expect(screen.getByText("Work Orders")).toBeInTheDocument();
    expect(screen.getByText("Stock Value Tie-Out")).toBeInTheDocument();
    expect(screen.getByText("Manufacturing GL Preview")).toBeInTheDocument();
  });
});
