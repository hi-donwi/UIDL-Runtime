import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { CompanyReference, PageSpec, TableSpec } from "./types";

export type AuditFindingCode =
  | "actions.toastOnly"
  | "console.noActiveModules"
  | "console.pageSpecRuntime"
  | "http.missingAdapter"
  | "http.missingContractTests"
  | "http.missingMockServer"
  | "http.missingScripts"
  | "http.unimplementedAdapter"
  | "runtime.companyIdBranches"
  | "runtime.createRecordModal"
  | "runtime.directCompanyDataset"
  | "runtime.directMockApi"
  | "runtime.transitionActionMap";

export interface AuditFinding {
  code: AuditFindingCode;
  message: string;
  count: number;
  details?: string[];
}

export type ReferenceMaturityLevel =
  | "concept-reference"
  | "ui-reference"
  | "functional-reference"
  | "domain-verified-reference"
  | "production-ready";

export interface ReferenceMaturityAssessment {
  companyId: string;
  title: string;
  level: ReferenceMaturityLevel;
  reasons: string[];
}

export interface SourceSnapshot {
  referenceApp: string;
  createConsoleDocument: string;
  dataConfig: string;
  packageJson: { scripts?: Record<string, string> };
  files: Set<string>;
}

export interface AuditAntiGoalInput {
  companies: CompanyReference[];
  source: SourceSnapshot;
}

type ActionClassification = "create" | "toast-only";

const CREATE_ACTION_PREFIXES = ["+", "Tambah", "Panggil", "Input", "Sync", "Dispensing", "Daftar", "Buat"];
const REQUIRED_HTTP_SCRIPTS = ["mock:api", "dev:reference:http", "build:reference", "preview:reference"];

export function classifyAction(label: string): ActionClassification {
  return CREATE_ACTION_PREFIXES.some((prefix) => label.startsWith(prefix)) ? "create" : "toast-only";
}

export function auditAntiGoalPatterns({ companies, source }: AuditAntiGoalInput): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const pageSpecs = collectPageSpecs(companies);
  const totalModules = companies.reduce((sum, company) => sum + (company.modules?.length ?? 0), 0);
  const toastOnlyActions = pageSpecs.flatMap(({ companyId, pageId, page }) =>
    page.actions
      .filter((label) => classifyAction(label) === "toast-only")
      .map((label) => `${companyId}/${pageId}: ${label}`),
  );

  if (pageSpecs.length > 0) {
    findings.push({
      code: "console.pageSpecRuntime",
      count: pageSpecs.length,
      message: `${pageSpecs.length} console pages still use PageSpec as the primary runtime surface.`,
      details: pageSpecs.slice(0, 12).map(({ companyId, pageId }) => `${companyId}/${pageId}`),
    });
  }

  if (totalModules === 0) {
    findings.push({
      code: "console.noActiveModules",
      count: companies.length,
      message: "No active ModuleSpec declarations are wired into company consoles.",
      details: companies.map((company) => company.id),
    });
  }

  if (toastOnlyActions.length > 0) {
    findings.push({
      code: "actions.toastOnly",
      count: toastOnlyActions.length,
      message: `${toastOnlyActions.length} header actions would only display toast feedback in PageSpec runtime.`,
      details: toastOnlyActions.slice(0, 20),
    });
  }

  if (hasCreateRecordModal(source)) {
    findings.push({
      code: "runtime.createRecordModal",
      count: 1,
      message: "CreateRecordModal remains in the reference create path; create should use generated forms over the adapter.",
      details: ["apps/reference/src/CreateRecordModal.tsx", "apps/reference/src/ReferenceApp.tsx"],
    });
  }

  const directMockApiCount = countMatches(source.referenceApp, /\bmockApi\.(create|update|delete|resetAll|list|get|query)\b/g);
  if (directMockApiCount > 0) {
    findings.push({
      code: "runtime.directMockApi",
      count: directMockApiCount,
      message: `${directMockApiCount} direct mockApi calls remain in ReferenceApp; business writes must go through adapter-backed services.`,
    });
  }

  const datasetWriteCount = countMatches(source.referenceApp, /\bsetCompanyDataset\b/g);
  if (datasetWriteCount > 0) {
    findings.push({
      code: "runtime.directCompanyDataset",
      count: datasetWriteCount,
      message: `${datasetWriteCount} setCompanyDataset writes remain; app shell should not be the data store.`,
    });
  }

  const companyBranchCount = countMatches(source.referenceApp, /\bcompanyId\s*===/g);
  if (companyBranchCount > 0) {
    findings.push({
      code: "runtime.companyIdBranches",
      count: companyBranchCount,
      message: `${companyBranchCount} companyId-specific branches remain in ReferenceApp runtime flow.`,
    });
  }

  const transitionMapCount = countMatches(source.referenceApp, /\bTRANSITION_ACTIONS\b/g);
  if (transitionMapCount > 0) {
    findings.push({
      code: "runtime.transitionActionMap",
      count: transitionMapCount,
      message: "TRANSITION_ACTIONS remains in ReferenceApp; transitions should come from document metadata/services.",
    });
  }

  if (!source.files.has("packages/core/src/data/adapters/http.ts") && !source.files.has("src/data/adapters/http.ts")) {
    findings.push({
      code: "http.missingAdapter",
      count: 1,
      message: "HttpAdapter is missing, so VITE_DATA_MODE=http cannot prove backend switchability.",
    });
  }

  if (!source.files.has("scripts/mock-server.mjs")) {
    findings.push({
      code: "http.missingMockServer",
      count: 1,
      message: "Mock HTTP server script is missing.",
    });
  }

  if (!source.files.has("packages/core/src/data/__tests__/contract.test.ts") && !source.files.has("src/data/__tests__/contract.test.ts")) {
    findings.push({
      code: "http.missingContractTests",
      count: 1,
      message: "Adapter contract test suite is missing.",
    });
  }

  const missingScripts = REQUIRED_HTTP_SCRIPTS.filter((scriptName) => !source.packageJson.scripts?.[scriptName]);
  if (missingScripts.length > 0) {
    findings.push({
      code: "http.missingScripts",
      count: missingScripts.length,
      message: `Missing HTTP/reference operational scripts: ${missingScripts.join(", ")}.`,
      details: missingScripts,
    });
  }

  if (/createUnimplementedHttpAdapter|belum diimplementasikan|not implemented/i.test(source.dataConfig)) {
    findings.push({
      code: "http.unimplementedAdapter",
      count: 1,
      message: "HTTP mode is still wired to an unimplemented adapter stub.",
    });
  }

  return findings;
}

