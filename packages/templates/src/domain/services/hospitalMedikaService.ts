import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";

export type HospitalRecord = Record<string, unknown>;

interface LoadedRecord {
  record: HospitalRecord;
  meta: RecordMeta;
}

export interface RegisterPatientAdmissionInput {
  companyId: string;
  patientName: string;
  medicalRecordNo: string;
  polyDepartment: string;
  doctorName: string;
  insuranceType: string;
  admissionDate: string;
}

export interface CallPatientToExamInput {
  admissionId: string;
  calledAt: string;
}

export interface RecordEMRDiagnosisInput {
  admissionId: string;
  icd10Code: string;
  diagnosisText: string;
  clinicalNotes: string;
  recordedAt: string;
}

export interface DispensePrescriptionFEFOInput {
  admissionId: string;
  drugCode: string;
  quantity: number;
  dispensedAt: string;
  pharmacist: string;
}

export interface CreatePatientBillInput {
  admissionId: string;
  serviceFee: number;
  medicationFee: number;
  billedAt: string;
}

export interface SubmitInsuranceClaimInput {
  billId: string;
  sepNo: string;
  inaCbgCode: string;
  submittedAt: string;
}

export interface VerifyInsuranceClaimInput {
  claimId: string;
  approvedAmount: number;
  verifiedAt: string;
}

export interface CallPatientToExamResult {
  admission: HospitalRecord;
  encounter: HospitalRecord;
}

export interface RecordEMRDiagnosisResult {
  admission: HospitalRecord;
  medicalRecord: HospitalRecord;
}

export interface DispensePrescriptionFEFOResult {
  admission: HospitalRecord;
  prescription: HospitalRecord;
  dispensing: HospitalRecord;
  drugBatch: HospitalRecord;
}

export interface CreatePatientBillResult {
  admission: HospitalRecord;
  bill: HospitalRecord;
  glEntries: HospitalRecord[];
}

export interface SubmitInsuranceClaimResult {
  admission: HospitalRecord;
  bill: HospitalRecord;
  claim: HospitalRecord;
}

export interface VerifyInsuranceClaimResult {
  admission: HospitalRecord;
  claim: HospitalRecord;
  report: HospitalRecord;
}

const HOSPITAL_COMPANY_ID = "hospital-medika";
const INSURANCE_AR_ACCOUNT = "1139 - Piutang Penjamin";
const CASH_ACCOUNT = "1119 - Kas Rumah Sakit";
const MEDICAL_REVENUE_ACCOUNT = "4119 - Pendapatan Jasa Medis";
const PHARMACY_REVENUE_ACCOUNT = "4120 - Pendapatan Farmasi";

export async function registerPatientAdmission(
  adapter: DataAdapter,
  input: RegisterPatientAdmissionInput,
): Promise<HospitalRecord> {
  assertHospitalCompany(input.companyId);
  if (!input.patientName.trim()) throw new DataError("Patient admission requires patient name", "validation", { patientName: "Required" });
  if (!input.medicalRecordNo.trim()) throw new DataError("Patient admission requires medical record number", "validation", { medicalRecordNo: "Required" });
  if (!input.polyDepartment.trim()) throw new DataError("Patient admission requires polyclinic", "validation", { polyDepartment: "Required" });

  const id = await nextSequentialId(adapter, "PatientAdmission", "REG-MED-", 4);
  const queueNo = await nextQueueNo(adapter, input.polyDepartment, input.admissionDate);
  const record: HospitalRecord = {
    id,
    companyId: input.companyId,
    patientName: input.patientName,
    medicalRecordNo: input.medicalRecordNo,
    queueNo,
    polyDepartment: input.polyDepartment,
    doctorName: input.doctorName,
    insuranceType: input.insuranceType,
    admissionDate: input.admissionDate,
    claimStatus: "Pending",
    status: "Menunggu Dokter",
    route: `/app/hospital-medika/edit/PatientAdmission/${id}`,
  };
  const created = await adapter.create<HospitalRecord>({ collection: "PatientAdmission", data: record });
  await adapter.create<HospitalRecord>({
    collection: "HospitalQueueTicket",
    data: {
      id: `QUEUE-${id}`,
      companyId: HOSPITAL_COMPANY_ID,
      admissionId: id,
      queueNo,
      polyDepartment: input.polyDepartment,
      admissionDate: input.admissionDate,
      status: "Waiting",
    },
  });
  return created.record;
}

