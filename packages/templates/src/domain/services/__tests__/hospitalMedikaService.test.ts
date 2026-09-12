import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { createSeed } from "../../../mock-data/seed";
import {
  callPatientToExam,
  createPatientBill,
  dispensePrescriptionFEFO,
  recordEMRDiagnosis,
  registerPatientAdmission,
  submitInsuranceClaim,
  verifyInsuranceClaim,
} from "../hospitalMedikaService";

describe("hospital medika service workflow", () => {
  it("runs registration -> queue -> EMR -> FEFO prescription -> bill -> claim with balanced GL", async () => {
    const adapter = createInMemoryAdapter({ seed: createSeed() });

    const admission = await registerPatientAdmission(adapter, {
      companyId: "hospital-medika",
      patientName: "Pasien Demo Klinik 001",
      medicalRecordNo: "RM-DEMO-0001",
      polyDepartment: "Poli Penyakit Dalam",
      doctorName: "dr. Hendra Sp.PD",
      insuranceType: "BPJS Kesehatan",
      admissionDate: "2026-08-25",
    });
    expect(admission).toMatchObject({ id: "REG-MED-0066", queueNo: "PD-001", status: "Menunggu Dokter" });

    const called = await callPatientToExam(adapter, {
      admissionId: String(admission.id),
      calledAt: "2026-08-25T09:00:00+07:00",
    });
    expect(called.encounter).toMatchObject({ id: "RS-ENC-2026-0001", status: "Pemeriksaan" });

    const emr = await recordEMRDiagnosis(adapter, {
      admissionId: String(admission.id),
      icd10Code: "E11.9",
      diagnosisText: "Diabetes melitus tipe 2 tanpa komplikasi - data demo",
      clinicalNotes: "Data fiktif untuk demo uidl-runtime",
      recordedAt: "2026-08-25T09:20:00+07:00",
    });
    expect(emr.medicalRecord).toMatchObject({ id: "RS-EMR-2026-0001", icd10Code: "E11.9", status: "Completed" });
    expect(emr.admission).toMatchObject({ status: "Apotek Resep" });

    const prescription = await dispensePrescriptionFEFO(adapter, {
      admissionId: String(admission.id),
      drugCode: "AMOX500",
      quantity: 10,
      dispensedAt: "2026-08-25T10:00:00+07:00",
      pharmacist: "Apt. Rina",
    });
    expect(prescription.dispensing).toMatchObject({ id: "RS-DISP-2026-0001", drugBatchId: "DRUG-BATCH-0001", stockAfter: 90 });

    const bill = await createPatientBill(adapter, {
      admissionId: String(admission.id),
      serviceFee: 500000,
      medicationFee: 150000,
      billedAt: "2026-08-25T10:30:00+07:00",
    });
    // The seed now carries a 19-bill claim-cycle backlog, so the workflow continues the sequence.
    expect(bill.bill).toMatchObject({ id: "RS-BILL-2026-0020", totalAmount: 650000, payer: "BPJS Kesehatan" });

    const claim = await submitInsuranceClaim(adapter, {
      billId: String(bill.bill.id),
      sepNo: "SEP-DEMO-2026-0001",
      inaCbgCode: "Q-5-44-I",
      submittedAt: "2026-08-25T11:00:00+07:00",
    });
    expect(claim.claim).toMatchObject({ id: "RS-CLM-2026-0020", status: "Submitted" });

    const verified = await verifyInsuranceClaim(adapter, {
      claimId: String(claim.claim.id),
      approvedAmount: 650000,
      verifiedAt: "2026-08-26",
    });
    expect(verified.claim).toMatchObject({ status: "Verified", approvedAmount: 650000 });
    expect(verified.report).toMatchObject({
      id: "RS-RPT-2026-0001",
      admissionId: admission.id,
      claimApproved: 650000,
      medicationCost: 150000,
    });

    const gl = await adapter.query({
      collection: "HospitalGLEntry",
      filters: [{ field: "voucherNo", op: "eq", value: bill.bill.id }],
    });
    const debit = gl.rows.reduce((sum, row) => sum + Number(row.debit ?? 0), 0);
    const credit = gl.rows.reduce((sum, row) => sum + Number(row.credit ?? 0), 0);
    expect(debit).toBe(credit);
  });
});
