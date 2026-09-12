import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderUIDocument } from "../renderDocument";
import { defaultLightTheme } from "../../theme/presets";
import {
  buildTaxInvoicePrintDocument,
  buildDeliveryNotePrintDocument,
  buildPurchaseOrderPrintDocument,
  buildCertificateOfAnalysisPrintDocument,
  buildMedicalPrescriptionPrintDocument,
  buildAkadMurabahahPrintDocument,
  buildPackingSlipPrintDocument,
  buildPosReceiptPrintDocument,
  buildTuitionInvoicePrintDocument,
  buildWorkOrderPrintDocument,
  buildRoastingProfilePrintDocument,
  buildBastPrintDocument,
  buildCommercialQuotationPrintDocument,
  buildSlaIncidentReportPrintDocument,
} from "../../../../../packages/templates/src/meridian/printFormats";
import { parseMeridianRoute, routeTitle } from "../../../../../packages/templates/src/meridian/routing";

describe("meridian demo print formats & tax invoices", () => {
  it("parses print routes correctly", () => {
    const route = parseMeridianRoute("/meridian/print/tax-invoice/SalesInvoice/SINV-2027-00001");
    expect(route.kind).toBe("print");
    expect(route.templateId).toBe("tax-invoice");
    expect(route.doctype).toBe("SalesInvoice");
    expect(route.id).toBe("SINV-2027-00001");
    expect(routeTitle(route)).toBe("Cetak SalesInvoice: SINV-2027-00001");
  });

  it("builds and renders Indonesian Tax Invoice (Faktur Pajak PPN 11%)", () => {
    const doc = buildTaxInvoicePrintDocument("SINV-2027-00001");
    expect(doc).toBeDefined();
    if (!doc) return;

    render(<>{renderUIDocument(doc, { theme: defaultLightTheme, dataSources: doc.dataSources })}</>);
    expect(screen.getByText("FAKTUR PAJAK")).toBeInTheDocument();
    expect(screen.getByText("PENGUSAHA KENA PAJAK (PENJUAL)")).toBeInTheDocument();
    expect(screen.getByText(/01\.345\.678\.9-012\.000/)).toBeInTheDocument();
    expect(screen.getByText("Dasar Pengenaan Pajak (DPP) :")).toBeInTheDocument();
    expect(screen.getByText("PPN yang Terutang = 11% x Dasar Pengenaan Pajak :")).toBeInTheDocument();
  });

  it("builds and renders Delivery Note / Surat Jalan print format", () => {
    const doc = buildDeliveryNotePrintDocument("DN-2027-00001");
    expect(doc).toBeDefined();
    if (!doc) return;

    render(<>{renderUIDocument(doc, { theme: defaultLightTheme, dataSources: doc.dataSources })}</>);
    expect(screen.getByText("SURAT JALAN & PENGANTAR BARANG")).toBeInTheDocument();
    expect(screen.getByText("Diserahkan Oleh (Gudang)")).toBeInTheDocument();
    expect(screen.getByText("Pengemudi / Ekspedisi")).toBeInTheDocument();
    expect(screen.getByText("Diterima Dengan Baik Oleh")).toBeInTheDocument();
  });

  it("builds and renders Purchase Order slip print format", () => {
    const doc = buildPurchaseOrderPrintDocument("PO-2027-00031");
    expect(doc).toBeDefined();
    if (!doc) return;

    render(<>{renderUIDocument(doc, { theme: defaultLightTheme, dataSources: doc.dataSources })}</>);
    expect(screen.getByText("PURCHASE ORDER (PO)")).toBeInTheDocument();
    expect(screen.getByText("VENDOR / SUPPLIER :")).toBeInTheDocument();
    expect(screen.getByText("Dibuat Oleh (Purchasing Officer)")).toBeInTheDocument();
    expect(screen.getByText("Disetujui Oleh (Direktur Keuangan)")).toBeInTheDocument();
  });

  it("builds and renders Certificate of Analysis (CoA ISO 13485) print format", () => {
    const doc = buildCertificateOfAnalysisPrintDocument("DHR-2027-B091");
    expect(doc).toBeDefined();

    render(<>{renderUIDocument(doc, { theme: defaultLightTheme, dataSources: doc.dataSources })}</>);
    expect(screen.getByText("CERTIFICATE OF ANALYSIS (CoA)")).toBeInTheDocument();
    expect(screen.getByText("PT MEDTECH PRECISION INDONESIA")).toBeInTheDocument();
    expect(screen.getByText("KESIMPULAN QA (QUALITY ASSURANCE CONCLUSION):")).toBeInTheDocument();
  });

  it("builds and renders Medical Prescription & Pharmacy FEFO print format", () => {
    const doc = buildMedicalPrescriptionPrintDocument("RM-2027-0412");
    expect(doc).toBeDefined();

    render(<>{renderUIDocument(doc, { theme: defaultLightTheme, dataSources: doc.dataSources })}</>);
    expect(screen.getByText("SALINAN RESEP DOKTER (APOTEK)")).toBeInTheDocument();
    expect(screen.getByText("RS MEDIKA NUSANTARA")).toBeInTheDocument();
    expect(screen.getByText("Petugas Dispensing Apoteker")).toBeInTheDocument();
  });

  it("builds and renders Akad Pembiayaan Murabahah Syariah print format", () => {
    const doc = buildAkadMurabahahPrintDocument("MRB-2027-0104");
    expect(doc).toBeDefined();

    render(<>{renderUIDocument(doc, { theme: defaultLightTheme, dataSources: doc.dataSources })}</>);
    expect(screen.getByText("SURAT PERJANJIAN AKAD PEMBIAYAAN MURABAHAH (JUAL-BELI)")).toBeInTheDocument();
    expect(screen.getByText("KOPERASI & BMT SYARIAH MANDIRI")).toBeInTheDocument();
    expect(screen.getByText("Jadwal Angsuran Bulanan Murabahah")).toBeInTheDocument();
  });

  it("builds and renders Omnichannel Shipping Label & Packing Slip print format", () => {
    const doc = buildPackingSlipPrintDocument("ORD-SHP-99210");
    expect(doc).toBeDefined();

    render(<>{renderUIDocument(doc, { theme: defaultLightTheme, dataSources: doc.dataSources })}</>);
    expect(screen.getByText("SHIPPING LABEL & PACKING SLIP")).toBeInTheDocument();
    expect(screen.getByText("NUSANTARA OMNICHANNEL DISTRIBUTION")).toBeInTheDocument();
    expect(screen.getByText("JT992108821")).toBeInTheDocument();
  });

  it("builds and renders POS Receipt print format", () => {
    const doc = buildPosReceiptPrintDocument("POS-2027-001");
    expect(doc).toBeDefined();

    render(<>{renderUIDocument(doc, { theme: defaultLightTheme, dataSources: doc.dataSources })}</>);
    expect(screen.getByText("STRUK KASIR & BUKTI TRANSAKSI POS", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("TOKO SEPATU NUSANTARA")).toBeInTheDocument();
    expect(screen.getByText("TOTAL PEMBAYARAN")).toBeInTheDocument();
  });

  it("builds and renders Tuition Invoice print format", () => {
    const doc = buildTuitionInvoicePrintDocument("NIS-2027-0104");
    expect(doc).toBeDefined();

    render(<>{renderUIDocument(doc, { theme: defaultLightTheme, dataSources: doc.dataSources })}</>);
    expect(screen.getByText("SURAT TAGIHAN SPP & BIAYA PENDIDIKAN")).toBeInTheDocument();
    expect(screen.getByText("SEKOLAH ISLAM TERPADU ABC")).toBeInTheDocument();
    expect(screen.getByText(/TOTAL TAGIHAN/)).toBeInTheDocument();
  });

  it("builds and renders Manufacturing Work Order print format", () => {
    const doc = buildWorkOrderPrintDocument("WO-2027-001");
    expect(doc).toBeDefined();

    render(<>{renderUIDocument(doc, { theme: defaultLightTheme, dataSources: doc.dataSources })}</>);
    expect(screen.getByText("SURAT PERINTAH KERJA (SPK) & ROUTING PRODUKSI")).toBeInTheDocument();
    expect(screen.getByText("PT PABRIK NUSANTARA MANUFAKTUR")).toBeInTheDocument();
    expect(screen.getByText("Alokasi Bill of Materials (BOM) & Kebutuhan Bahan")).toBeInTheDocument();
  });

  it("builds and renders Roasting Profile Log print format", () => {
    const doc = buildRoastingProfilePrintDocument("ROAST-2027-001");
    expect(doc).toBeDefined();

    render(<>{renderUIDocument(doc, { theme: defaultLightTheme, dataSources: doc.dataSources })}</>);
    expect(screen.getByText("BATCH ROASTING LOG & SENSORY CUPPING SCORECARD")).toBeInTheDocument();
    expect(screen.getByText("NUSANTARA SPECIALTY COFFEE ROASTERS")).toBeInTheDocument();
    expect(screen.getByText("SCA Sensory Cupping Evaluation (Q-Grader Protocol)")).toBeInTheDocument();
  });

  it("builds and renders BAST Milestone print format", () => {
    const doc = buildBastPrintDocument("BAST-2027-001");
    expect(doc).toBeDefined();

    render(<>{renderUIDocument(doc, { theme: defaultLightTheme, dataSources: doc.dataSources })}</>);
    expect(screen.getByText("BERITA ACARA SERAH TERIMA (BAST) & PROGRES TERMIN PROYEK")).toBeInTheDocument();
    expect(screen.getByText("PT MAHAKARYA KONSTRUKSI EPC INDONESIA")).toBeInTheDocument();
  });

  it("builds and renders Commercial Quotation print format", () => {
    const doc = buildCommercialQuotationPrintDocument("QUO-2027-001");
    expect(doc).toBeDefined();

    render(<>{renderUIDocument(doc, { theme: defaultLightTheme, dataSources: doc.dataSources })}</>);
    expect(screen.getByText("SURAT PENAWARAN HARGA KOMERSIAL (COMMERCIAL QUOTATION)")).toBeInTheDocument();
    expect(screen.getByText("ENTERPRISE CRM PIPELINE & CLOUD SOLUTIONS")).toBeInTheDocument();
  });

  it("builds and renders SLA Incident Report print format", () => {
    const doc = buildSlaIncidentReportPrintDocument("TICK-2027-001");
    expect(doc).toBeDefined();

    render(<>{renderUIDocument(doc, { theme: defaultLightTheme, dataSources: doc.dataSources })}</>);
    expect(screen.getByText("INCIDENT POST-MORTEM & SLA RESOLUTION CERTIFICATE")).toBeInTheDocument();
    expect(screen.getByText("CLOUDDESK GLOBAL SUPPORT CENTER")).toBeInTheDocument();
  });
});

