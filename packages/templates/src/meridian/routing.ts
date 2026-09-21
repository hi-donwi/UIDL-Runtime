export interface MeridianRoute {
  kind:
    | "list"
    | "edit"
    | "report"
    | "dashboard"
    | "get-started"
    | "chart-of-accounts"
    | "settings"
    | "pos"
    | "import-wizard"
    | "customize-form"
    | "template-builder"
    | "setup-wizard"
    | "erp-cloud-sync"
    | "backup-restore"
    | "print"
    | "not-found";
  doctype?: string;
  id?: string;
  templateId?: string;
  reportName?: string;
}

export function normalizeMeridianRoute(path: string): string {
  if (path === "/meridian") return "/meridian/dashboard";
  return path;
}

/**
 * Mirrors Meridian's route shape (/list/:schemaName, /edit/:schemaName/:name,
 * /report/:reportClassName — see router.ts) under a /meridian prefix.
 */
export function parseMeridianRoute(rawPath: string): MeridianRoute {
  const path = normalizeMeridianRoute(rawPath);
  const segments = path.split("/").filter(Boolean); // ["meridian", ...]
  const [, ...rest] = segments;

  if (rest.length === 0 || rest[0] === "dashboard") return { kind: "dashboard" };
  if (rest[0] === "get-started") return { kind: "get-started" };
  if (rest[0] === "list" && rest[1]) return { kind: "list", doctype: rest[1] };
  if (rest[0] === "edit" && rest[1] && rest[2]) return { kind: "edit", doctype: rest[1], id: rest[2] };
  if (rest[0] === "print" && rest[1] && rest[2] && rest[3]) {
    return { kind: "print", templateId: rest[1], doctype: rest[2], id: rest[3] };
  }
  if (rest[0] === "report" && rest[1]) return { kind: "report", reportName: rest[1] };
  if (rest[0] === "chart-of-accounts") return { kind: "chart-of-accounts" };
  if (rest[0] === "settings") return { kind: "settings" };
  if (rest[0] === "erp-cloud-sync") return { kind: "erp-cloud-sync" };
  if (rest[0] === "backup-restore") return { kind: "backup-restore" };
  if (rest[0] === "pos") return { kind: "pos" };
  if (rest[0] === "import-wizard") return { kind: "import-wizard" };
  if (rest[0] === "customize-form") return { kind: "customize-form" };
  if (rest[0] === "template-builder") return { kind: "template-builder" };
  if (rest[0] === "setup-wizard") return { kind: "setup-wizard" };
  return { kind: "not-found" };
}

/** "SalesInvoice" -> "Sales Invoice", matching the schema labels Meridian shows in PageHeader. */
function doctypeLabel(doctype?: string): string {
  if (!doctype) return "Edit";
  return doctype.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

export function routeTitle(route: MeridianRoute): string {
  switch (route.kind) {
    case "list": return `${route.doctype} List`;
    // PageHeader carries the doctype (Meridian shows "Sales Invoice"); the record's own id is
    // printed once more, by the form's FormHeader inside the page.
    case "edit": return doctypeLabel(route.doctype);
    case "print": return `Cetak ${route.doctype}: ${route.id}`;
    case "report": return doctypeLabel(route.reportName) || "Report";
    case "dashboard": return "Dashboard";
    case "get-started": return "Get Started";
    case "chart-of-accounts": return "Chart of Accounts";
    case "settings": return "Settings";
    case "pos": return "Point of Sale";
    case "import-wizard": return "Import Wizard";
    case "customize-form": return "Customize Form";
    case "template-builder": return "Template Builder";
    case "setup-wizard": return "Setup Wizard";
    default: return "Not Found";
  }
}