export async function callPatientToExam(adapter: DataAdapter, input: CallPatientToExamInput): Promise<CallPatientToExamResult> {
  const admission = await loadAdmission(adapter, input.admissionId);
  if (admission.record.status !== "Menunggu Dokter") {
    throw new DataError(`Admission "${input.admissionId}" must be waiting before exam`, "validation", { status: "Expected Menunggu Dokter" });
  }
  const year = input.calledAt.slice(0, 4);
  const encounterId = await nextSequentialId(adapter, "HospitalEncounter", `RS-ENC-${year}-`, 4);
  const encounter: HospitalRecord = {
    id: encounterId,
    companyId: HOSPITAL_COMPANY_ID,
    admissionId: input.admissionId,
    patientName: admission.record.patientName,
    doctorName: admission.record.doctorName,
    calledAt: input.calledAt,
    status: "Pemeriksaan",
  };
  const createdEncounter = await adapter.create<HospitalRecord>({ collection: "HospitalEncounter", data: encounter });
  const updatedAdmission = await updateAdmission(adapter, admission, {
    encounterId,
    calledAt: input.calledAt,
    status: "Pemeriksaan",
  });
  return { admission: updatedAdmission, encounter: createdEncounter.record };
}

export async function recordEMRDiagnosis(adapter: DataAdapter, input: RecordEMRDiagnosisInput): Promise<RecordEMRDiagnosisResult> {
  const admission = await loadAdmission(adapter, input.admissionId);
  if (admission.record.status !== "Pemeriksaan") {
    throw new DataError(`Admission "${input.admissionId}" must be in exam before EMR`, "validation", { status: "Expected Pemeriksaan" });
  }
  if (!input.icd10Code.trim()) throw new DataError("EMR requires ICD-10 code", "validation", { icd10Code: "Required" });
  if (!input.diagnosisText.trim()) throw new DataError("EMR requires diagnosis text", "validation", { diagnosisText: "Required" });

  const year = input.recordedAt.slice(0, 4);
  const emrId = await nextSequentialId(adapter, "HospitalMedicalRecord", `RS-EMR-${year}-`, 4);
  const medicalRecord: HospitalRecord = {
    id: emrId,
    companyId: HOSPITAL_COMPANY_ID,
    admissionId: input.admissionId,
    medicalRecordNo: admission.record.medicalRecordNo,
    patientName: admission.record.patientName,
    icd10Code: input.icd10Code,
    diagnosisText: input.diagnosisText,
    clinicalNotes: input.clinicalNotes,
    recordedAt: input.recordedAt,
    status: "Completed",
  };
  const createdEMR = await adapter.create<HospitalRecord>({ collection: "HospitalMedicalRecord", data: medicalRecord });
  const updatedAdmission = await updateAdmission(adapter, admission, {
    emrId,
    icd10Code: input.icd10Code,
    diagnosisText: input.diagnosisText,
    emrRecordedAt: input.recordedAt,
    status: "Apotek Resep",
  });
  return { admission: updatedAdmission, medicalRecord: createdEMR.record };
}

