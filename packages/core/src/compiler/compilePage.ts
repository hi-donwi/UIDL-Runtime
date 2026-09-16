import {
  validateHostCapabilities,
  type CapabilityIssue,
  type CompilePageInput,
  type CompilePageResult,
  type DashboardPageMeta,
  type FormPageMeta,
  type ListPageMeta,
  type ReportPageMeta,
  type SettingsPageMeta,
  type TreePageMeta,
  type WizardPageMeta,
} from "./types.js";
import { compileListPage } from "./list.js";
import { compileFormPage } from "./form.js";
import { compileReportPage } from "./report.js";
import { compileDashboardPage } from "./dashboard.js";
import { compileSettingsPage } from "./settings.js";
import { compileTreePage } from "./tree.js";
import { compileWizardPage } from "./wizard.js";

export class CapabilityValidationError extends Error {
  readonly issues: CapabilityIssue[];

  constructor(issues: CapabilityIssue[]) {
    const summary = issues.map((i) => `[${i.code}] ${i.path}: ${i.message}`).join("; ");
    super(`Host capability validation failed: ${summary}`);
    this.name = "CapabilityValidationError";
    this.issues = issues;
  }
}

/**
 * Pure dispatcher function that validates host capabilities (fail-closed)
 * and compiles any of the 7 page recipes into a deterministic UIDL document.
 */
export function compilePage(input: CompilePageInput): CompilePageResult {
  const issues = validateHostCapabilities(input);
  if (issues.length > 0) {
    throw new CapabilityValidationError(issues);
  }

  const { recipe, hostCapabilities, uiPolicy, routePolicy } = input;

  switch (recipe) {
    case "list": {
      const meta = input.meta as ListPageMeta;
      return compileListPage(meta, {
        hostCapabilities,
        uiPolicy,
        routePolicy,
      });
    }

    case "form": {
      const meta = input.meta as FormPageMeta;
      const recordId = input.recordId ?? "new";
      const docId = input.recordId
        ? `form-${meta.name.toLowerCase()}-${input.recordId}`
        : undefined;
      return compileFormPage(meta, recordId, {
        hostCapabilities,
        uiPolicy,
        routePolicy,
        listRoute: input.listRoute,
        docId,
      });
    }

    case "report": {
      const meta = input.meta as ReportPageMeta;
      return compileReportPage(meta, {
        hostCapabilities,
        uiPolicy,
        routePolicy,
      });
    }

    case "dashboard": {
      const meta = input.meta as DashboardPageMeta;
      return compileDashboardPage(meta, {
        hostCapabilities,
        uiPolicy,
        routePolicy,
      });
    }

    case "settings": {
      const meta = input.meta as SettingsPageMeta;
      return compileSettingsPage(meta, {
        hostCapabilities,
        uiPolicy,
        routePolicy,
      });
    }

    case "tree": {
      const meta = input.meta as TreePageMeta;
      return compileTreePage(meta, {
        hostCapabilities,
        uiPolicy,
        routePolicy,
      });
    }

    case "wizard": {
      const meta = input.meta as WizardPageMeta;
      return compileWizardPage(meta, {
        hostCapabilities,
        uiPolicy,
        routePolicy,
      });
    }

    default: {
      const exhaustiveCheck: never = recipe;
      throw new Error(`Unsupported page recipe: ${String(exhaustiveCheck)}`);
    }
  }
}
