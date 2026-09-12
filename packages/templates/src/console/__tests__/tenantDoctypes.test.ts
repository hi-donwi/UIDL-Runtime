import { describe, expect, it } from "vitest";
import { parseDoctypeMeta } from "../../domain/doctypes/types";
import {
  SHOE_ORDER_META,
  TUITION_FEE_META,
  WORK_ORDER_META,
  ROASTING_BATCH_META,
  PROJECT_MILESTONE_META,
  OPPORTUNITY_META,
  MURABAHAH_FINANCING_META,
  PATIENT_ADMISSION_META,
  DEVICE_BATCH_META,
  FULFILLMENT_ORDER_META,
  SUPPORT_TICKET_META,
} from "../doctypes";

describe("Tenant DoctypeMeta Definitions", () => {
  const TENANT_DOCTYPES = [
    { tenant: "shoe-company", meta: SHOE_ORDER_META },
    { tenant: "school-abc", meta: TUITION_FEE_META },
    { tenant: "factory-abc", meta: WORK_ORDER_META },
    { tenant: "food-roasters", meta: ROASTING_BATCH_META },
    { tenant: "epc-contractor", meta: PROJECT_MILESTONE_META },
    { tenant: "crm-pipeline", meta: OPPORTUNITY_META },
    { tenant: "koperasi-bmt", meta: MURABAHAH_FINANCING_META },
    { tenant: "hospital-medika", meta: PATIENT_ADMISSION_META },
    { tenant: "medical-device", meta: DEVICE_BATCH_META },
    { tenant: "omnichannel-dist", meta: FULFILLMENT_ORDER_META },
    { tenant: "helpdesk", meta: SUPPORT_TICKET_META },
  ];

  for (const { tenant, meta } of TENANT_DOCTYPES) {
    it(`validates ${tenant} doctype (${meta.name}) passes DoctypeMetaSchema with no dangling refs`, () => {
      const parsed = parseDoctypeMeta(meta);
      expect(parsed.name).toBe(meta.name);
      expect(parsed.fields.length).toBeGreaterThanOrEqual(4);
      expect(parsed.listView.columns.length).toBeGreaterThanOrEqual(3);
      expect(parsed.states).toBeDefined();
      expect(parsed.states!.transitions.length).toBeGreaterThanOrEqual(1);
    });
  }
});