export async function dispensePrescriptionFEFO(
  adapter: DataAdapter,
  input: DispensePrescriptionFEFOInput,
): Promise<DispensePrescriptionFEFOResult> {
  const admission = await loadAdmission(adapter, input.admissionId);
  if (admission.record.status !== "Apotek Resep") {
    throw new DataError(`Admission "${input.admissionId}" must be waiting pharmacy before dispensing`, "validation", {
      status: "Expected Apotek Resep",
    });
  }
  assertPositiveInteger(input.quantity, "quantity");
  if (!input.pharmacist.trim()) throw new DataError("Dispensing requires pharmacist", "validation", { pharmacist: "Required" });

  const batch = await selectFEFOBatch(adapter, input.drugCode, input.quantity);
  const year = input.dispensedAt.slice(0, 4);
  const prescriptionId = await nextSequentialId(adapter, "HospitalPrescription", `RS-RX-${year}-`, 4);
  const dispensingId = await nextSequentialId(adapter, "HospitalDispensingEntry", `RS-DISP-${year}-`, 4);
  const prescription: HospitalRecord = {
    id: prescriptionId,
    companyId: HOSPITAL_COMPANY_ID,
    admissionId: input.admissionId,
    drugCode: input.drugCode,
    quantity: input.quantity,
    prescribedAt: input.dispensedAt,
    status: "Dispensed",
  };
  const createdPrescription = await adapter.create<HospitalRecord>({ collection: "HospitalPrescription", data: prescription });
  const stockBefore = Number(batch.record.stockQty ?? 0);
  const stockAfter = stockBefore - input.quantity;
  const updatedBatch = await adapter.update<HospitalRecord>({
    collection: "HospitalDrugBatch",
    id: String(batch.record.id),
    version: batch.meta.version,
    data: { stockQty: stockAfter, status: stockAfter > 0 ? "Available" : "Depleted" },
  });
  const dispensing: HospitalRecord = {
    id: dispensingId,
    companyId: HOSPITAL_COMPANY_ID,
    admissionId: input.admissionId,
    prescriptionId,
    drugCode: input.drugCode,
    drugBatchId: batch.record.id,
    quantity: input.quantity,
    stockBefore,
    stockAfter,
    dispensedAt: input.dispensedAt,
    pharmacist: input.pharmacist,
    status: "Submitted",
  };
  const createdDispensing = await adapter.create<HospitalRecord>({ collection: "HospitalDispensingEntry", data: dispensing });
  const updatedAdmission = await updateAdmission(adapter, admission, {
    prescriptionId,
    drugBatchId: batch.record.id,
    dispensedAt: input.dispensedAt,
  });
  return {
    admission: updatedAdmission,
    prescription: createdPrescription.record,
    dispensing: createdDispensing.record,
    drugBatch: updatedBatch.record,
  };
}

export async function createPatientBill(adapter: DataAdapter, input: CreatePatientBillInput): Promise<CreatePatientBillResult> {
  const admission = await loadAdmission(adapter, input.admissionId);
  assertMoney(input.serviceFee, "serviceFee");
  assertMoney(input.medicationFee, "medicationFee");
  const year = input.billedAt.slice(0, 4);
  const billId = await nextSequentialId(adapter, "HospitalPatientBill", `RS-BILL-${year}-`, 4);
  const totalAmount = roundMoney(input.serviceFee + input.medicationFee);
  const payer = String(admission.record.insuranceType ?? "Mandiri / Umum");
  const bill: HospitalRecord = {
    id: billId,
    companyId: HOSPITAL_COMPANY_ID,
    admissionId: input.admissionId,
    patientName: admission.record.patientName,
    payer,
    serviceFee: roundMoney(input.serviceFee),
    medicationFee: roundMoney(input.medicationFee),
    totalAmount,
    billedAt: input.billedAt,
    status: payer.includes("BPJS") ? "Claim Ready" : "Paid",
  };
  const createdBill = await adapter.create<HospitalRecord>({ collection: "HospitalPatientBill", data: bill });
  const glEntries = await createGLEntries(adapter, {
    postingDate: input.billedAt,
    voucherType: "PatientBill",
    voucherNo: billId,
    party: String(admission.record.patientName ?? ""),
    lines: [
      { account: payer.includes("BPJS") ? INSURANCE_AR_ACCOUNT : CASH_ACCOUNT, debit: totalAmount, credit: 0 },
      { account: MEDICAL_REVENUE_ACCOUNT, debit: 0, credit: roundMoney(input.serviceFee) },
      { account: PHARMACY_REVENUE_ACCOUNT, debit: 0, credit: roundMoney(input.medicationFee) },
    ],
  });
  const updatedAdmission = await updateAdmission(adapter, admission, {
    billId,
    billAmount: totalAmount,
    billedAt: input.billedAt,
    status: "Selesai",
  });
  return { admission: updatedAdmission, bill: createdBill.record, glEntries };
}

