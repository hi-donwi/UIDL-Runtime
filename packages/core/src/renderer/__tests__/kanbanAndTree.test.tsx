import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { defaultRegistry } from "../../registry/registry";
import { DocumentSchema } from "../../schemas/document";
import { defaultLightTheme } from "../../theme/presets";
import { renderUIDocument } from "../renderDocument";

describe("JSON-first Kanban and TreeView widgets", () => {
  it("registers KanbanBoard and TreeView in defaultRegistry as data widgets", () => {
    expect(defaultRegistry.get("KanbanBoard")?.category).toBe("data");
    expect(defaultRegistry.get("KanbanBoard")?.acceptsChildren).toBe(false);
    expect(defaultRegistry.get("TreeView")?.category).toBe("data");
    expect(defaultRegistry.get("TreeView")?.acceptsChildren).toBe(false);
  });

  it("resolves a KanbanBoard dataSource and columns into grouped cards", () => {
    const document = DocumentSchema.parse({
      version: "1.0.0",
      id: "kanban-doc",
      name: "Kanban Doc",
      root: {
        id: "board",
        type: "KanbanBoard",
        props: {
          title: "Deal Pipeline",
          dataSource: "deals",
          columns: [
            { id: "lead", title: "New Leads", color: "#3b82f6" },
            { id: "proposal", title: "In Proposal", color: "#f59e0b" },
            { id: "won", title: "Deals Won", color: "#10b981" },
          ],
        },
      },
    });

    render(
      <>{renderUIDocument(document, {
        theme: defaultLightTheme,
        dataSources: {
          deals: [
            { id: "d1", columnId: "lead", title: "PT Maju Perkasa", subtitle: "Enterprise ERP", value: "Rp 150.000.000", badge: "Hot" },
            { id: "d2", columnId: "proposal", title: "CV Sumber Berkah", subtitle: "POS + CRM", value: "Rp 45.000.000" },
            { id: "d3", columnId: "won", title: "PT Global Mandiri", subtitle: "Cloud Subscription", value: "Rp 85.000.000", badge: "Annual" },
          ],
        },
      })}</>,
    );

    expect(screen.getByText("Deal Pipeline")).toBeInTheDocument();
    expect(screen.getByText("New Leads")).toBeInTheDocument();
    expect(screen.getByText("In Proposal")).toBeInTheDocument();
    expect(screen.getByText("Deals Won")).toBeInTheDocument();
    expect(screen.getByText("PT Maju Perkasa")).toBeInTheDocument();
    expect(screen.getByText("Rp 150.000.000")).toBeInTheDocument();
    expect(screen.getByText("Hot")).toBeInTheDocument();
    expect(screen.getByText("CV Sumber Berkah")).toBeInTheDocument();
    expect(screen.getByText("PT Global Mandiri")).toBeInTheDocument();
  });

  it("resolves a TreeView dataSource into a hierarchical tree structure", () => {
    const document = DocumentSchema.parse({
      version: "1.0.0",
      id: "tree-doc",
      name: "Tree Doc",
      root: {
        id: "tree",
        type: "TreeView",
        props: {
          title: "Bill of Materials: Meja Kantor",
          dataSource: "bomTree",
        },
      },
    });

    render(
      <>{renderUIDocument(document, {
        theme: defaultLightTheme,
        dataSources: {
          bomTree: [
            {
              id: "root-1",
              label: "Meja Kantor Solid (Finished Good)",
              badge: "Assembly",
              value: "Rp 1.850.000",
              children: [
                {
                  id: "child-1",
                  label: "Papan Kayu Jati 120x60",
                  badge: "Raw Material",
                  value: "Rp 650.000",
                },
                {
                  id: "child-2",
                  label: "Rangka Kaki Besi Powder Coat",
                  badge: "Sub-assembly",
                  value: "Rp 420.000",
                  children: [
                    { id: "sub-1", label: "Pipa Besi Hollow 4x4", badge: "Raw", value: "Rp 210.000" },
                    { id: "sub-2", label: "Jasa Welding & Coating", badge: "Operation", value: "Rp 210.000" },
                  ],
                },
              ],
            },
          ],
        },
      })}</>,
    );

    expect(screen.getByText("Bill of Materials: Meja Kantor")).toBeInTheDocument();
    expect(screen.getByText("Meja Kantor Solid (Finished Good)")).toBeInTheDocument();
    expect(screen.getByText("Papan Kayu Jati 120x60")).toBeInTheDocument();
    expect(screen.getByText("Rangka Kaki Besi Powder Coat")).toBeInTheDocument();
    expect(screen.getByText("Pipa Besi Hollow 4x4")).toBeInTheDocument();
  });
});
