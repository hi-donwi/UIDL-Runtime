export interface ConformanceCase {
  id: string;
  class: "expression" | "binding" | "condition" | "action" | "error" | "render" | "data";
  status: "active" | "planned";
  spec: string;
  description?: string;
  input: unknown;
  context?: Record<string, unknown>;
  expected?: unknown;
}

interface RawCaseModule {
  default: ConformanceCase;
}

const caseModules = import.meta.glob<RawCaseModule>(
  "../../../conformance/cases/**/*.json",
  { eager: true }
);

export const CONFORMANCE_CASES: ConformanceCase[] = Object.values(caseModules)
  .map((m) => (m as RawCaseModule).default || (m as unknown as ConformanceCase))
  .sort((a, b) => a.id.localeCompare(b.id));

export const CONFORMANCE_DOMAINS: Array<ConformanceCase["class"]> = [
  "expression",
  "condition",
  "binding",
  "action",
  "error",
  "render",
  "data",
];
