/**
 * Transition Posting Dispatcher.
 *
 * Routes single-record transitions that have `posting: true` across all vertical doctypes
 * directly to their respective domain service operations, ensuring balanced GL entries,
 * stock ledger records, and domain side effects are created upon state transitions.
 */

import type { DataAdapter } from "~/data/types";
import type { DoctypeMeta, StateTransition } from "../doctypes/types";
import { postDocument } from "./postingService";
import { disburseMurabahahFinancing } from "./koperasiBmtService";
import {
  certifyPercentageOfCompletion,
  submitProgressBilling,
  verifyMilestoneBAST,
} from "./epcContractorService";
import { receiveTuitionPayment } from "./schoolFinanceService";
import { releaseFinishedGoods } from "./factoryService";
import { packageRoastedBatch } from "./foodRoastersService";
import { completeSterilizationCycle, releaseDeviceBatchQA } from "./medicalDeviceService";
import { createPatientBill, verifyInsuranceClaim } from "./hospitalMedikaService";
import { createShippingLabel, recordMarketplaceSettlement } from "./omnichannelService";
import { closeWonOpportunity } from "./crmPipelineService";
import { closeSupportTicketWithCSAT } from "./helpdeskService";
import { postSalesInvoiceVoucher, reverseSalesInvoiceVoucher } from "./meridianSalesInvoiceService";
import { postPurchaseInvoiceVoucher, reversePurchaseInvoiceVoucher } from "./meridianPurchaseInvoiceService";
import { postPurchaseReceiptStock } from "./meridianPurchaseReceiptService";
import { postJournalEntryVoucher, reverseJournalEntryVoucher } from "./meridianJournalEntryService";

export interface TransitionPostingArgs {
  meta: DoctypeMeta;
  transition: StateTransition;
  record: Record<string, unknown>;
}