export function summarizeFindings(findings: AuditFinding[]): string {
  return findings.map((finding) => `${finding.code}:${finding.count}`).join("\n");
}

export function assessReferenceMaturity({ companies, source }: AuditAntiGoalInput): ReferenceMaturityAssessment[] {
  const findings = auditAntiGoalPatterns({ companies, source });
  const hasHttpProof = !findings.some((finding) => finding.code.startsWith("http."));

  return companies.map((company) => {
    const pageCount = Object.keys(company.pages ?? {}).length;
    const moduleCount = company.modules?.length ?? 0;
    const doctypeCount =
      (company.doctypes?.length ?? 0) +
      (company.modules?.reduce((sum, module) => sum + (module.doctypes?.length ?? 0), 0) ?? 0);

    if (pageCount > 0 || moduleCount === 0) {
      return {
        companyId: company.id,
        title: company.title,
        level: pageCount > 0 ? "ui-reference" : "concept-reference",
        reasons: [
          pageCount > 0 ? `${pageCount} PageSpec runtime pages remain` : "No PageSpec runtime pages",
          moduleCount === 0 ? "No ModuleSpec wired" : `${moduleCount} ModuleSpec entries wired`,
        ],
      };
    }

    if (doctypeCount === 0) {
      return {
        companyId: company.id,
        title: company.title,
        level: "ui-reference",
        reasons: [
          "No DoctypeMeta declarations available",
          "Module shell is present but business documents are not metadata-renderable yet",
        ],
      };
    }

    const domainEvidence = domainVerifiedEvidence(company.id, source);
    if (domainEvidence.length > 0 && hasHttpProof) {
      return {
        companyId: company.id,
        title: company.title,
        level: "domain-verified-reference",
        reasons: domainEvidence,
      };
    }

    if (hasHttpProof) {
      return {
        companyId: company.id,
        title: company.title,
        level: "functional-reference",
        reasons: ["Functional reference is proven through the HTTP adapter, mock server, contract tests, and scripts"],
      };
    }

    return {
      companyId: company.id,
      title: company.title,
      level: "functional-reference",
      reasons: ["Functional reference is adapter-backed; HTTP proof is still pending"],
    };
  });
}

