import type { CompanyDemo } from "../types";
import { shoeCompany } from "./shoeCompany";
import { schoolAbc } from "./schoolAbc";
import { factoryAbc } from "./factoryAbc";
import { foodRoasters } from "./foodRoasters";
import { epcContractor } from "./epcContractor";
import { crmPipeline } from "./crmPipeline";
import { koperasiBmt } from "./koperasiBmt";
import { hospitalMedika } from "./hospitalMedika";
import { medicalDevice } from "./medicalDevice";
import { omnichannelDist } from "./omnichannelDist";
import { helpdesk } from "./helpdesk";

/** Catalog order — the order the landing page lists them in. */
export const companies: CompanyDemo[] = [
  shoeCompany,
  schoolAbc,
  factoryAbc,
  foodRoasters,
  epcContractor,
  crmPipeline,
  koperasiBmt,
  hospitalMedika,
  medicalDevice,
  omnichannelDist,
  helpdesk,
];