export function createTransitionPostingDispatcher(adapter: DataAdapter) {
  return async function dispatchTransitionPosting({ meta, transition, record }: TransitionPostingArgs): Promise<unknown> {
    const recordId = String(record.id ?? "");
    const today = typeof record.date === "string" ? record.date : new Date().toISOString().slice(0, 10);

    // 0. Meridian (core accounting) Sales Invoice — status is already flipped by runTransition,
    // so these post the GL side only.
    if (meta.name === "SalesInvoice") {
      if (transition.name === "submit") {
        const { voucher, subtotal, tax } = await postSalesInvoiceVoucher(adapter, {
          invoiceId: recordId,
          total: Number(record.total ?? 0),
          isTaxable: record.isTaxable !== false,
          party: String(record.customerName ?? record.customer ?? ""),
          postingDate: typeof record.date === "string" ? record.date : today,
        });
        const fresh = await adapter.get("SalesInvoice", recordId);
        if (fresh) {
          await adapter.update({
            collection: "SalesInvoice",
            id: recordId,
            version: fresh.meta.version,
            data: { subtotal, tax, submittedAt: today },
          });
        }
        return voucher;
      }
      if (transition.name === "cancel") {
        return await reverseSalesInvoiceVoucher(adapter, record, "Unpaid");
      }
    }

    // 0b. Meridian Purchase Invoice — buy-side mirror; status already flipped by runTransition.
    if (meta.name === "PurchaseInvoice") {
      if (transition.name === "submit") {
        const { voucher, subtotal, tax } = await postPurchaseInvoiceVoucher(adapter, {
          invoiceId: recordId,
          total: Number(record.total ?? 0),
          isTaxable: record.isTaxable !== false,
          party: String(record.supplierName ?? record.supplier ?? ""),
          postingDate: typeof record.date === "string" ? record.date : today,
        });
        const fresh = await adapter.get("PurchaseInvoice", recordId);
        if (fresh) {
          await adapter.update({
            collection: "PurchaseInvoice",
            id: recordId,
            version: fresh.meta.version,
            data: { subtotal, tax, submittedAt: today },
          });
        }
        return voucher;
      }
      if (transition.name === "cancel") {
        return await reversePurchaseInvoiceVoucher(adapter, record, "Unpaid");
      }
    }

    // 0c. Meridian Purchase Receipt — goods-in; status already flipped to Submitted.
    if (meta.name === "PurchaseReceipt" && transition.name === "receive") {
      return await postPurchaseReceiptStock(adapter, record);
    }

    // 0d. Meridian ad-hoc Journal Entry — status already flipped by runTransition.
    if (meta.name === "JournalEntry") {
      if (transition.name === "submit") {
        return await postJournalEntryVoucher(
          adapter,
          record,
          typeof record.date === "string" ? record.date : today,
        );
      }
      if (transition.name === "cancel") {
        return await reverseJournalEntryVoucher(adapter, record, "Submitted");
      }
    }

    // 1. Koperasi BMT
    if (meta.name === "MurabahahAgreement") {
      if (transition.name === "disburse") {
        return await disburseMurabahahFinancing(adapter, {
          agreementId: recordId,
          disbursedAt: today,
        });
      }
    }

    // 2. EPC Contractor
    if (meta.name === "ProjectMilestone") {
      if (transition.name === "certify") {
        const actual = Number(record.actualProgress ?? 100);
        const requested = Number(record.certifiedProgress ?? actual);
        const progress = Math.min(requested, actual);
        return await certifyPercentageOfCompletion(adapter, {
          milestoneId: recordId,
          certifiedProgress: progress,
          certifiedBy: "PM / Chief Engineer",
          certifiedAt: today,
        });
      }
      if (transition.name === "bill") {
        return await submitProgressBilling(adapter, {
          milestoneId: recordId,
          retentionRate: 0.05,
          invoiceDate: today,
          dueDate: today,
        });
      }
      if (transition.name === "verify") {
        return await verifyMilestoneBAST(adapter, {
          milestoneId: recordId,
          bastNo: String(record.bastNo || `BAST-${recordId}`),
          verifiedAt: today,
        });
      }
    }

    // 3. School Finance
    if (meta.name === "TuitionFee") {
      if (transition.name === "pay") {
        return await receiveTuitionPayment(adapter, {
          tuitionFeeId: recordId,
          amount: Number(record.amount ?? record.total ?? 1000000),
          paidAt: today,
          method: "Transfer VA",
        });
      }
    }

    // 4. Manufacturing / Factory
    if (meta.name === "WorkOrder") {
      if (transition.name === "finish") {
        return await releaseFinishedGoods(adapter, {
          workOrderId: recordId,
          releasedAt: today,
        });
      }
    }

    // 5. Food Roasters
    if (meta.name === "RoastingBatch") {
      if (transition.name === "package") {
        const roastedWeight = Number(record.roastedWeightKg ?? 25);
        const bagSizeGrams = 250;
        const bagCount = Math.max(1, Math.floor((roastedWeight * 1000) / bagSizeGrams));
        return await packageRoastedBatch(adapter, {
          roastingBatchId: recordId,
          sku: "ROAST-PACK-250G",
          bagCount,
          bagSizeGrams,
          packagedAt: today,
        });
      }
    }

    // 6. Medical Device
    if (meta.name === "DeviceBatch") {
      if (transition.name === "sterilize") {
        return await completeSterilizationCycle(adapter, {
          batchId: recordId,
          chamber: "ETO Chamber 1",
          temperatureC: 54,
          durationMinutes: 360,
          biologicalIndicator: "Negative / Pass",
          sterilizedAt: today,
        });
      }
      if (transition.name === "release") {
        return await releaseDeviceBatchQA(adapter, {
          batchId: recordId,
          releasedBy: "QA Lead",
          releasedAt: today,
        });
      }
    }

    // 7. Hospital Medika
    if (meta.name === "PatientAdmission") {
      if (transition.name === "complete") {
        return await createPatientBill(adapter, {
          admissionId: recordId,
          serviceFee: Number(record.serviceFee ?? 250000),
          medicationFee: Number(record.medicationFee ?? 350000),
          billedAt: today,
        });
      }
      if (transition.name === "verify_claim") {
        return await verifyInsuranceClaim(adapter, {
          claimId: `CLM-${recordId}`,
          approvedAmount: Number(record.approvedAmount ?? record.claimAmount ?? 1500000),
          verifiedAt: today,
        });
      }
    }

    // 8. Omnichannel Distribution
    if (meta.name === "FulfillmentOrder") {
      if (transition.name === "ship" || transition.name === "label") {
        return await createShippingLabel(adapter, {
          fulfillmentOrderId: recordId,
          trackingNo: `TRK-JNT-${recordId}`,
          labelUrl: `/meridian/print/packing-slip/omnichannel-dist/${recordId}`,
          printedAt: today,
        });
      }
      if (transition.name === "settle") {
        return await recordMarketplaceSettlement(adapter, {
          fulfillmentOrderId: recordId,
          marketplaceFee: 15000,
          settledAt: today,
        });
      }
    }

    // 9. CRM Pipeline
    if (meta.name === "Opportunity") {
      if (transition.name === "win") {
        return await closeWonOpportunity(adapter, {
          opportunityId: recordId,
          contractNo: `CTR-${recordId}`,
          closedAt: today,
        });
      }
    }

    // 10. Helpdesk
    if (meta.name === "SupportTicket") {
      if (transition.name === "resolve") {
        return await closeSupportTicketWithCSAT(adapter, {
          ticketId: recordId,
          resolution: "Issue resolved via console transition",
          closedAt: today,
          csatRating: 5,
          csatComment: "Great support resolution",
        });
      }
    }

    // Fallback: eval meta.posting.lines if declared
    if (meta.posting) {
      return await postDocument(meta, record, adapter);
    }

    return null;
  };
}