function domainVerifiedEvidence(companyId: string, source: SourceSnapshot): string[] {
  if (companyId === "school-abc") {
    const hasService = source.files.has("packages/templates/src/domain/services/schoolDunningService.ts");
    const hasUnitTest = source.files.has("packages/templates/src/domain/services/__tests__/schoolDunningService.test.ts");
    const hasBrowserTest = source.files.has("e2e/meridian-reference.spec.ts");
    if (hasService && hasUnitTest && hasBrowserTest) {
      return ["School dunning is derived from due dates, paid amounts, outstanding balances, aging stages, unit tests, and clicked browser proof"];
    }
  }

  if (companyId === "hospital-medika") {
    const hasService = source.files.has("packages/templates/src/domain/services/hospitalReconciliationService.ts");
    const hasUnitTest = source.files.has("packages/templates/src/domain/services/__tests__/hospitalReconciliationService.test.ts");
    const hasBrowserTest = source.files.has("e2e/meridian-reference.spec.ts");
    if (hasService && hasUnitTest && hasBrowserTest) {
      return [
        "Hospital claim reconciliation joins bills, insurance claims, payer payments, and adjustments into per-bill outstanding balances with unit tests and clicked browser proof",
      ];
    }
  }

  if (companyId === "helpdesk") {
    const hasService = source.files.has("packages/templates/src/domain/services/helpdeskSlaService.ts");
    const hasUnitTest = source.files.has("packages/templates/src/domain/services/__tests__/helpdeskSlaService.test.ts");
    const hasBrowserTest = source.files.has("e2e/meridian-reference.spec.ts");
    if (hasService && hasUnitTest && hasBrowserTest) {
      return [
        "Helpdesk SLA elapsed time is recomputed from lifecycle timestamps net of pause windows, with breach verdicts, an escalation signal, unit tests, and clicked browser proof",
      ];
    }
  }

  if (companyId === "koperasi-bmt") {
    const hasService = source.files.has("packages/templates/src/domain/services/koperasiCollectibilityService.ts");
    const hasUnitTest = source.files.has("packages/templates/src/domain/services/__tests__/koperasiCollectibilityService.test.ts");
    const hasBrowserTest = source.files.has("e2e/meridian-reference.spec.ts");
    if (hasService && hasUnitTest && hasBrowserTest) {
      return [
        "Koperasi murabahah collectibility derives days-past-due from the earliest unpaid installment, maps the OJK-style five-tier grade, and provisions CKPN per tier, with unit tests and clicked browser proof",
      ];
    }
  }

  return [];
}

export function loadSourceSnapshot(projectRoot: string): SourceSnapshot {
  return {
    referenceApp: readText(projectRoot, "apps/reference/src/ReferenceApp.tsx"),
    createConsoleDocument: readText(projectRoot, "packages/templates/src/console/createConsoleDocument.ts"),
    dataConfig: readText(projectRoot, "packages/templates/src/config/data.config.ts"),
    packageJson: JSON.parse(readText(projectRoot, "package.json")) as SourceSnapshot["packageJson"],
    files: collectFiles(projectRoot),
  };
}

function collectPageSpecs(companies: CompanyReference[]): Array<{ companyId: string; pageId: string; page: PageSpec }> {
  return companies.flatMap((company) =>
    Object.entries(company.pages ?? {}).map(([pageId, page]) => ({
      companyId: company.id,
      pageId,
      page,
    })),
  );
}

function hasCreateRecordModal(source: SourceSnapshot): boolean {
  return (
    source.files.has("apps/reference/src/CreateRecordModal.tsx") || /CreateRecordModal/.test(source.referenceApp)
  );
}

function readText(projectRoot: string, path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

function collectFiles(projectRoot: string): Set<string> {
  const files = new Set<string>();

  function visit(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git" || entry.name === "test-results") {
        continue;
      }

      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile() && existsSync(absolutePath)) {
        files.add(relative(projectRoot, absolutePath));
      }
    }
  }

  visit(projectRoot);
  return files;
}

function countMatches(value: string, pattern: RegExp): number {
  return [...value.matchAll(pattern)].length;
}

export function countTableRowActions(tables: TableSpec[]): number {
  return tables.reduce((sum, table) => sum + (table.rowActions?.length ?? 0), 0);
}
