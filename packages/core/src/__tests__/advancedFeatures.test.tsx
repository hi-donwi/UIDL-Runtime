import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QRCodeSVG, BarcodeSVG, DataMatrixSVG } from "../components/BarcodeAndQRCode";
import { formatRupiah, formatIndonesianDate, formatTerbilang, t } from "../utils/i18n";
import { generateUidlFromPrompt } from "../services/aiPromptGenerator";
import { DocumentSchema } from "../schemas/document";
import { VisualInspectorPanel } from "../../../../apps/reference/src/VisualInspectorPanel";
import type { UIDLDocument } from "../types";

describe("Barcode & QR Code Vector SVGs", () => {
  it("renders QRCodeSVG with custom size and value", () => {
    const { container } = render(<QRCodeSVG value="https://efaktur.pajak.go.id/validate" size={100} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "100");
    expect(svg).toHaveAttribute("height", "100");
    expect(svg).toHaveAttribute("aria-label", "QR Code for https://efaktur.pajak.go.id/validate");
  });

  it("renders BarcodeSVG with custom dimensions and text", () => {
    const { container } = render(<BarcodeSVG value="JT992108821" width={200} height={50} showText={true} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "200");
    expect(screen.getByText("JT992108821")).toBeInTheDocument();
  });

  it("renders DataMatrixSVG with ISO 13485 UDI value", () => {
    const { container } = render(<DataMatrixSVG value="UDI-LOT-2027" size={64} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "64");
    expect(svg).toHaveAttribute("aria-label", "UDI DataMatrix for UDI-LOT-2027");
  });
});

describe("Indonesian Localization (i18n) & Formatters", () => {
  it("translates common ERP keys correctly", () => {
    expect(t("dashboard", "id")).toBe("Dashboard");
    expect(t("operations", "en")).toBe("Operations");
    expect(t("taxInvoice", "id")).toBe("Faktur Pajak PPN 11%");
    expect(t("taxInvoice", "en")).toBe("VAT Tax Invoice 11%");
  });

  it("formats Indonesian Rupiah properly", () => {
    expect(formatRupiah(1500000)).toContain("Rp");
    expect(formatRupiah(1500000)).toContain("1.500.000");
    expect(formatRupiah("2450000", false)).toBe("2.450.000");
  });

  it("formats dates in Indonesian and English", () => {
    const date = new Date(2026, 7, 21); // Aug 21, 2026
    expect(formatIndonesianDate(date, "id")).toBe("21 Agustus 2026");
    expect(formatIndonesianDate(date, "en")).toBe("21 August 2026");
  });

  it("converts numbers to canonical Terbilang Rupiah", () => {
    expect(formatTerbilang(0)).toBe("Nol Rupiah");
    expect(formatTerbilang(1500000)).toBe("Satu Juta Lima Ratus Ribu Rupiah");
    expect(formatTerbilang(42000000)).toBe("Empat Puluh Dua Juta Rupiah");
    expect(formatTerbilang(3500000)).toBe("Tiga Juta Lima Ratus Ribu Rupiah");
  });
});

describe("AI Prompt-to-JSON Generator (Natural Language Synthesizer)", () => {
  it("generates valid Rental Mobil UIDL document", () => {
    const doc = generateUidlFromPrompt("Buatkan konsol rental mobil dan armada");
    expect(doc.id).toBe("ai-rental-fleet-console");
    const parsed = DocumentSchema.safeParse(doc);
    expect(parsed.success).toBe(true);
  });

  it("generates valid Payroll HRIS UIDL document", () => {
    const doc = generateUidlFromPrompt("Buatkan slip gaji karyawan dan bpjs payroll");
    expect(doc.id).toBe("ai-payroll-hr-console");
    const parsed = DocumentSchema.safeParse(doc);
    expect(parsed.success).toBe(true);
  });

  it("generates valid Hotel Room UIDL document", () => {
    const doc = generateUidlFromPrompt("Buatkan sistem hotel front desk dan occupancy");
    expect(doc.id).toBe("ai-hotel-room-console");
    const parsed = DocumentSchema.safeParse(doc);
    expect(parsed.success).toBe(true);
  });

  it("generates valid fallback document for arbitrary prompts", () => {
    const doc = generateUidlFromPrompt("Konsol Tracking Drone Perkebunan Sawit");
    expect(doc.name).toBe("Konsol Tracking Drone Perkebunan Sawit");
    const parsed = DocumentSchema.safeParse(doc);
    expect(parsed.success).toBe(true);
  });
});

describe("VisualInspectorPanel", () => {
  const sampleDoc: UIDLDocument = {
    version: "1.0.0",
    id: "test-doc",
    name: "Test Document",
    root: {
      id: "root-box",
      type: "Column",
      children: [
        { id: "text-title", type: "Text", props: { value: "Original Title", variant: "heading" } },
        { id: "action-btn", type: "Button", props: { label: "Submit Now", variant: "primary" } },
      ],
    },
  };

  it("renders component hierarchy tree and allows selecting nodes", () => {
    const onSelect = vi.fn();
    const onUpdate = vi.fn();
    const onClose = vi.fn();

    render(
      <VisualInspectorPanel
        document={sampleDoc}
        selectedNodeId="text-title"
        onSelectNodeId={onSelect}
        onUpdateNode={onUpdate}
        onClose={onClose}
      />
    );

    expect(screen.getByText("Visual Inspector")).toBeInTheDocument();
    expect(screen.getByText("Component Hierarchy Tree")).toBeInTheDocument();
    expect(screen.getAllByText("text-title").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("action-btn")).toBeInTheDocument();

    const input = screen.getByDisplayValue("Original Title");
    fireEvent.change(input, { target: { value: "Updated Title" } });

    const syncBtn = screen.getByText("Sinkronkan ke JSON Editor");
    fireEvent.click(syncBtn);

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "text-title",
        props: expect.objectContaining({ value: "Updated Title" }),
      })
    );
  });
});