export async function submitInsuranceClaim(adapter: DataAdapter, input: SubmitInsuranceClaimInput): Promise<SubmitInsuranceClaimResult> {
  const bill = await loadBill(adapter, input.billId);
  if (!input.sepNo.trim()) throw new DataError("Insurance claim requires SEP number", "validation", { sepNo: "Required" });
  if (!input.inaCbgCode.trim()) throw new DataError("Insurance claim requires INA-CBG code", "validation", { inaCbgCode: "Required" });
  const admission = await loadAdmission(adapter, String(bill.record.admissionId));
  const year = input.submittedAt.slice(0, 4);
  const claimId = await nextSequentialId(adapter, "HospitalInsuranceClaim", `RS-CLM-${year}-`, 4);
  const claim: HospitalRecord = {
    id: claimId,
    companyId: HOSPITAL_COMPANY_ID,
    admissionId: bill.record.admissionId,
    billId: input.billId,
    sepNo: input.sepNo,
    inaCbgCode: input.inaCbgCode,
    claimedAmount: bill.record.totalAmount,
    submittedAt: input.submittedAt,
    status: "Submitted",
  };
  const createdClaim = await adapter.create<HospitalRecord>({ collection: "HospitalInsuranceClaim", data: claim });
  const updatedBill = await adapter.update<HospitalRecord>({
    collection: "HospitalPatientBill",
    id: input.billId,
    version: bill.meta.version,
    data: { claimId, claimStatus: "Submitted", status: "Claim Submitted" },
  });
  const updatedAdmission = await updateAdmission(adapter, admission, { claimId, claimStatus: "Submitted" });
  return { admission: updatedAdmission, bill: updatedBill.record, claim: createdClaim.record };
}

export async function verifyInsuranceClaim(adapter: DataAdapter, input: VerifyInsuranceClaimInput): Promise<VerifyInsuranceClaimResult> {
  const claim = await loadClaim(adapter, input.claimId);
  assertMoney(input.approvedAmount, "approvedAmount");
  const admission = await loadAdmission(adapter, String(claim.record.admissionId));
  const year = input.verifiedAt.slice(0, 4);
  const updatedClaim = await adapter.update<HospitalRecord>({
    collection: "HospitalInsuranceClaim",
    id: input.claimId,
    version: claim.meta.version,
    data: { approvedAmount: roundMoney(input.approvedAmount), verifiedAt: input.verifiedAt, status: "Verified" },
  });
  const reportId = await nextSequentialId(adapter, "HospitalRevenueReport", `RS-RPT-${year}-`, 4);
  const report: HospitalRecord = {
    id: reportId,
    companyId: HOSPITAL_COMPANY_ID,
    admissionId: claim.record.admissionId,
    billId: claim.record.billId,
    claimId: input.claimId,
    payer: admission.record.insuranceType,
    claimApproved: roundMoney(input.approvedAmount),
    medicationCost: Number(admission.record.billAmount ?? 0) - 500000,
    snapshotAt: input.verifiedAt,
    status: "Submitted",
  };
  const createdReport = await adapter.create<HospitalRecord>({ collection: "HospitalRevenueReport", data: report });
  const updatedAdmission = await updateAdmission(adapter, admission, {
    claimStatus: "Verified",
    claimApproved: roundMoney(input.approvedAmount),
  });
  return { admission: updatedAdmission, claim: updatedClaim.record, report: createdReport.record };
}

async function loadAdmission(adapter: DataAdapter, admissionId: string): Promise<LoadedRecord> {
  const admission = await adapter.get<HospitalRecord>("PatientAdmission", admissionId);
  if (!admission) throw new DataError(`Patient admission "${admissionId}" was not found`, "not_found");
  if (admission.record.companyId !== HOSPITAL_COMPANY_ID) {
    throw new DataError(`Patient admission "${admissionId}" belongs to another company`, "validation", { companyId: "Wrong company" });
  }
  return admission;
}

async function loadBill(adapter: DataAdapter, billId: string): Promise<LoadedRecord> {
  const bill = await adapter.get<HospitalRecord>("HospitalPatientBill", billId);
  if (!bill) throw new DataError(`Hospital bill "${billId}" was not found`, "not_found");
  return bill;
}

async function loadClaim(adapter: DataAdapter, claimId: string): Promise<LoadedRecord> {
  const claim = await adapter.get<HospitalRecord>("HospitalInsuranceClaim", claimId);
  if (!claim) throw new DataError(`Insurance claim "${claimId}" was not found`, "not_found");
  return claim;
}

