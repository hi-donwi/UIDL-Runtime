import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReferenceApp } from "../../../../apps/reference/src/ReferenceApp";

describe("local JSON reference app", () => {
  it("loads a company module directly from a reloadable URL", () => {
    window.history.pushState({}, "", "/console/factory-abc/dashboard");
    render(<ReferenceApp />);

    expect(window.location.pathname).toBe("/app/factory-abc/manufacturing-ops");
    expect(screen.getAllByText("Manufacturing Ops").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Work Order").length).toBeGreaterThan(0);
  });

  it("starts on a domain catalog and opens an ERP company console", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/");
    render(<ReferenceApp />);

    expect(screen.getByText("Reusable finance consoles for real operating models")).toBeInTheDocument();
    expect(screen.getByText("Toko Sepatu Nusantara")).toBeInTheDocument();
    expect(screen.getByText("Sekolah ABC")).toBeInTheDocument();
    expect(screen.getByText("Pabrik ABC")).toBeInTheDocument();
    expect(screen.getByText("Nusantara Coffee Roasters")).toBeInTheDocument();
    expect(screen.getByText("Rekayasa Konstruksi Nusantara (EPC)")).toBeInTheDocument();
    expect(screen.getByText("Pipeline CRM Opportunity Hub")).toBeInTheDocument();
    expect(screen.getByText("Koperasi & BMT Syariah Mandiri")).toBeInTheDocument();
    expect(screen.getByText("RS Medika Nusantara")).toBeInTheDocument();
    expect(screen.getByText("PT Medtech Precision Indonesia")).toBeInTheDocument();
    expect(screen.getByText("Nusantara Omnichannel Distribution")).toBeInTheDocument();
    expect(screen.getByText("CloudDesk Support Center")).toBeInTheDocument();
    expect(screen.queryByText("Editor Sample")).not.toBeInTheDocument();
    expect(screen.queryByText("Meridian")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Buka Konsol" })[1]);

    expect(window.location.pathname).toBe("/app/school-abc/school-finance");
    expect(screen.getAllByText("Sekolah ABC").length).toBeGreaterThan(0);
    expect(screen.getAllByText("School Finance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tagihan SPP").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Tagihan SPP" }));

    expect(window.location.pathname).toBe("/app/school-abc/list/TuitionFee");
    expect(await screen.findByText("SPP-2026-0001")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to catalog" }));

    expect(screen.getByText("Reusable finance consoles for real operating models")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to catalog" })).not.toBeInTheDocument();
  });

  it("opens Toko Sepatu through the generated ModuleSpec route with mock rows", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/");
    render(<ReferenceApp />);

    await user.click(screen.getAllByRole("button", { name: "Buka Konsol" })[0]);

    expect(window.location.pathname).toBe("/app/shoe-company/retail-ops");
    expect(screen.getAllByText("Operasi Retail Sepatu").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pesanan Sepatu").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Pesanan Sepatu" }));

    expect(window.location.pathname).toBe("/app/shoe-company/list/ShoeOrder");
    expect(await screen.findByText("ORD-SHOE-0001")).toBeInTheDocument();
  });

  it("loads Healthcare, Medtech, Omnichannel, and HelpDesk consoles directly", () => {
    // 1. Healthcare
    window.history.pushState({}, "", "/console/hospital-medika/dashboard");
    const { unmount: unmount1 } = render(<ReferenceApp />);
    expect(window.location.pathname).toBe("/app/hospital-medika/clinical-ops");
    expect(screen.getAllByText("Clinical Ops").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Antrean Pasien").length).toBeGreaterThan(0);
    unmount1();

    // 2. Medtech High-Compliance
    window.history.pushState({}, "", "/console/medical-device/dashboard");
    const { unmount: unmount2 } = render(<ReferenceApp />);
    expect(window.location.pathname).toBe("/app/medical-device/quality-manufacturing");
    expect(screen.getAllByText("Quality Manufacturing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Device Batches").length).toBeGreaterThan(0);
    unmount2();

    // 3. Omnichannel Distribution
    window.history.pushState({}, "", "/console/omnichannel-dist/dashboard");
    const { unmount: unmount3 } = render(<ReferenceApp />);
    expect(window.location.pathname).toBe("/app/omnichannel-dist/fulfillment-ops");
    expect(screen.getAllByText("Fulfillment Ops").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Antrean Pesanan").length).toBeGreaterThan(0);
    unmount3();

    // 4. Help Desk Support
    window.history.pushState({}, "", "/console/helpdesk/dashboard");
    const { unmount: unmount4 } = render(<ReferenceApp />);
    expect(window.location.pathname).toBe("/app/helpdesk/support-desk");
    expect(screen.getAllByText("Support Desk").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Antrean Tiket").length).toBeGreaterThan(0);
    unmount4();
  });

  it("opens a generated list from a real-mock console workspace", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/console/medical-device/dashboard");
    render(<ReferenceApp />);

    await user.click(screen.getAllByRole("button", { name: "Device Batches" })[0]);

    expect(window.location.pathname).toBe("/app/medical-device/list/DeviceBatch");
    expect(screen.getAllByText("Batch Produksi Alat Kesehatan (DHR)").length).toBeGreaterThan(0);
  });

  it("renders generated create forms for a real-mock console", () => {
    window.history.pushState({}, "", "/app/medical-device/edit/DeviceBatch/new");
    render(<ReferenceApp />);

    expect(screen.getAllByText("Buat Batch Produksi Alat Kesehatan (DHR)").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Simpan/i })).toBeInTheDocument();
  });

  it("renders floating tools menu and shows developer actions on click", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/console/medical-device/dashboard");
    render(<ReferenceApp />);

    const fabBtn = screen.getByRole("button", { name: /Developer & Tools Menu/i });
    expect(fabBtn).toBeInTheDocument();

    await user.click(fabBtn);

    expect(screen.getByText("Reset Reference Data")).toBeInTheDocument();
    expect(screen.getByText("Components Gallery")).toBeInTheDocument();
    expect(screen.getByText("Schema Playground")).toBeInTheDocument();
  });
});
