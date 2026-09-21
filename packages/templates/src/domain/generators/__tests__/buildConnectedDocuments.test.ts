import { describe, expect, it } from "vitest";
import { buildConnectedDocumentsSection, type ConnectedDocLink } from "../buildConnectedDocuments";
import { NodeSchema } from "~/schemas/document";

describe("Connected Documents Panel Generator", () => {
  it("returns null when links array is empty", () => {
    const section = buildConnectedDocumentsSection([]);
    expect(section).toBeNull();
  });

  it("builds a structured section with bidirectional clickable buttons", () => {
    const links: ConnectedDocLink[] = [
      {
        doctype: "SalesOrder",
        id: "SO-2027-00018",
        label: "Sales Order",
        route: "/meridian/edit/SalesOrder/SO-2027-00018",
      },
      {
        doctype: "DeliveryNote",
        id: "DN-2027-00004",
        label: "Delivery Note",
        route: "/meridian/edit/DeliveryNote/DN-2027-00004",
      },
      {
        doctype: "Payment",
        id: "PAY-2027-00002",
        label: "Payment",
        route: "/meridian/edit/SalesPayment/PAY-2027-00002",
      },
    ];

    const section = buildConnectedDocumentsSection(links);
    expect(section).not.toBeNull();

    // Verify it parses cleanly with NodeSchema
    const parsed = NodeSchema.parse(section);
    expect(parsed.id).toBe("connected-documents-section");
    expect(parsed.type).toBe("Container");
    expect(parsed.children).toHaveLength(2); // Title + Row

    const row = parsed.children?.[1];
    expect(row?.type).toBe("Row");
    expect(row?.children).toHaveLength(3);
    expect(row?.children?.[0].props?.label).toContain("Sales Order: SO-2027-00018");
    expect(row?.children?.[0].events?.onClick).toEqual([
      { navigate: { route: "/meridian/edit/SalesOrder/SO-2027-00018" } },
    ]);
  });
});