async function updateAdmission(adapter: DataAdapter, admission: LoadedRecord, data: HospitalRecord): Promise<HospitalRecord> {
  const updated = await adapter.update<HospitalRecord>({
    collection: "PatientAdmission",
    id: String(admission.record.id),
    version: admission.meta.version,
    data,
  });
  return updated.record;
}

async function selectFEFOBatch(adapter: DataAdapter, drugCode: string, quantity: number): Promise<LoadedRecord> {
  const batches = await adapter.query<HospitalRecord>({
    collection: "HospitalDrugBatch",
    filters: [{ field: "drugCode", op: "eq", value: drugCode }],
    sort: [{ field: "expiryDate", dir: "asc" }],
  });
  const row = batches.rows.find((batch: HospitalRecord) => Number(batch.stockQty ?? 0) >= quantity);
  if (!row?.id) throw new DataError(`No FEFO stock available for drug "${drugCode}"`, "validation", { drugCode: "Insufficient stock" });
  const batch = await adapter.get<HospitalRecord>("HospitalDrugBatch", String(row.id));
  if (!batch) throw new DataError(`Drug batch "${row.id}" was not found`, "not_found");
  return batch;
}

async function nextQueueNo(adapter: DataAdapter, polyDepartment: string, admissionDate: string): Promise<string> {
  const prefix = polyDepartment.includes("Penyakit Dalam") ? "PD" : polyDepartment.includes("Anak") ? "AN" : "PL";
  const existing = await adapter.query<HospitalRecord>({
    collection: "HospitalQueueTicket",
    filters: [
      { field: "polyDepartment", op: "eq", value: polyDepartment },
      { field: "admissionDate", op: "eq", value: admissionDate },
    ],
  });
  return `${prefix}-${String(existing.rows.length + 1).padStart(3, "0")}`;
}

interface GLVoucherInput {
  postingDate: string;
  voucherType: string;
  voucherNo: string;
  party: string;
  lines: Array<{ account: string; debit: number; credit: number }>;
}

async function createGLEntries(adapter: DataAdapter, input: GLVoucherInput): Promise<HospitalRecord[]> {
  const debit = input.lines.reduce((sum, line) => sum + line.debit, 0);
  const credit = input.lines.reduce((sum, line) => sum + line.credit, 0);
  if (roundMoney(debit) !== roundMoney(credit)) throw new DataError(`Unbalanced hospital GL voucher "${input.voucherNo}"`, "validation");

  const entries: HospitalRecord[] = [];
  const year = input.postingDate.slice(0, 4);
  for (const line of input.lines) {
    const id = await nextSequentialId(adapter, "HospitalGLEntry", `RS-GL-${year}-`, 4);
    const created = await adapter.create<HospitalRecord>({
      collection: "HospitalGLEntry",
      data: {
        id,
        companyId: HOSPITAL_COMPANY_ID,
        postingDate: input.postingDate,
        account: line.account,
        party: input.party,
        voucherType: input.voucherType,
        voucherNo: input.voucherNo,
        debit: roundMoney(line.debit),
        credit: roundMoney(line.credit),
        status: "Posted",
      },
    });
    entries.push(created.record);
  }
  return entries;
}

async function nextSequentialId(adapter: DataAdapter, collection: string, prefix: string, width: number): Promise<string> {
  const result = await adapter.query<HospitalRecord>({ collection, fields: ["id"] });
  const max = result.rows.reduce((value: number, row: Record<string, unknown>) => {
    const id = String(row.id ?? "");
    if (!id.startsWith(prefix)) return value;
    const counter = Number(id.slice(prefix.length));
    return Number.isFinite(counter) ? Math.max(value, counter) : value;
  }, 0);
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

function assertHospitalCompany(companyId: string): void {
  if (companyId !== HOSPITAL_COMPANY_ID) {
    throw new DataError(`Hospital service only supports "${HOSPITAL_COMPANY_ID}"`, "validation", { companyId: "Unsupported company" });
  }
}

function assertMoney(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new DataError(`Hospital amount "${field}" must be zero or greater`, "validation", { [field]: "Must be zero or greater" });
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DataError(`Hospital field "${field}" must be a positive integer`, "validation", { [field]: "Must be a positive integer" });
  }
}

function roundMoney(amount: number): number {
  return Math.round(amount);
}
