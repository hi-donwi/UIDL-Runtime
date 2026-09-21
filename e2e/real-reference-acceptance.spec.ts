import { expect, test } from "@playwright/test";

interface BrowserDataAdapter {
  get(collection: string, id: string): Promise<{ record: Record<string, unknown> } | undefined>;
  query(query: Record<string, unknown>): Promise<{ rows: Array<Record<string, unknown>> }>;
}

interface BrowserDataConfigModule {
  dataAdapter: BrowserDataAdapter;
}

interface BrowserHelpdeskCloseResult {
  ticket: Record<string, unknown>;
  csat: Record<string, unknown>;
}

interface BrowserHelpdeskServiceModule {
  createSupportTicket(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  sendCannedReply(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  escalateSupportTicket(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  closeSupportTicketWithCSAT(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserHelpdeskCloseResult>;
}

interface BrowserCRMQuoteResult {
  opportunity: Record<string, unknown>;
  quote: Record<string, unknown>;
}

interface BrowserCRMCloseResult {
  opportunity: Record<string, unknown>;
  forecast: Record<string, unknown>;
}

interface BrowserCRMServiceModule {
  createOpportunityLead(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  qualifyOpportunity(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  sendOpportunityQuote(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserCRMQuoteResult>;
  moveOpportunityStage(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  closeWonOpportunity(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserCRMCloseResult>;
}

interface BrowserOmnichannelReserveResult {
  order: Record<string, unknown>;
  reservation: Record<string, unknown>;
}

interface BrowserOmnichannelWaveResult {
  order: Record<string, unknown>;
  wave: Record<string, unknown>;
}

interface BrowserOmnichannelLabelResult {
  order: Record<string, unknown>;
  label: Record<string, unknown>;
}

interface BrowserOmnichannelSettlementResult {
  order: Record<string, unknown>;
  settlement: Record<string, unknown>;
  report: Record<string, unknown>;
}

interface BrowserOmnichannelServiceModule {
  createMarketplaceOrder(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  reserveFulfillmentStock(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserOmnichannelReserveResult>;
  assignWavePicking(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserOmnichannelWaveResult>;
  createShippingLabel(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserOmnichannelLabelResult>;
  recordMarketplaceSettlement(
    adapter: BrowserDataAdapter,
    input: Record<string, unknown>,
  ): Promise<BrowserOmnichannelSettlementResult>;
}

interface BrowserSchoolBatchResult {
  batch: Record<string, unknown>;
  invoices: Array<Record<string, unknown>>;
  glEntries: Array<Record<string, unknown>>;
}

interface BrowserSchoolPaymentResult {
  tuitionFee: Record<string, unknown>;
  payment: Record<string, unknown>;
  glEntries: Array<Record<string, unknown>>;
}

interface BrowserSchoolDunningResult {
  tuitionFee: Record<string, unknown>;
  notice: Record<string, unknown>;
}

interface BrowserSchoolPayrollResult {
  run: Record<string, unknown>;
  glEntries: Array<Record<string, unknown>>;
  report: Record<string, unknown>;
}

interface BrowserSchoolServiceModule {
  createTuitionFeeBatch(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserSchoolBatchResult>;
  receiveTuitionPayment(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserSchoolPaymentResult>;
  issueDunningNotice(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserSchoolDunningResult>;
  runTeacherPayrollAccrual(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserSchoolPayrollResult>;
}

interface BrowserFactoryMaterialResult {
  workOrder: Record<string, unknown>;
  stockLedger: Record<string, unknown>;
  glEntries: Array<Record<string, unknown>>;
}

interface BrowserFactoryJobCardResult {
  workOrder: Record<string, unknown>;
  jobCard: Record<string, unknown>;
}

interface BrowserFactoryQCResult {
  workOrder: Record<string, unknown>;
  inspection: Record<string, unknown>;
}

interface BrowserFactoryReleaseResult {
  workOrder: Record<string, unknown>;
  stockLedger: Record<string, unknown>;
  glEntries: Array<Record<string, unknown>>;
  report: Record<string, unknown>;
}

interface BrowserFactoryServiceModule {
  createProductionPlan(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  issueWorkOrderMaterial(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserFactoryMaterialResult>;
  createJobCard(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserFactoryJobCardResult>;
  submitQualityInspection(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserFactoryQCResult>;
  releaseFinishedGoods(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserFactoryReleaseResult>;
}

interface BrowserFoodReceiveResult {
  batch: Record<string, unknown>;
  stockLedger: Record<string, unknown>;
  glEntries: Array<Record<string, unknown>>;
}

interface BrowserFoodPackageResult {
  batch: Record<string, unknown>;
  packaging: Record<string, unknown>;
  stockLedger: Record<string, unknown>;
  glEntries: Array<Record<string, unknown>>;
}

interface BrowserFoodSaleResult {
  batch: Record<string, unknown>;
  sale: Record<string, unknown>;
  stockLedger: Record<string, unknown>;
  glEntries: Array<Record<string, unknown>>;
  report: Record<string, unknown>;
}

interface BrowserFoodServiceModule {
  createGreenBeanContract(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  receiveGreenBeanLot(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserFoodReceiveResult>;
  recordRoastLoss(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  submitCuppingResult(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  packageRoastedBatch(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserFoodPackageResult>;
  recordWholesaleSale(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserFoodSaleResult>;
}

interface BrowserEPCCertificationResult {
  milestone: Record<string, unknown>;
  certification: Record<string, unknown>;
  glEntries: Array<Record<string, unknown>>;
}

interface BrowserEPCBillingResult {
  milestone: Record<string, unknown>;
  billing: Record<string, unknown>;
  glEntries: Array<Record<string, unknown>>;
}

interface BrowserEPCBASTResult {
  milestone: Record<string, unknown>;
  retentionRelease: Record<string, unknown>;
  glEntries: Array<Record<string, unknown>>;
  report: Record<string, unknown>;
}

interface BrowserEPCServiceModule {
  createProjectWBS(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateProjectProgress(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  certifyPercentageOfCompletion(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserEPCCertificationResult>;
  submitProgressBilling(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserEPCBillingResult>;
  verifyMilestoneBAST(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserEPCBASTResult>;
}

interface BrowserKoperasiSavingsResult {
  account: Record<string, unknown>;
  transaction: Record<string, unknown>;
  glEntries: Array<Record<string, unknown>>;
}

interface BrowserKoperasiApprovalResult {
  agreement: Record<string, unknown>;
  schedule: Array<Record<string, unknown>>;
}

interface BrowserKoperasiDisbursementResult {
  agreement: Record<string, unknown>;
  glEntries: Array<Record<string, unknown>>;
}

interface BrowserKoperasiInstallmentResult {
  agreement: Record<string, unknown>;
  installment: Record<string, unknown>;
  payment: Record<string, unknown>;
  glEntries: Array<Record<string, unknown>>;
}

interface BrowserKoperasiCollectibilityResult {
  agreement: Record<string, unknown>;
  assessment: Record<string, unknown>;
}

interface BrowserKoperasiSHUResult {
  allocation: Record<string, unknown>;
  memberDistribution: Record<string, unknown>;
  glEntries: Array<Record<string, unknown>>;
}

interface BrowserKoperasiServiceModule {
  registerCooperativeMember(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  recordSavingsDeposit(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserKoperasiSavingsResult>;
  createMurabahahApplication(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  approveMurabahahFinancing(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserKoperasiApprovalResult>;
  disburseMurabahahFinancing(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserKoperasiDisbursementResult>;
  receiveInstallmentPayment(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserKoperasiInstallmentResult>;
  assessCollectibility(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserKoperasiCollectibilityResult>;
  calculateSHUAllocation(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserKoperasiSHUResult>;
}

interface BrowserHospitalExamResult {
  admission: Record<string, unknown>;
  encounter: Record<string, unknown>;
}

interface BrowserHospitalEMRResult {
  admission: Record<string, unknown>;
  medicalRecord: Record<string, unknown>;
}

interface BrowserHospitalDispenseResult {
  admission: Record<string, unknown>;
  prescription: Record<string, unknown>;
  dispensing: Record<string, unknown>;
  drugBatch: Record<string, unknown>;
}

interface BrowserHospitalBillResult {
  admission: Record<string, unknown>;
  bill: Record<string, unknown>;
  glEntries: Array<Record<string, unknown>>;
}

interface BrowserHospitalClaimResult {
  admission: Record<string, unknown>;
  bill: Record<string, unknown>;
  claim: Record<string, unknown>;
}

interface BrowserHospitalVerifyResult {
  admission: Record<string, unknown>;
  claim: Record<string, unknown>;
  report: Record<string, unknown>;
}

interface BrowserHospitalServiceModule {
  registerPatientAdmission(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  callPatientToExam(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserHospitalExamResult>;
  recordEMRDiagnosis(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserHospitalEMRResult>;
  dispensePrescriptionFEFO(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserHospitalDispenseResult>;
  createPatientBill(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserHospitalBillResult>;
  submitInsuranceClaim(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserHospitalClaimResult>;
  verifyInsuranceClaim(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserHospitalVerifyResult>;
}

interface BrowserMedicalDeviceDHRResult {
  batch: Record<string, unknown>;
  dhr: Record<string, unknown>;
}

interface BrowserMedicalDeviceCleanroomResult {
  batch: Record<string, unknown>;
  inspection: Record<string, unknown>;
}

interface BrowserMedicalDeviceSterilizationResult {
  batch: Record<string, unknown>;
  cycle: Record<string, unknown>;
}

interface BrowserMedicalDeviceCAPAResult {
  batch: Record<string, unknown>;
  capa: Record<string, unknown>;
}

interface BrowserMedicalDeviceQAResult {
  batch: Record<string, unknown>;
  release: Record<string, unknown>;
  trace: Record<string, unknown>;
  glEntries: Array<Record<string, unknown>>;
}

interface BrowserMedicalDeviceServiceModule {
  createDeviceMasterRecord(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  createDeviceBatchDHR(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserMedicalDeviceDHRResult>;
  passCleanroomInspection(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserMedicalDeviceCleanroomResult>;
  completeSterilizationCycle(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserMedicalDeviceSterilizationResult>;
  openCAPAForBatch(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserMedicalDeviceCAPAResult>;
  closeCAPAForBatch(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserMedicalDeviceCAPAResult>;
  releaseDeviceBatchQA(adapter: BrowserDataAdapter, input: Record<string, unknown>): Promise<BrowserMedicalDeviceQAResult>;
}

function collectConsoleErrors(page: import("@playwright/test").Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("shoe-company real-mock pilot persists a POS sale after reload", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.removeItem("uidl-runtime-mock-db");
  });

  await page.goto("/app/shoe-company/pos");
  await expect(page.getByText("Kasir POS").first()).toBeVisible();

  await page.getByTestId("pos-item-SHOE-SNK-01").click();
  await expect(page.getByTestId("pos-qty-SHOE-SNK-01")).toHaveText("1");

  const totalLabel = await page.getByTestId("pos-total").innerText();
  const total = Number(totalLabel.replace(/\D/g, ""));
  expect(total).toBeGreaterThan(0);
  await page.getByTestId("pos-payment-amount-0").fill(String(total));
  await expect(page.getByTestId("pos-checkout")).toBeEnabled();
  await page.getByTestId("pos-checkout").click();

  const saleStatus = page.getByTestId("pos-last-sale");
  await expect(saleStatus).toBeVisible();
  const invoiceId = (await saleStatus.innerText()).match(/Invoice\s+(\S+)\s+selesai/)?.[1];
  expect(invoiceId).toBeTruthy();

  await page.reload();
  await page.goto("/app/shoe-company/list/POSInvoice");
  await expect(page.getByText(invoiceId!).first()).toBeVisible();
  await page.goto("/app/shoe-company/list/StockLedgerEntry");
  await expect(page.getByText(invoiceId!).first()).toBeVisible();
  await page.goto("/app/shoe-company/list/GLEntry");
  await expect(page.getByText(invoiceId!).first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("helpdesk real-mock ticket workflow persists after reload", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.removeItem("uidl-runtime-mock-db");
  });

  await page.goto("/app/helpdesk/support-desk");
  await expect(page.getByText("Support Desk").first()).toBeVisible();

  const flow = await page.evaluate(async () => {
    const configPath = "/@id/@uidl-runtime/templates/config/data.config";
    const servicePath = "/@id/@uidl-runtime/templates/domain/services/helpdeskService";
    const [{ dataAdapter }, service] = await Promise.all([
      import(/* @vite-ignore */ configPath) as Promise<BrowserDataConfigModule>,
      import(/* @vite-ignore */ servicePath) as Promise<BrowserHelpdeskServiceModule>,
    ]);

    const ticket = await service.createSupportTicket(dataAdapter, {
      companyId: "helpdesk",
      subject: "Portal pelanggan tidak bisa login",
      customerName: "PT Sinar Jaya Abadi",
      priority: "High",
      channel: "Portal",
      createdAt: "2026-08-29T09:00:00+07:00",
    });
    await service.sendCannedReply(dataAdapter, {
      ticketId: String(ticket.id),
      responseCode: "LOGIN-RESET",
      agent: "Rani Support L2",
      respondedAt: "2026-08-29T09:12:00+07:00",
    });
    await service.escalateSupportTicket(dataAdapter, {
      ticketId: String(ticket.id),
      escalatedTo: "Engineering",
      reason: "SSO provider rejects valid session token",
      escalatedAt: "2026-08-29T10:10:00+07:00",
    });
    const closed = await service.closeSupportTicketWithCSAT(dataAdapter, {
      ticketId: String(ticket.id),
      resolution: "Reset SSO binding and refreshed customer role mapping",
      closedAt: "2026-08-29T11:20:00+07:00",
      csatRating: 5,
      csatComment: "Cepat dan jelas",
    });

    return {
      ticketId: String(closed.ticket.id),
      csatId: String(closed.csat.id),
      status: String(closed.ticket.status),
      csatRating: Number(closed.ticket.csatRating),
    };
  });

  await page.reload();
  const persisted = await page.evaluate(
    async ({ ticketId, csatId }) => {
      const configPath = "/@id/@uidl-runtime/templates/config/data.config";
      const { dataAdapter } = (await import(/* @vite-ignore */ configPath)) as BrowserDataConfigModule;
      const [ticket, csat] = await Promise.all([
        dataAdapter.get("SupportTicket", ticketId),
        dataAdapter.get("SupportCSAT", csatId),
      ]);
      return {
        ticketStatus: ticket?.record.status,
        csatRating: csat?.record.rating,
      };
    },
    { ticketId: flow.ticketId, csatId: flow.csatId },
  );

  expect(flow.status).toBe("Closed");
  expect(flow.csatRating).toBe(5);
  expect(persisted).toEqual({ ticketStatus: "Closed", csatRating: 5 });

  await page.goto("/app/helpdesk/list/SupportTicket");
  await expect(page.getByText(flow.ticketId)).toBeVisible();
  await page.goto("/app/helpdesk/report/SupportPerformance");
  await expect(page.getByText("Kinerja Support").first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("crm-pipeline real-mock opportunity workflow persists after reload", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.removeItem("uidl-runtime-mock-db");
  });

  await page.goto("/app/crm-pipeline/sales-pipeline");
  await expect(page.getByText("Sales Pipeline").first()).toBeVisible();

  const flow = await page.evaluate(async () => {
    const configPath = "/@id/@uidl-runtime/templates/config/data.config";
    const servicePath = "/@id/@uidl-runtime/templates/domain/services/crmPipelineService";
    const [{ dataAdapter }, service] = await Promise.all([
      import(/* @vite-ignore */ configPath) as Promise<BrowserDataConfigModule>,
      import(/* @vite-ignore */ servicePath) as Promise<BrowserCRMServiceModule>,
    ]);

    const lead = await service.createOpportunityLead(dataAdapter, {
      companyId: "crm-pipeline",
      title: "AI customer service suite - PT Sinar Jaya Abadi",
      customer: "PT Sinar Jaya Abadi",
      source: "Inbound Website",
      leadScore: 86,
      owner: "Sarah Sales",
      dealValue: 450000000,
      expectedCloseDate: "2026-09-30",
      createdAt: "2026-08-24T09:00:00+07:00",
    });
    await service.qualifyOpportunity(dataAdapter, {
      opportunityId: String(lead.id),
      qualifiedAt: "2026-08-24T10:00:00+07:00",
      qualificationNotes: "Budget approved and buying committee identified",
    });
    const quoted = await service.sendOpportunityQuote(dataAdapter, {
      opportunityId: String(lead.id),
      packageName: "Enterprise CRM + SLA Gold",
      quotedAmount: 450000000,
      discountPercent: 10,
      sentAt: "2026-08-24T11:00:00+07:00",
    });
    await service.moveOpportunityStage(dataAdapter, {
      opportunityId: String(lead.id),
      stage: "Negosiasi",
      movedAt: "2026-08-24T14:00:00+07:00",
      reason: "Commercial review started",
    });
    const won = await service.closeWonOpportunity(dataAdapter, {
      opportunityId: String(lead.id),
      closedAt: "2026-08-24T16:00:00+07:00",
      contractNo: "CTR-CRM-2026-0001",
    });

    return {
      opportunityId: String(won.opportunity.id),
      quoteId: String(quoted.quote.id),
      forecastId: String(won.forecast.id),
      stage: String(won.opportunity.stage),
      weightedValue: Number(won.opportunity.weightedValue),
    };
  });

  await page.reload();
  const persisted = await page.evaluate(
    async ({ opportunityId, quoteId, forecastId }) => {
      const configPath = "/@id/@uidl-runtime/templates/config/data.config";
      const { dataAdapter } = (await import(/* @vite-ignore */ configPath)) as BrowserDataConfigModule;
      const [opportunity, quote, forecast] = await Promise.all([
        dataAdapter.get("Opportunity", opportunityId),
        dataAdapter.get("CRMQuote", quoteId),
        dataAdapter.get("CRMForecast", forecastId),
      ]);
      return {
        opportunityStage: opportunity?.record.stage,
        quoteStatus: quote?.record.status,
        forecastWeightedValue: forecast?.record.weightedValue,
      };
    },
    { opportunityId: flow.opportunityId, quoteId: flow.quoteId, forecastId: flow.forecastId },
  );

  expect(flow.stage).toBe("Won");
  expect(flow.weightedValue).toBe(450000000);
  expect(persisted).toEqual({
    opportunityStage: "Won",
    quoteStatus: "Sent",
    forecastWeightedValue: 450000000,
  });

  await page.goto("/app/crm-pipeline/list/Opportunity");
  await expect(page.getByText(flow.opportunityId)).toBeVisible();
  await page.goto("/app/crm-pipeline/report/WeightedForecast");
  await expect(page.getByText("Forecast Tertimbang").first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("omnichannel real-mock fulfillment workflow persists after reload", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.removeItem("uidl-runtime-mock-db");
  });

  await page.goto("/app/omnichannel-dist/fulfillment-ops");
  await expect(page.getByText("Fulfillment Ops").first()).toBeVisible();

  const flow = await page.evaluate(async () => {
    const configPath = "/@id/@uidl-runtime/templates/config/data.config";
    const servicePath = "/@id/@uidl-runtime/templates/domain/services/omnichannelService";
    const [{ dataAdapter }, service] = await Promise.all([
      import(/* @vite-ignore */ configPath) as Promise<BrowserDataConfigModule>,
      import(/* @vite-ignore */ servicePath) as Promise<BrowserOmnichannelServiceModule>,
    ]);

    const order = await service.createMarketplaceOrder(dataAdapter, {
      companyId: "omnichannel-dist",
      marketplaceOrderNo: "INV/TKP/900001",
      channel: "TokoPrima Official",
      customerName: "PT Sinar Jaya Abadi",
      totalItems: 3,
      grossAmount: 825000,
      orderDate: "2026-08-24",
      courier: "KirimCepat",
    });
    await service.reserveFulfillmentStock(dataAdapter, {
      fulfillmentOrderId: String(order.id),
      warehouse: "Hub Jakarta",
      skuCount: 3,
      reservedAt: "2026-08-24T10:00:00+07:00",
    });
    await service.assignWavePicking(dataAdapter, {
      fulfillmentOrderId: String(order.id),
      picker: "Tim A",
      assignedAt: "2026-08-24T11:00:00+07:00",
    });
    const label = await service.createShippingLabel(dataAdapter, {
      fulfillmentOrderId: String(order.id),
      trackingNo: "JNT900001",
      labelUrl: "https://mock.local/labels/JNT900001.pdf",
      printedAt: "2026-08-24T12:00:00+07:00",
    });
    const settlement = await service.recordMarketplaceSettlement(dataAdapter, {
      fulfillmentOrderId: String(order.id),
      marketplaceFee: 41250,
      settledAt: "2026-08-24T16:00:00+07:00",
    });

    return {
      orderId: String(settlement.order.id),
      labelId: String(label.label.id),
      settlementId: String(settlement.settlement.id),
      reportId: String(settlement.report.id),
      status: String(settlement.order.status),
      netSettlement: Number(settlement.order.netSettlement),
    };
  });

  await page.reload();
  const persisted = await page.evaluate(
    async ({ orderId, labelId, settlementId, reportId }) => {
      const configPath = "/@id/@uidl-runtime/templates/config/data.config";
      const { dataAdapter } = (await import(/* @vite-ignore */ configPath)) as BrowserDataConfigModule;
      const [order, label, settlement, report] = await Promise.all([
        dataAdapter.get("FulfillmentOrder", orderId),
        dataAdapter.get("OmnichannelShippingLabel", labelId),
        dataAdapter.get("OmnichannelSettlement", settlementId),
        dataAdapter.get("OmnichannelFulfillmentReport", reportId),
      ]);
      return {
        orderStatus: order?.record.status,
        labelStatus: label?.record.status,
        settlementStatus: settlement?.record.status,
        reportNetSettlement: report?.record.netSettlement,
      };
    },
    {
      orderId: flow.orderId,
      labelId: flow.labelId,
      settlementId: flow.settlementId,
      reportId: flow.reportId,
    },
  );

  expect(flow.status).toBe("Delivered");
  expect(flow.netSettlement).toBe(783750);
  expect(persisted).toEqual({
    orderStatus: "Delivered",
    labelStatus: "Printed",
    settlementStatus: "Settled",
    reportNetSettlement: 783750,
  });

  await page.goto("/app/omnichannel-dist/list/FulfillmentOrder");
  await expect(page.getByText(flow.orderId)).toBeVisible();
  await page.goto("/app/omnichannel-dist/report/FulfillmentPerformance");
  await expect(page.getByText("Kinerja Fulfillment").first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("school-abc real-mock finance workflow persists after reload", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.removeItem("uidl-runtime-mock-db");
  });

  await page.goto("/app/school-abc/school-finance");
  await expect(page.getByText("School Finance").first()).toBeVisible();

  const flow = await page.evaluate(async () => {
    const configPath = "/@id/@uidl-runtime/templates/config/data.config";
    const servicePath = "/@id/@uidl-runtime/templates/domain/services/schoolFinanceService";
    const [{ dataAdapter }, service] = await Promise.all([
      import(/* @vite-ignore */ configPath) as Promise<BrowserDataConfigModule>,
      import(/* @vite-ignore */ servicePath) as Promise<BrowserSchoolServiceModule>,
    ]);

    const batch = await service.createTuitionFeeBatch(dataAdapter, {
      companyId: "school-abc",
      month: "September 2026",
      postingDate: "2026-08-24",
      dueDate: "2026-09-10",
      students: [
        { studentId: "NIS-2026001", studentName: "Alya Putri", grade: "Kelas 10 IPA 1", total: 1500000 },
        { studentId: "NIS-2026002", studentName: "Bima Pratama", grade: "Kelas 10 IPA 1", total: 1500000 },
      ],
    });
    const payment = await service.receiveTuitionPayment(dataAdapter, {
      tuitionFeeId: String(batch.invoices[0].id),
      paidAt: "2026-08-25",
      amount: 1500000,
      method: "Virtual Account Bank",
    });
    const dunning = await service.issueDunningNotice(dataAdapter, {
      tuitionFeeId: String(batch.invoices[1].id),
      issuedAt: "2026-09-12",
      channel: "WhatsApp",
    });
    const payroll = await service.runTeacherPayrollAccrual(dataAdapter, {
      companyId: "school-abc",
      period: "2026-09",
      postingDate: "2026-09-30",
      employees: [
        { employeeId: "EMP-TCH-001", employeeName: "Dra. Hesti Wulandari", role: "Guru Matematika", gross: 8400000, deductions: 742000 },
        { employeeId: "EMP-ADM-001", employeeName: "Rina Kartika", role: "Staf Tata Usaha", gross: 5100000, deductions: 452000 },
      ],
    });
    const gl = await dataAdapter.query({
      collection: "SchoolGLEntry",
      filters: [
        {
          field: "voucherNo",
          op: "in",
          value: [batch.batch.id, payment.payment.id, payroll.run.id],
        },
      ],
    });
    const glDebit = gl.rows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.debit ?? 0), 0);
    const glCredit = gl.rows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.credit ?? 0), 0);

    return {
      paidInvoiceId: String(payment.tuitionFee.id),
      overdueInvoiceId: String(dunning.tuitionFee.id),
      paymentId: String(payment.payment.id),
      noticeId: String(dunning.notice.id),
      payrollId: String(payroll.run.id),
      reportId: String(payroll.report.id),
      paidStatus: String(payment.tuitionFee.status),
      overdueStatus: String(dunning.tuitionFee.status),
      payrollNetPay: Number(payroll.run.netPay),
      glBalanced: glDebit === glCredit,
    };
  });

  await page.reload();
  const persisted = await page.evaluate(
    async ({ paidInvoiceId, overdueInvoiceId, paymentId, noticeId, payrollId, reportId }) => {
      const configPath = "/@id/@uidl-runtime/templates/config/data.config";
      const { dataAdapter } = (await import(/* @vite-ignore */ configPath)) as BrowserDataConfigModule;
      const [paidInvoice, overdueInvoice, payment, notice, payroll, report] = await Promise.all([
        dataAdapter.get("TuitionFee", paidInvoiceId),
        dataAdapter.get("TuitionFee", overdueInvoiceId),
        dataAdapter.get("SchoolTuitionPayment", paymentId),
        dataAdapter.get("SchoolDunningNotice", noticeId),
        dataAdapter.get("SchoolPayrollRun", payrollId),
        dataAdapter.get("SchoolManagementReport", reportId),
      ]);
      return {
        paidStatus: paidInvoice?.record.status,
        overdueStatus: overdueInvoice?.record.status,
        paymentStatus: payment?.record.status,
        noticeStatus: notice?.record.status,
        payrollStatus: payroll?.record.status,
        reportPayrollAccrued: report?.record.payrollAccrued,
      };
    },
    {
      paidInvoiceId: flow.paidInvoiceId,
      overdueInvoiceId: flow.overdueInvoiceId,
      paymentId: flow.paymentId,
      noticeId: flow.noticeId,
      payrollId: flow.payrollId,
      reportId: flow.reportId,
    },
  );

  expect(flow.paidStatus).toBe("Lunas");
  expect(flow.overdueStatus).toBe("Jatuh Tempo");
  expect(flow.payrollNetPay).toBe(12306000);
  expect(flow.glBalanced).toBe(true);
  expect(persisted).toEqual({
    paidStatus: "Lunas",
    overdueStatus: "Jatuh Tempo",
    paymentStatus: "Submitted",
    noticeStatus: "Sent",
    payrollStatus: "Submitted",
    reportPayrollAccrued: 13500000,
  });

  await page.goto("/app/school-abc/list/TuitionFee");
  await expect(page.getByText(flow.paidInvoiceId)).toBeVisible();
  await page.goto("/app/school-abc/report/SchoolManagementReport");
  await expect(page.getByText("Laporan Manajemen Sekolah").first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("factory-abc real-mock manufacturing workflow persists after reload", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.removeItem("uidl-runtime-mock-db");
  });

  await page.goto("/app/factory-abc/manufacturing-ops");
  await expect(page.getByText("Manufacturing Ops").first()).toBeVisible();

  const flow = await page.evaluate(async () => {
    const configPath = "/@id/@uidl-runtime/templates/config/data.config";
    const servicePath = "/@id/@uidl-runtime/templates/domain/services/factoryService";
    const [{ dataAdapter }, service] = await Promise.all([
      import(/* @vite-ignore */ configPath) as Promise<BrowserDataConfigModule>,
      import(/* @vite-ignore */ servicePath) as Promise<BrowserFactoryServiceModule>,
    ]);

    const workOrder = await service.createProductionPlan(dataAdapter, {
      companyId: "factory-abc",
      productName: "Bearing Presisi High-Temp",
      bomCode: "BOM-101",
      targetQty: 100,
      workstation: "Mesin Bubut CNC-1",
      startDate: "2026-08-24",
      plannedMaterialCost: 2000000,
      plannedLaborCost: 1200000,
      plannedOverheadCost: 800000,
    });
    await service.issueWorkOrderMaterial(dataAdapter, {
      workOrderId: String(workOrder.id),
      materialItem: "Steel Coil SPCC 1.2mm",
      quantity: 240,
      materialCost: 2050000,
      issuedAt: "2026-08-24T09:00:00+07:00",
    });
    await service.createJobCard(dataAdapter, {
      workOrderId: String(workOrder.id),
      operator: "Dedi Kurnia",
      completedQty: 96,
      laborCost: 1150000,
      overheadCost: 750000,
      completedAt: "2026-08-24T14:00:00+07:00",
    });
    await service.submitQualityInspection(dataAdapter, {
      workOrderId: String(workOrder.id),
      sampleQty: 32,
      acceptedQty: 96,
      rejectedQty: 4,
      inspectedAt: "2026-08-24T15:00:00+07:00",
    });
    const released = await service.releaseFinishedGoods(dataAdapter, {
      workOrderId: String(workOrder.id),
      releasedAt: "2026-08-24T16:00:00+07:00",
    });
    const gl = await dataAdapter.query({
      collection: "FactoryGLEntry",
      filters: [{ field: "voucherNo", op: "eq", value: workOrder.id }],
    });
    const glDebit = gl.rows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.debit ?? 0), 0);
    const glCredit = gl.rows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.credit ?? 0), 0);

    return {
      workOrderId: String(released.workOrder.id),
      stockLedgerId: String(released.stockLedger.id),
      reportId: String(released.report.id),
      status: String(released.workOrder.status),
      variance: Number(released.workOrder.variance),
      glBalanced: glDebit === glCredit,
    };
  });

  await page.reload();
  const persisted = await page.evaluate(
    async ({ workOrderId, stockLedgerId, reportId }) => {
      const configPath = "/@id/@uidl-runtime/templates/config/data.config";
      const { dataAdapter } = (await import(/* @vite-ignore */ configPath)) as BrowserDataConfigModule;
      const [workOrder, stockLedger, report] = await Promise.all([
        dataAdapter.get("WorkOrder", workOrderId),
        dataAdapter.get("FactoryStockLedger", stockLedgerId),
        dataAdapter.get("FactoryProductionReport", reportId),
      ]);
      return {
        workOrderStatus: workOrder?.record.status,
        stockLedgerValue: stockLedger?.record.value,
        reportVariance: report?.record.variance,
      };
    },
    {
      workOrderId: flow.workOrderId,
      stockLedgerId: flow.stockLedgerId,
      reportId: flow.reportId,
    },
  );

  expect(flow.status).toBe("Completed");
  expect(flow.variance).toBe(-50000);
  expect(flow.glBalanced).toBe(true);
  expect(persisted).toEqual({
    workOrderStatus: "Completed",
    stockLedgerValue: 3950000,
    reportVariance: -50000,
  });

  await page.goto("/app/factory-abc/list/WorkOrder");
  await expect(page.getByText(flow.workOrderId)).toBeVisible();
  await page.goto("/app/factory-abc/report/ManufacturingPerformance");
  await expect(page.getByText("Laporan Produksi").first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("food-roasters real-mock roastery workflow persists after reload", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.removeItem("uidl-runtime-mock-db");
  });

  await page.goto("/app/food-roasters/roastery-ops");
  await expect(page.getByText("Roastery Ops").first()).toBeVisible();

  const flow = await page.evaluate(async () => {
    const configPath = "/@id/@uidl-runtime/templates/config/data.config";
    const servicePath = "/@id/@uidl-runtime/templates/domain/services/foodRoastersService";
    const [{ dataAdapter }, service] = await Promise.all([
      import(/* @vite-ignore */ configPath) as Promise<BrowserDataConfigModule>,
      import(/* @vite-ignore */ servicePath) as Promise<BrowserFoodServiceModule>,
    ]);

    const contract = await service.createGreenBeanContract(dataAdapter, {
      companyId: "food-roasters",
      origin: "Aceh Gayo",
      farmer: "Koperasi Gayo Megah",
      contractedKg: 60,
      pricePerKg: 60000,
      contractDate: "2026-08-24",
    });
    const received = await service.receiveGreenBeanLot(dataAdapter, {
      contractId: String(contract.id),
      lotCode: "GAYO-2026-08-A",
      profile: "Medium Filter",
      roasterOperator: "Budi Roaster",
      receivedAt: "2026-08-24",
    });
    await service.recordRoastLoss(dataAdapter, {
      roastingBatchId: String(received.batch.id),
      roastedWeightKg: 50.1,
      energyCost: 120000,
      roastedAt: "2026-08-24T10:00:00+07:00",
    });
    await service.submitCuppingResult(dataAdapter, {
      roastingBatchId: String(received.batch.id),
      cuppingScore: 85.2,
      moisturePct: 10.8,
      agtron: 58,
      cuppedAt: "2026-08-24T12:00:00+07:00",
    });
    const packaged = await service.packageRoastedBatch(dataAdapter, {
      roastingBatchId: String(received.batch.id),
      sku: "GAYO-250-BEAN",
      bagCount: 200,
      bagSizeGrams: 250,
      packagedAt: "2026-08-24T14:00:00+07:00",
    });
    const sale = await service.recordWholesaleSale(dataAdapter, {
      roastingBatchId: String(received.batch.id),
      customer: "Kopi Kenangan Senopati",
      soldWeightKg: 50,
      saleAmount: 5400000,
      soldAt: "2026-08-24T16:00:00+07:00",
    });
    const gl = await dataAdapter.query({
      collection: "RoasteryGLEntry",
      filters: [{ field: "voucherNo", op: "in", value: [received.batch.id, sale.sale.id] }],
    });
    const glDebit = gl.rows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.debit ?? 0), 0);
    const glCredit = gl.rows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.credit ?? 0), 0);

    return {
      contractId: String(contract.id),
      batchId: String(sale.batch.id),
      packagingId: String(packaged.packaging.id),
      receiptStockLedgerId: String(received.stockLedger.id),
      packagingStockLedgerId: String(packaged.stockLedger.id),
      saleStockLedgerId: String(sale.stockLedger.id),
      saleId: String(sale.sale.id),
      reportId: String(sale.report.id),
      status: String(sale.batch.status),
      grossMargin: Number(sale.sale.grossMargin),
      yieldRate: Number(sale.report.yieldRate),
      glBalanced: glDebit === glCredit,
    };
  });

  await page.reload();
  const persisted = await page.evaluate(
    async ({ contractId, batchId, packagingId, saleId, reportId, saleStockLedgerId }) => {
      const configPath = "/@id/@uidl-runtime/templates/config/data.config";
      const { dataAdapter } = (await import(/* @vite-ignore */ configPath)) as BrowserDataConfigModule;
      const [contract, batch, packaging, sale, report, stockLedger] = await Promise.all([
        dataAdapter.get("GreenBeanContract", contractId),
        dataAdapter.get("RoastingBatch", batchId),
        dataAdapter.get("RoasteryPackaging", packagingId),
        dataAdapter.get("RoasteryWholesaleSale", saleId),
        dataAdapter.get("RoasteryMarginReport", reportId),
        dataAdapter.get("RoasteryStockLedger", saleStockLedgerId),
      ]);
      return {
        contractStatus: contract?.record.status,
        batchStatus: batch?.record.status,
        packagingStatus: packaging?.record.status,
        saleStatus: sale?.record.status,
        reportGrossMargin: report?.record.grossMargin,
        stockLedgerValue: stockLedger?.record.value,
      };
    },
    {
      contractId: flow.contractId,
      batchId: flow.batchId,
      packagingId: flow.packagingId,
      saleId: flow.saleId,
      reportId: flow.reportId,
      saleStockLedgerId: flow.saleStockLedgerId,
    },
  );

  expect(flow.status).toBe("Packaged");
  expect(flow.grossMargin).toBe(1680000);
  expect(flow.yieldRate).toBe(83.5);
  expect(flow.glBalanced).toBe(true);
  expect(persisted).toEqual({
    contractStatus: "Received",
    batchStatus: "Packaged",
    packagingStatus: "Completed",
    saleStatus: "Submitted",
    reportGrossMargin: 1680000,
    stockLedgerValue: -3720000,
  });

  await page.goto("/app/food-roasters/list/RoastingBatch");
  await expect(page.getByText(flow.batchId)).toBeVisible();
  await page.goto("/app/food-roasters/report/RoasteryMarginReport");
  await expect(page.getByText("Analitik Margin Roastery").first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("epc-contractor real-mock project workflow persists after reload", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.removeItem("uidl-runtime-mock-db");
  });

  await page.goto("/app/epc-contractor/project-controls");
  await expect(page.getByText("Project Controls").first()).toBeVisible();

  const flow = await page.evaluate(async () => {
    const configPath = "/@id/@uidl-runtime/templates/config/data.config";
    const servicePath = "/@id/@uidl-runtime/templates/domain/services/epcContractorService";
    const [{ dataAdapter }, service] = await Promise.all([
      import(/* @vite-ignore */ configPath) as Promise<BrowserDataConfigModule>,
      import(/* @vite-ignore */ servicePath) as Promise<BrowserEPCServiceModule>,
    ]);

    const milestone = await service.createProjectWBS(dataAdapter, {
      companyId: "epc-contractor",
      projectCode: "PRJ-EPC-999",
      projectName: "Pembangunan Gardu Induk 150kV",
      milestoneName: "Termin 3 - Mechanical Completion",
      weightPercentage: 20,
      contractValue: 12000000000,
      estimatedCost: 9000000000,
      startDate: "2026-08-24",
    });
    await service.updateProjectProgress(dataAdapter, {
      milestoneId: String(milestone.id),
      actualProgress: 80,
      costIncurred: 7200000000,
      updatedAt: "2026-08-24T10:00:00+07:00",
    });
    const certified = await service.certifyPercentageOfCompletion(dataAdapter, {
      milestoneId: String(milestone.id),
      certifiedProgress: 80,
      certifiedBy: "Owner QS",
      certifiedAt: "2026-08-24T12:00:00+07:00",
    });
    const billing = await service.submitProgressBilling(dataAdapter, {
      milestoneId: String(milestone.id),
      retentionRate: 5,
      invoiceDate: "2026-08-25",
      dueDate: "2026-09-24",
    });
    const bast = await service.verifyMilestoneBAST(dataAdapter, {
      milestoneId: String(milestone.id),
      bastNo: "BAST-EPC-2026-0001",
      verifiedAt: "2026-09-30",
    });
    const gl = await dataAdapter.query({
      collection: "EPCGLEntry",
      filters: [
        {
          field: "voucherNo",
          op: "in",
          value: [certified.certification.id, billing.billing.id, bast.retentionRelease.id],
        },
      ],
    });
    const glDebit = gl.rows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.debit ?? 0), 0);
    const glCredit = gl.rows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.credit ?? 0), 0);

    return {
      milestoneId: String(bast.milestone.id),
      certificationId: String(certified.certification.id),
      billingId: String(billing.billing.id),
      retentionReleaseId: String(bast.retentionRelease.id),
      reportId: String(bast.report.id),
      status: String(bast.milestone.status),
      revenueRecognized: Number(bast.report.revenueRecognized),
      retentionReleased: Number(bast.report.retentionReleased),
      glBalanced: glDebit === glCredit,
    };
  });

  await page.reload();
  const persisted = await page.evaluate(
    async ({ milestoneId, certificationId, billingId, retentionReleaseId, reportId }) => {
      const configPath = "/@id/@uidl-runtime/templates/config/data.config";
      const { dataAdapter } = (await import(/* @vite-ignore */ configPath)) as BrowserDataConfigModule;
      const [milestone, certification, billing, retentionRelease, report] = await Promise.all([
        dataAdapter.get("ProjectMilestone", milestoneId),
        dataAdapter.get("EPCCertification", certificationId),
        dataAdapter.get("EPCProgressBilling", billingId),
        dataAdapter.get("EPCRetentionRelease", retentionReleaseId),
        dataAdapter.get("EPCProgressReport", reportId),
      ]);
      return {
        milestoneStatus: milestone?.record.status,
        certificationStatus: certification?.record.status,
        billingStatus: billing?.record.status,
        retentionStatus: retentionRelease?.record.status,
        reportRevenue: report?.record.revenueRecognized,
      };
    },
    {
      milestoneId: flow.milestoneId,
      certificationId: flow.certificationId,
      billingId: flow.billingId,
      retentionReleaseId: flow.retentionReleaseId,
      reportId: flow.reportId,
    },
  );

  expect(flow.status).toBe("Verified BAST");
  expect(flow.revenueRecognized).toBe(9600000000);
  expect(flow.retentionReleased).toBe(480000000);
  expect(flow.glBalanced).toBe(true);
  expect(persisted).toEqual({
    milestoneStatus: "Verified BAST",
    certificationStatus: "Certified",
    billingStatus: "Submitted",
    retentionStatus: "Released",
    reportRevenue: 9600000000,
  });

  await page.goto("/app/epc-contractor/list/ProjectMilestone");
  await expect(page.getByText(flow.milestoneId)).toBeVisible();
  await page.goto("/app/epc-contractor/report/EPCProgressReport");
  await expect(page.getByText("Laporan Kontraktor").first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("koperasi-bmt real-mock member finance workflow persists after reload", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.removeItem("uidl-runtime-mock-db");
  });

  await page.goto("/app/koperasi-bmt/member-finance");
  await expect(page.getByText("Member Finance").first()).toBeVisible();

  const flow = await page.evaluate(async () => {
    const configPath = "/@id/@uidl-runtime/templates/config/data.config";
    const servicePath = "/@id/@uidl-runtime/templates/domain/services/koperasiBmtService";
    const [{ dataAdapter }, service] = await Promise.all([
      import(/* @vite-ignore */ configPath) as Promise<BrowserDataConfigModule>,
      import(/* @vite-ignore */ servicePath) as Promise<BrowserKoperasiServiceModule>,
    ]);

    const member = await service.registerCooperativeMember(dataAdapter, {
      companyId: "koperasi-bmt",
      memberName: "Ahmad Fauzi",
      branch: "Pasar Minggu",
      joinedAt: "2026-08-25",
    });
    const pokok = await service.recordSavingsDeposit(dataAdapter, {
      memberId: String(member.id),
      savingsType: "Pokok",
      amount: 1000000,
      depositedAt: "2026-08-25T09:00:00+07:00",
      teller: "Nadia P.",
    });
    const sukarela = await service.recordSavingsDeposit(dataAdapter, {
      memberId: String(member.id),
      savingsType: "Sukarela",
      amount: 500000,
      depositedAt: "2026-08-25T09:05:00+07:00",
      teller: "Nadia P.",
    });
    const application = await service.createMurabahahApplication(dataAdapter, {
      companyId: "koperasi-bmt",
      memberId: String(member.id),
      goodsDescription: "Gerobak dan perlengkapan usaha makanan",
      principalAmount: 12000000,
      marginAmount: 2400000,
      tenorMonths: 12,
      startDate: "2026-08-25",
    });
    await service.approveMurabahahFinancing(dataAdapter, {
      agreementId: String(application.id),
      approvedBy: "Komite Pembiayaan",
      approvedAt: "2026-08-25T10:00:00+07:00",
    });
    const disbursed = await service.disburseMurabahahFinancing(dataAdapter, {
      agreementId: String(application.id),
      disbursedAt: "2026-08-25T11:00:00+07:00",
    });
    const installment = await service.receiveInstallmentPayment(dataAdapter, {
      agreementId: String(application.id),
      installmentNo: 1,
      paidAt: "2026-09-25",
      amount: 1200000,
      method: "Kas Teller",
    });
    const collectibility = await service.assessCollectibility(dataAdapter, {
      agreementId: String(application.id),
      daysPastDue: 45,
      assessedAt: "2026-10-31",
    });
    const shu = await service.calculateSHUAllocation(dataAdapter, {
      companyId: "koperasi-bmt",
      fiscalYear: "2026",
      netSurplus: 420000000,
      allocation: { reserve: 25, savings: 30, transactions: 30, governance: 15 },
      calculatedAt: "2026-12-31",
    });
    const gl = await dataAdapter.query({
      collection: "KoperasiGLEntry",
      filters: [
        {
          field: "voucherNo",
          op: "in",
          value: [pokok.transaction.id, sukarela.transaction.id, disbursed.agreement.id, installment.payment.id, shu.allocation.id],
        },
      ],
    });
    const glDebit = gl.rows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.debit ?? 0), 0);
    const glCredit = gl.rows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.credit ?? 0), 0);

    return {
      memberId: String(member.id),
      equityAccountId: String(pokok.account.id),
      liabilityAccountId: String(sukarela.account.id),
      agreementId: String(collectibility.agreement.id),
      paymentId: String(installment.payment.id),
      assessmentId: String(collectibility.assessment.id),
      shuId: String(shu.allocation.id),
      distributionId: String(shu.memberDistribution.id),
      agreementStatus: String(collectibility.agreement.status),
      collectibilityGrade: String(collectibility.assessment.grade),
      memberShu: Number(shu.memberDistribution.amount),
      glBalanced: glDebit === glCredit,
    };
  });

  await page.reload();
  const persisted = await page.evaluate(
    async ({ memberId, equityAccountId, liabilityAccountId, agreementId, paymentId, assessmentId, shuId, distributionId }) => {
      const configPath = "/@id/@uidl-runtime/templates/config/data.config";
      const { dataAdapter } = (await import(/* @vite-ignore */ configPath)) as BrowserDataConfigModule;
      const [member, equityAccount, liabilityAccount, agreement, payment, assessment, shu, distribution] = await Promise.all([
        dataAdapter.get("KoperasiMember", memberId),
        dataAdapter.get("SavingsAccount", equityAccountId),
        dataAdapter.get("SavingsAccount", liabilityAccountId),
        dataAdapter.get("MurabahahAgreement", agreementId),
        dataAdapter.get("MurabahahInstallmentPayment", paymentId),
        dataAdapter.get("KoperasiCollectibilityAssessment", assessmentId),
        dataAdapter.get("KoperasiSHUAllocation", shuId),
        dataAdapter.get("KoperasiSHUMemberDistribution", distributionId),
      ]);
      return {
        memberStatus: member?.record.status,
        equityClassification: equityAccount?.record.classification,
        liabilityClassification: liabilityAccount?.record.classification,
        agreementGrade: agreement?.record.collectibilityGrade,
        paymentStatus: payment?.record.status,
        assessmentReserve: assessment?.record.ckpnReserve,
        shuStatus: shu?.record.status,
        distributionAmount: distribution?.record.amount,
      };
    },
    {
      memberId: flow.memberId,
      equityAccountId: flow.equityAccountId,
      liabilityAccountId: flow.liabilityAccountId,
      agreementId: flow.agreementId,
      paymentId: flow.paymentId,
      assessmentId: flow.assessmentId,
      shuId: flow.shuId,
      distributionId: flow.distributionId,
    },
  );

  expect(flow.agreementStatus).toBe("Aktif");
  expect(flow.collectibilityGrade).toBe("2 - Dalam Perhatian");
  expect(flow.memberShu).toBe(252000000);
  expect(flow.glBalanced).toBe(true);
  expect(persisted).toEqual({
    memberStatus: "Aktif",
    equityClassification: "Equity",
    liabilityClassification: "Liability",
    agreementGrade: "2 - Dalam Perhatian",
    paymentStatus: "Submitted",
    assessmentReserve: 550000,
    shuStatus: "Calculated",
    distributionAmount: 252000000,
  });

  await page.goto("/app/koperasi-bmt/list/MurabahahAgreement");
  await expect(page.getByText(flow.agreementId)).toBeVisible();
  await page.goto("/app/koperasi-bmt/report/KoperasiMemberReport");
  await expect(page.getByText("Laporan RAT Anggota").first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("hospital-medika real-mock clinical workflow persists after reload", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.removeItem("uidl-runtime-mock-db");
  });

  await page.goto("/app/hospital-medika/clinical-ops");
  await expect(page.getByText("Clinical Ops").first()).toBeVisible();

  const flow = await page.evaluate(async () => {
    const configPath = "/@id/@uidl-runtime/templates/config/data.config";
    const servicePath = "/@id/@uidl-runtime/templates/domain/services/hospitalMedikaService";
    const [{ dataAdapter }, service] = await Promise.all([
      import(/* @vite-ignore */ configPath) as Promise<BrowserDataConfigModule>,
      import(/* @vite-ignore */ servicePath) as Promise<BrowserHospitalServiceModule>,
    ]);

    const admission = await service.registerPatientAdmission(dataAdapter, {
      companyId: "hospital-medika",
      patientName: "Pasien Demo Klinik 001",
      medicalRecordNo: "RM-DEMO-0001",
      polyDepartment: "Poli Penyakit Dalam",
      doctorName: "dr. Hendra Sp.PD",
      insuranceType: "BPJS Kesehatan",
      admissionDate: "2026-08-25",
    });
    await service.callPatientToExam(dataAdapter, {
      admissionId: String(admission.id),
      calledAt: "2026-08-25T09:00:00+07:00",
    });
    const emr = await service.recordEMRDiagnosis(dataAdapter, {
      admissionId: String(admission.id),
      icd10Code: "E11.9",
      diagnosisText: "Diabetes melitus tipe 2 tanpa komplikasi - data demo",
      clinicalNotes: "Data fiktif untuk demo uidl-runtime",
      recordedAt: "2026-08-25T09:20:00+07:00",
    });
    const prescription = await service.dispensePrescriptionFEFO(dataAdapter, {
      admissionId: String(admission.id),
      drugCode: "AMOX500",
      quantity: 10,
      dispensedAt: "2026-08-25T10:00:00+07:00",
      pharmacist: "Apt. Rina",
    });
    const bill = await service.createPatientBill(dataAdapter, {
      admissionId: String(admission.id),
      serviceFee: 500000,
      medicationFee: 150000,
      billedAt: "2026-08-25T10:30:00+07:00",
    });
    const claim = await service.submitInsuranceClaim(dataAdapter, {
      billId: String(bill.bill.id),
      sepNo: "SEP-DEMO-2026-0001",
      inaCbgCode: "Q-5-44-I",
      submittedAt: "2026-08-25T11:00:00+07:00",
    });
    const verified = await service.verifyInsuranceClaim(dataAdapter, {
      claimId: String(claim.claim.id),
      approvedAmount: 650000,
      verifiedAt: "2026-08-26",
    });
    const gl = await dataAdapter.query({
      collection: "HospitalGLEntry",
      filters: [{ field: "voucherNo", op: "eq", value: bill.bill.id }],
    });
    const glDebit = gl.rows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.debit ?? 0), 0);
    const glCredit = gl.rows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.credit ?? 0), 0);

    return {
      admissionId: String(verified.admission.id),
      encounterId: String(emr.admission.encounterId),
      emrId: String(emr.medicalRecord.id),
      prescriptionId: String(prescription.prescription.id),
      dispensingId: String(prescription.dispensing.id),
      drugBatchId: String(prescription.drugBatch.id),
      billId: String(bill.bill.id),
      claimId: String(verified.claim.id),
      reportId: String(verified.report.id),
      queueNo: String(admission.queueNo),
      status: String(verified.admission.status),
      claimStatus: String(verified.admission.claimStatus),
      stockAfter: Number(prescription.drugBatch.stockQty),
      totalAmount: Number(bill.bill.totalAmount),
      claimApproved: Number(verified.report.claimApproved),
      medicationCost: Number(verified.report.medicationCost),
      glBalanced: glDebit === glCredit,
    };
  });

  await page.reload();
  const persisted = await page.evaluate(
    async ({ admissionId, encounterId, emrId, prescriptionId, dispensingId, drugBatchId, billId, claimId, reportId }) => {
      const configPath = "/@id/@uidl-runtime/templates/config/data.config";
      const { dataAdapter } = (await import(/* @vite-ignore */ configPath)) as BrowserDataConfigModule;
      const [admission, encounter, emr, prescription, dispensing, drugBatch, bill, claim, report] = await Promise.all([
        dataAdapter.get("PatientAdmission", admissionId),
        dataAdapter.get("HospitalEncounter", encounterId),
        dataAdapter.get("HospitalMedicalRecord", emrId),
        dataAdapter.get("HospitalPrescription", prescriptionId),
        dataAdapter.get("HospitalDispensingEntry", dispensingId),
        dataAdapter.get("HospitalDrugBatch", drugBatchId),
        dataAdapter.get("HospitalPatientBill", billId),
        dataAdapter.get("HospitalInsuranceClaim", claimId),
        dataAdapter.get("HospitalRevenueReport", reportId),
      ]);
      return {
        admissionStatus: admission?.record.status,
        admissionClaimStatus: admission?.record.claimStatus,
        encounterStatus: encounter?.record.status,
        emrStatus: emr?.record.status,
        prescriptionStatus: prescription?.record.status,
        dispensingStockAfter: dispensing?.record.stockAfter,
        drugStockAfter: drugBatch?.record.stockQty,
        billStatus: bill?.record.status,
        claimStatus: claim?.record.status,
        reportClaimApproved: report?.record.claimApproved,
      };
    },
    {
      admissionId: flow.admissionId,
      encounterId: flow.encounterId,
      emrId: flow.emrId,
      prescriptionId: flow.prescriptionId,
      dispensingId: flow.dispensingId,
      drugBatchId: flow.drugBatchId,
      billId: flow.billId,
      claimId: flow.claimId,
      reportId: flow.reportId,
    },
  );

  expect(flow.queueNo).toBe("PD-001");
  expect(flow.status).toBe("Selesai");
  expect(flow.claimStatus).toBe("Verified");
  expect(flow.stockAfter).toBe(90);
  expect(flow.totalAmount).toBe(650000);
  expect(flow.claimApproved).toBe(650000);
  expect(flow.medicationCost).toBe(150000);
  expect(flow.glBalanced).toBe(true);
  expect(persisted).toEqual({
    admissionStatus: "Selesai",
    admissionClaimStatus: "Verified",
    encounterStatus: "Pemeriksaan",
    emrStatus: "Completed",
    prescriptionStatus: "Dispensed",
    dispensingStockAfter: 90,
    drugStockAfter: 90,
    billStatus: "Claim Submitted",
    claimStatus: "Verified",
    reportClaimApproved: 650000,
  });

  await page.goto("/app/hospital-medika/list/PatientAdmission");
  await expect(page.getByText(flow.admissionId)).toBeVisible();
  await page.goto("/app/hospital-medika/report/HospitalRevenueReport");
  await expect(page.getByText("Laporan Manajemen Rumah Sakit").first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("medical-device real-mock regulated manufacturing workflow persists after reload", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.removeItem("uidl-runtime-mock-db");
  });

  await page.goto("/app/medical-device/quality-manufacturing");
  await expect(page.getByText("Quality Manufacturing").first()).toBeVisible();

  const flow = await page.evaluate(async () => {
    const configPath = "/@id/@uidl-runtime/templates/config/data.config";
    const servicePath = "/@id/@uidl-runtime/templates/domain/services/medicalDeviceService";
    const [{ dataAdapter }, service] = await Promise.all([
      import(/* @vite-ignore */ configPath) as Promise<BrowserDataConfigModule>,
      import(/* @vite-ignore */ servicePath) as Promise<BrowserMedicalDeviceServiceModule>,
    ]);

    const dmr = await service.createDeviceMasterRecord(dataAdapter, {
      companyId: "medical-device",
      deviceName: "Spuit Sekali Pakai 5ml Luer Lock Steril",
      riskClass: "Kelas IIa",
      udiDi: "08994567890123",
      revision: "Rev. 8",
      effectiveDate: "2026-08-25",
    });
    const dhr = await service.createDeviceBatchDHR(dataAdapter, {
      companyId: "medical-device",
      dmrId: String(dmr.id),
      batchQty: 2500,
      unitCost: 8500,
      manufacturingDate: "2026-08-25",
      cleanroomClass: "ISO Class 7",
    });
    await service.passCleanroomInspection(dataAdapter, {
      batchId: String(dhr.batch.id),
      particleCount: 72,
      bioburdenCfu: 4,
      inspectedBy: "QA Cleanroom Lead",
      inspectedAt: "2026-08-25T09:00:00+07:00",
    });
    const sterilized = await service.completeSterilizationCycle(dataAdapter, {
      batchId: String(dhr.batch.id),
      chamber: "Chamber A",
      temperatureC: 54,
      durationMinutes: 260,
      biologicalIndicator: "BI Negative",
      sterilizedAt: "2026-08-25T14:30:00+07:00",
    });
    const capa = await service.openCAPAForBatch(dataAdapter, {
      batchId: String(dhr.batch.id),
      issue: "Label UDI kurang kontras saat scan sampling",
      severity: "Major",
      owner: "QA Manager",
      openedAt: "2026-08-25T15:00:00+07:00",
    });
    let releaseBlocked = false;
    try {
      await service.releaseDeviceBatchQA(dataAdapter, {
        batchId: String(dhr.batch.id),
        releasedBy: "QA Manager",
        releasedAt: "2026-08-25T16:00:00+07:00",
      });
    } catch (error) {
      releaseBlocked = String(error).includes("open CAPA");
    }
    const closed = await service.closeCAPAForBatch(dataAdapter, {
      capaId: String(capa.capa.id),
      resolution: "Kontras label UDI dinaikkan dan sampling scan ulang passed",
      closedAt: "2026-08-25T16:20:00+07:00",
    });
    const released = await service.releaseDeviceBatchQA(dataAdapter, {
      batchId: String(dhr.batch.id),
      releasedBy: "QA Manager",
      releasedAt: "2026-08-25T16:45:00+07:00",
    });
    const gl = await dataAdapter.query({
      collection: "MedicalDeviceGLEntry",
      filters: [{ field: "voucherNo", op: "eq", value: released.release.id }],
    });
    const glDebit = gl.rows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.debit ?? 0), 0);
    const glCredit = gl.rows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.credit ?? 0), 0);

    return {
      dmrId: String(dmr.id),
      batchId: String(released.batch.id),
      dhrId: String(dhr.dhr.id),
      cleanroomInspectionId: String(sterilized.batch.cleanroomInspectionId),
      sterilizationCycleId: String(sterilized.cycle.id),
      capaId: String(closed.capa.id),
      releaseId: String(released.release.id),
      traceId: String(released.trace.id),
      releaseBlocked,
      batchStatus: String(released.batch.status),
      dhrApproved: Boolean(released.batch.dhrApproved),
      qaHold: Boolean(released.batch.qaHold),
      traceStatus: String(released.trace.status),
      releaseValue: Number(released.release.releaseValue),
      glBalanced: glDebit === glCredit,
    };
  });

  await page.reload();
  const persisted = await page.evaluate(
    async ({ dmrId, batchId, dhrId, cleanroomInspectionId, sterilizationCycleId, capaId, releaseId, traceId }) => {
      const configPath = "/@id/@uidl-runtime/templates/config/data.config";
      const { dataAdapter } = (await import(/* @vite-ignore */ configPath)) as BrowserDataConfigModule;
      const [dmr, batch, dhr, inspection, cycle, capa, release, trace] = await Promise.all([
        dataAdapter.get("DeviceMasterRecord", dmrId),
        dataAdapter.get("DeviceBatch", batchId),
        dataAdapter.get("DeviceHistoryRecord", dhrId),
        dataAdapter.get("CleanroomInspection", cleanroomInspectionId),
        dataAdapter.get("SterilizationCycle", sterilizationCycleId),
        dataAdapter.get("MedicalDeviceCAPA", capaId),
        dataAdapter.get("QARelease", releaseId),
        dataAdapter.get("UDITraceEvent", traceId),
      ]);
      return {
        dmrStatus: dmr?.record.status,
        batchStatus: batch?.record.status,
        dhrStatus: dhr?.record.status,
        inspectionStatus: inspection?.record.status,
        cycleStatus: cycle?.record.status,
        capaStatus: capa?.record.status,
        releaseStatus: release?.record.status,
        traceStatus: trace?.record.status,
      };
    },
    {
      dmrId: flow.dmrId,
      batchId: flow.batchId,
      dhrId: flow.dhrId,
      cleanroomInspectionId: flow.cleanroomInspectionId,
      sterilizationCycleId: flow.sterilizationCycleId,
      capaId: flow.capaId,
      releaseId: flow.releaseId,
      traceId: flow.traceId,
    },
  );

  expect(flow.releaseBlocked).toBe(true);
  expect(flow.batchStatus).toBe("QA Released");
  expect(flow.dhrApproved).toBe(true);
  expect(flow.qaHold).toBe(false);
  expect(flow.traceStatus).toBe("Traceable");
  expect(flow.releaseValue).toBe(21250000);
  expect(flow.glBalanced).toBe(true);
  expect(persisted).toEqual({
    dmrStatus: "Effective",
    batchStatus: "QA Released",
    dhrStatus: "Released",
    inspectionStatus: "Passed",
    cycleStatus: "Passed",
    capaStatus: "Closed",
    releaseStatus: "Released",
    traceStatus: "Traceable",
  });

  await page.goto("/app/medical-device/list/DeviceBatch");
  await expect(page.getByText(flow.batchId, { exact: true }).first()).toBeVisible();
  await page.goto("/app/medical-device/report/MedicalDeviceComplianceReport");
  await expect(page.getByText("Laporan Kepatuhan ISO 13485 & UDI").first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});
