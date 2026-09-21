import React from "react";
import { createRoot } from "react-dom/client";
import { renderUIDocument } from "@uidl-runtime/core";
import { defaultLightTheme } from "@uidl-runtime/core/theme/presets";
import { createDocumentState } from "@uidl-runtime/core/state/createDocumentState";
import type { UIDLDocument } from "@uidl-runtime/core";
import "./src/style.css";

import saasGrowthSuiteDocument from "@uidl-runtime/templates/documents/saas-growth-suite.json";
import financeOpsSuiteDocument from "@uidl-runtime/templates/documents/finance-ops-suite.json";
import knowledgePackSuiteDocument from "@uidl-runtime/templates/documents/knowledge-pack-suite.json";

const agentSession = {
  user: { id: "usr_1", name: "Finance Manager" },
  roles: ["Finance Manager"],
  permissions: {
    dashboard: true,
    revenue: true,
    admin: false,
    finance: { enabled: true, close: true, variance: true, admin: false },
    payroll: false,
  },
};

type SuiteId = "saas-growth-suite" | "finance-ops-suite" | "knowledge-pack-suite";

const suites: Record<SuiteId, UIDLDocument> = {
  "saas-growth-suite": saasGrowthSuiteDocument as UIDLDocument,
  "finance-ops-suite": financeOpsSuiteDocument as UIDLDocument,
  "knowledge-pack-suite": knowledgePackSuiteDocument as UIDLDocument,
};

const params = new URLSearchParams(window.location.search);
const docId = params.get("doc") as SuiteId | null;
const suiteDocument = docId ? suites[docId] : undefined;
const root = createRoot(document.getElementById("root")!);

if (!suiteDocument) {
  root.render(
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      Unknown or missing ?doc= — expected one of: {Object.keys(suites).join(", ")}
    </div>,
  );
} else {
  document.title = `visual-regression: ${docId}`;
  const needsSession = docId === "finance-ops-suite";
  const rendered = renderUIDocument(suiteDocument, {
    theme: defaultLightTheme,
    dataSources: suiteDocument.dataSources,
    ...(needsSession
      ? { stateStore: createDocumentState(suiteDocument.state).getState(), session: agentSession }
      : {}),
  });

  root.render(<React.StrictMode>{rendered}</React.StrictMode>);
}
